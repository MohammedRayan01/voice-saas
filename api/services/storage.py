from loguru import logger

from api.constants import (
    ENABLE_AWS_S3,
    ENVIRONMENT,
    MINIO_ACCESS_KEY,
    MINIO_BUCKET,
    MINIO_ENDPOINT,
    MINIO_PUBLIC_ENDPOINT,
    MINIO_SECRET_KEY,
    MINIO_SECURE,
    S3_BUCKET,
    S3_REGION,
    SUPABASE_S3_ACCESS_KEY,
    SUPABASE_S3_ENDPOINT,
    SUPABASE_S3_REGION,
    SUPABASE_S3_SECRET_KEY,
    SUPABASE_STORAGE_BUCKET,
)
from api.enums import Environment, StorageBackend

from .filesystem import BaseFileSystem, MinioFileSystem, NullFileSystem, S3FileSystem


def get_storage_for_backend(backend: str) -> BaseFileSystem:
    """Get storage instance for a specific backend enum.

    Maps StorageBackend enum codes to actual storage implementations:
    - Code 1 (S3): AWS S3 via S3FileSystem
    - Code 2 (MINIO): MinIO via MinioFileSystem
    """
    # Code 2: MinIO implementation (local/OSS deployments)
    if backend == StorageBackend.MINIO.value:
        if not MINIO_PUBLIC_ENDPOINT:
            raise ValueError(
                "MINIO_PUBLIC_ENDPOINT is required for MinIO storage. "
                "Set it to the full URL browsers use to reach MinIO, "
                "e.g. 'http://localhost:9000' for local dev or "
                "'https://your-server.example.com' for a remote deployment."
            )
        logger.info(
            f"Initializing {backend} storage at {MINIO_ENDPOINT} "
            f"(public: {MINIO_PUBLIC_ENDPOINT}) with bucket '{MINIO_BUCKET}'"
        )
        return MinioFileSystem(
            endpoint=MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            bucket_name=MINIO_BUCKET,
            secure=MINIO_SECURE,
            public_endpoint=MINIO_PUBLIC_ENDPOINT,
        )

    # Supabase Storage (S3-compatible)
    elif backend == StorageBackend.SUPABASE.value:
        if not SUPABASE_STORAGE_BUCKET:
            raise ValueError("SUPABASE_STORAGE_BUCKET is required for Supabase storage")
        logger.info(
            f"Initializing Supabase storage at {SUPABASE_S3_ENDPOINT} "
            f"with bucket '{SUPABASE_STORAGE_BUCKET}'"
        )
        return S3FileSystem(
            bucket_name=SUPABASE_STORAGE_BUCKET,
            region_name=SUPABASE_S3_REGION,
            endpoint_url=SUPABASE_S3_ENDPOINT,
            aws_access_key_id=SUPABASE_S3_ACCESS_KEY,
            aws_secret_access_key=SUPABASE_S3_SECRET_KEY,
        )

    # Code 1: AWS S3 implementation (cloud deployments)
    elif backend == StorageBackend.S3.value:
        if not S3_BUCKET:
            raise ValueError(
                "S3_BUCKET environment variable is required when using S3 storage"
            )
        bucket = S3_BUCKET
        region = S3_REGION
        logger.info(
            f"Initializing {backend} storage with bucket '{bucket}' in region '{region}'"
        )
        return S3FileSystem(bucket, region)

    # Future backend implementations can be added here:
    # elif backend == StorageBackend.GCS:  # Code 3
    #     return GoogleCloudFileSystem(...)
    # elif backend == StorageBackend.AZURE:  # Code 4
    #     return AzureBlobFileSystem(...)

    else:
        raise ValueError(f"Unknown storage backend: {backend}")


def get_current_storage_backend() -> StorageBackend:
    """Get the current storage backend enum."""
    return StorageBackend.get_current_backend()


# Create a single storage instance at module load time.
# In the test environment we skip the real backend so import doesn't require
# MinIO/S3 to be reachable; tests that need storage must inject a real fs.
if ENVIRONMENT == Environment.TEST.value:
    logger.info("ENVIRONMENT=test — using NullFileSystem (no storage backend)")
    storage_fs: BaseFileSystem = NullFileSystem()
else:
    _backend = StorageBackend.get_current_backend()
    logger.info(
        f"Initializing storage backend: {_backend.name} (value: {_backend.value}, ENABLE_AWS_S3={ENABLE_AWS_S3})"
    )
    storage_fs = get_storage_for_backend(_backend.value)


# For backward compatibility, keep get_storage() function
def get_storage() -> BaseFileSystem:
    """Get the module-level storage instance.

    Deprecated: Use 'from api.services.storage import storage_fs' instead.
    """
    return storage_fs
