"""
Poby.ai — AI Catalog Generator Service

FastAPI service that handles:
- Reference PDF parsing (pdfplumber, pymupdf)           → /parse-pdf
- AI-powered product extraction (Anthropic Claude)      → /extract-products
- Product ↔ image matching (filename + perceptual hash) → /match-images
- Translation (Claude)                                  → /translate
- Async job polling                                     → /jobs/{job_id}

All long-running endpoints return 202 + a job_id. Poll /jobs/{job_id}
until status == completed|failed.

Runs alongside the Next.js app and is called over HTTP.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.config import (  # noqa: E402  (after load_dotenv)
    ALLOWED_ORIGINS,
    DEV_MODE,
    PORT,
    SERVICE_NAME,
    SERVICE_VERSION,
)
from app.jobs import store  # noqa: E402
from app.routers import (  # noqa: E402
    extract,
    generate,
    health,
    jobs,
    match,
    pdf,
    translate,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(SERVICE_NAME)


async def _sweeper() -> None:
    """Periodically drop completed jobs from in-memory store."""
    while True:
        try:
            removed = store.sweep()
            if removed:
                log.info("job-sweep removed=%d", removed)
        except Exception:  # noqa: BLE001
            log.exception("job-sweep error")
        await asyncio.sleep(300)  # 5 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("starting %s v%s on port %s", SERVICE_NAME, SERVICE_VERSION, PORT)
    task = asyncio.create_task(_sweeper())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        log.info("shutting down %s", SERVICE_NAME)


app = FastAPI(
    title="Poby AI Catalog Generator",
    version=SERVICE_VERSION,
    description="Background service for AI-powered catalog PDF generation",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(pdf.router)
app.include_router(extract.router)
app.include_router(match.router)
app.include_router(translate.router)
app.include_router(generate.router)
app.include_router(jobs.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=DEV_MODE)
