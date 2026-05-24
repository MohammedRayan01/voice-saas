"""Escalation routes — agent flags unknown questions, humans resolve them,
answers optionally feed back into the knowledge base."""

import io
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.db.escalation_client import EscalationClient
from api.db.models import UserModel
from api.services.auth.depends import get_user

router = APIRouter(prefix="/escalations")

_client = EscalationClient()


class EscalationCreate(BaseModel):
    query: str
    workflow_run_id: Optional[int] = None


class EscalationResolve(BaseModel):
    answer: str
    add_to_kb: bool = False


class EscalationResponse(BaseModel):
    id: int
    organization_id: int
    workflow_run_id: Optional[int] = None
    query: str
    answer: Optional[str] = None
    status: str
    add_to_kb: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


@router.post("", response_model=EscalationResponse, status_code=201)
async def create_escalation(body: EscalationCreate, user: UserModel = Depends(get_user)):
    esc = await _client.create_escalation(
        organization_id=user.selected_organization_id,
        query=body.query,
        workflow_run_id=body.workflow_run_id,
    )
    return esc


@router.get("", response_model=list[EscalationResponse])
async def list_escalations(status: Optional[str] = None, user: UserModel = Depends(get_user)):
    return await _client.list_escalations(user.selected_organization_id, status=status)


@router.post("/{escalation_id}/resolve", response_model=EscalationResponse)
async def resolve_escalation(
    escalation_id: int,
    body: EscalationResolve,
    user: UserModel = Depends(get_user),
):
    esc = await _client.resolve_escalation(
        escalation_id, user.selected_organization_id, body.answer, body.add_to_kb
    )
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation not found")

    # Feed answer back into knowledge base if requested
    if body.add_to_kb and body.answer.strip():
        await _feed_to_knowledge_base(esc, user)

    return esc


@router.post("/{escalation_id}/dismiss", response_model=EscalationResponse)
async def dismiss_escalation(escalation_id: int, user: UserModel = Depends(get_user)):
    await _client.dismiss_escalation(escalation_id, user.selected_organization_id)
    escs = await _client.list_escalations(user.selected_organization_id)
    match = next((e for e in escs if e.id == escalation_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return match


async def _feed_to_knowledge_base(esc, user):
    """Upload escalation Q&A as a KB document so future calls can use the answer."""
    try:
        from api.db import db_client
        from api.services.storage import storage_fs
        from api.tasks.arq import enqueue_job
        from api.tasks.function_names import FunctionNames

        text = f"Q: {esc.query.strip()}\nA: {esc.answer.strip()}"
        filename = f"escalation_{esc.id}.txt"
        doc_uuid = str(uuid.uuid4())
        s3_key = f"knowledge_base/{esc.organization_id}/{doc_uuid}/{filename}"

        content_bytes = text.encode("utf-8")
        await storage_fs.acreate_file(s3_key, io.BytesIO(content_bytes))

        document = await db_client.create_document(
            organization_id=esc.organization_id,
            created_by=user.id,
            filename=filename,
            file_size_bytes=len(content_bytes),
            file_hash="",
            mime_type="text/plain",
            custom_metadata={"s3_key": s3_key, "escalation_id": esc.id},
            document_uuid=doc_uuid,
            retrieval_mode="chunked",
        )

        await enqueue_job(
            FunctionNames.PROCESS_KNOWLEDGE_BASE_DOCUMENT,
            document.id,
            s3_key,
            esc.organization_id,
            str(user.provider_id),
            128,
            "chunked",
        )
    except Exception as e:
        from loguru import logger
        logger.error(f"Failed to feed escalation {esc.id} to KB: {e}")
