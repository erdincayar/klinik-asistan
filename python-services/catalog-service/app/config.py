"""Runtime configuration — read from environment."""
from __future__ import annotations

import os
from pathlib import Path

SERVICE_NAME = "poby-catalog-service"
SERVICE_VERSION = "0.2.0"

PORT: int = int(os.getenv("CATALOG_SERVICE_PORT", "8001"))

# Shared with Next.js. All relative paths coming from the main app
# are resolved against this directory. The Python service should
# only read/write files under this tree.
CATALOG_STORAGE_ROOT: Path = Path(
    os.getenv("CATALOG_STORAGE_ROOT", "/var/www/klinik-asistan/storage")
).resolve()

# Anthropic
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

# Batching
EXTRACT_BATCH: int = int(os.getenv("CATALOG_EXTRACT_BATCH", "5"))
TRANSLATE_BATCH: int = int(os.getenv("CATALOG_TRANSLATE_BATCH", "10"))

# CORS
ALLOWED_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://poby.ai",
]
_extra = os.getenv("CATALOG_EXTRA_ORIGINS")
if _extra:
    ALLOWED_ORIGINS.extend([o.strip() for o in _extra.split(",") if o.strip()])

# Dev mode
DEV_MODE: bool = bool(os.getenv("CATALOG_DEV_MODE"))


def resolve_storage_path(rel_or_abs: str) -> Path:
    """
    Resolve a path coming from Next.js into an absolute path
    under CATALOG_STORAGE_ROOT. Raises ValueError on traversal.
    """
    if not rel_or_abs:
        raise ValueError("empty path")
    p = Path(rel_or_abs)
    if not p.is_absolute():
        p = CATALOG_STORAGE_ROOT / p
    p = p.resolve()
    try:
        p.relative_to(CATALOG_STORAGE_ROOT)
    except ValueError as e:
        raise ValueError(f"path escapes storage root: {rel_or_abs}") from e
    return p


def make_rel(abs_path: Path) -> str:
    """Convert an absolute path back to its CATALOG_STORAGE_ROOT-relative form."""
    return str(abs_path.resolve().relative_to(CATALOG_STORAGE_ROOT))
