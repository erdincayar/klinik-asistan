from fastapi import APIRouter

from ..config import (
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    CATALOG_STORAGE_ROOT,
    SERVICE_NAME,
    SERVICE_VERSION,
)

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "status": "ok",
        "config": {
            "storage_root": str(CATALOG_STORAGE_ROOT),
            "anthropic_configured": bool(ANTHROPIC_API_KEY),
            "model": ANTHROPIC_MODEL,
        },
    }
