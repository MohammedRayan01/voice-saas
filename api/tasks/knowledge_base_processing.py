"""Background task for processing knowledge base documents locally.

Downloads the file from storage, extracts text using local parsers,
chunks it, embeds via OpenAI, and stores in the database.
Supports: PDF, DOCX, DOC, TXT, JSON.
"""

import json
import os
import tempfile

import tiktoken
from loguru import logger

from api.db import db_client
from api.db.models import KnowledgeBaseChunkModel
from api.services.gen_ai import OpenAIEmbeddingService
from api.services.storage import storage_fs

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
DEFAULT_CHUNK_TOKENS = 256
CHUNK_OVERLAP_TOKENS = 32


def _extract_text(file_path: str, filename: str) -> str:
    """Extract plain text from a file based on its extension."""
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
        return "\n\n".join(pages)

    elif ext in (".docx",):
        from docx import Document
        doc = Document(file_path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)

    elif ext == ".json":
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
        return json.dumps(data, indent=2, ensure_ascii=False)

    else:
        # TXT, DOC (fallback), and anything else — read as plain text
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()


def _chunk_text(text: str, max_tokens: int = DEFAULT_CHUNK_TOKENS, overlap: int = CHUNK_OVERLAP_TOKENS) -> list[dict]:
    """Split text into overlapping token-bounded chunks."""
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)

    chunks = []
    start = 0
    idx = 0
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = enc.decode(chunk_tokens).strip()
        if chunk_text:
            chunks.append({
                "chunk_index": idx,
                "chunk_text": chunk_text,
                "token_count": len(chunk_tokens),
                "chunk_metadata": {"start_token": start, "end_token": end},
            })
            idx += 1
        start += max_tokens - overlap

    return chunks


async def process_knowledge_base_document(
    ctx,
    document_id: int,
    s3_key: str,
    organization_id: int,
    created_by_provider_id: str,
    max_tokens: int = DEFAULT_CHUNK_TOKENS,
    retrieval_mode: str = "chunked",
):
    """Download, parse, chunk, embed, and store a knowledge base document.

    All processing is local — no external services required.
    Embeddings use the user's configured OpenAI key (chunked mode only).
    """
    logger.info(
        f"Processing knowledge base document: document_id={document_id}, "
        f"s3_key={s3_key}, org={organization_id}, mode={retrieval_mode}"
    )

    temp_file_path = None

    try:
        await db_client.update_document_status(document_id, "processing")

        filename = s3_key.split("/")[-1]
        file_extension = os.path.splitext(filename)[1] or ".bin"

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        temp_file_path = temp_file.name
        temp_file.close()

        logger.info(f"Downloading file from storage: {s3_key}")
        download_success = await storage_fs.adownload_file(s3_key, temp_file_path)
        if not download_success:
            raise Exception(f"Failed to download file from storage: {s3_key}")
        if not os.path.exists(temp_file_path):
            raise FileNotFoundError(f"Downloaded file not found: {temp_file_path}")

        file_size = os.path.getsize(temp_file_path)
        logger.info(f"Downloaded file size: {file_size} bytes")

        if file_size > MAX_FILE_SIZE_BYTES:
            error_message = (
                f"File size ({file_size / (1024 * 1024):.1f}MB) exceeds the "
                f"maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
            )
            await db_client.update_document_status(document_id, "failed", error_message=error_message)
            return

        file_hash = db_client.compute_file_hash(temp_file_path)
        mime_type = db_client.get_mime_type(temp_file_path)

        document = await db_client.get_document_by_id(document_id)
        if not document:
            raise Exception(f"Document {document_id} not found")

        # Reject duplicates
        existing_doc = await db_client.get_document_by_hash(file_hash, organization_id)
        if existing_doc and existing_doc.id != document_id:
            error_message = (
                f"This file is a duplicate of '{existing_doc.filename}'. "
                "Please delete the existing file before uploading again."
            )
            await db_client.update_document_metadata(document_id, file_size_bytes=file_size, file_hash=file_hash, mime_type=mime_type)
            await db_client.update_document_status(document_id, "failed", error_message=error_message)
            return

        await db_client.update_document_metadata(document_id, file_size_bytes=file_size, file_hash=file_hash, mime_type=mime_type)

        # Extract text locally
        logger.info(f"Extracting text from {filename}")
        try:
            full_text = _extract_text(temp_file_path, filename)
        except Exception as e:
            raise Exception(f"Failed to extract text from {filename}: {e}") from e

        if not full_text.strip():
            await db_client.update_document_status(document_id, "failed", error_message="No text could be extracted from this file.")
            return

        logger.info(f"Extracted {len(full_text)} characters from {filename}")

        # Full document mode — store text as-is, no embedding needed
        if retrieval_mode == "full_document":
            await db_client.update_document_full_text(document_id, full_text)
            await db_client.update_document_status(document_id, "completed", total_chunks=0, docling_metadata={"char_count": len(full_text)})
            logger.info(f"Stored full_document {document_id} ({len(full_text)} chars)")
            return

        # Chunked mode — chunk + embed
        embeddings_api_key = None
        embeddings_model = None
        embeddings_base_url = None
        if document.created_by:
            user_config = await db_client.get_user_configurations(document.created_by)
            if user_config.embeddings:
                embeddings_api_key = user_config.embeddings.api_key
                embeddings_model = user_config.embeddings.model
                embeddings_base_url = getattr(user_config.embeddings, "base_url", None)

        if not embeddings_api_key:
            await db_client.update_document_status(
                document_id, "failed",
                error_message="OpenAI API key not configured. Go to Model Configurations > Embedding to add your key."
            )
            return

        chunks = _chunk_text(full_text, max_tokens=max_tokens or DEFAULT_CHUNK_TOKENS)
        if not chunks:
            await db_client.update_document_status(document_id, "failed", error_message="Document produced no chunks after processing.")
            return

        logger.info(f"Created {len(chunks)} chunks from {filename}")

        embedding_service = OpenAIEmbeddingService(
            db_client=db_client,
            api_key=embeddings_api_key,
            model_id=embeddings_model or "text-embedding-3-small",
            base_url=embeddings_base_url,
        )

        chunk_records = [
            KnowledgeBaseChunkModel(
                document_id=document_id,
                organization_id=organization_id,
                chunk_text=c["chunk_text"],
                contextualized_text=c["chunk_text"],
                chunk_index=c["chunk_index"],
                chunk_metadata=c["chunk_metadata"],
                embedding_model=embedding_service.get_model_id(),
                embedding_dimension=embedding_service.get_embedding_dimension(),
                token_count=c["token_count"],
            )
            for c in chunks
        ]

        chunk_texts = [c["chunk_text"] for c in chunks]
        logger.info(f"Generating embeddings for {len(chunk_texts)} chunks")
        embeddings = await embedding_service.embed_texts(chunk_texts)
        for chunk_record, embedding in zip(chunk_records, embeddings):
            chunk_record.embedding = embedding

        await db_client.create_chunks_batch(chunk_records)
        await db_client.update_document_status(
            document_id, "completed",
            total_chunks=len(chunk_records),
            docling_metadata={"char_count": len(full_text), "chunk_count": len(chunks)},
        )

        logger.info(f"Successfully processed document {document_id} — {len(chunk_records)} chunks stored")

    except Exception as e:
        logger.error(f"Error processing knowledge base document {document_id}: {e}", exc_info=True)
        await db_client.update_document_status(document_id, "failed", error_message=str(e))
        raise

    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
