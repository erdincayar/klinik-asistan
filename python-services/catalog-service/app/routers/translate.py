from fastapi import APIRouter

from ..jobs import launch, store
from ..schemas import JobRef, TranslateRequest
from ..services.claude_client import translate_products

router = APIRouter(tags=["translate"])


@router.post("/translate", response_model=JobRef, status_code=202)
async def start_translate(req: TranslateRequest) -> JobRef:
    """Translate product name/description/category in batches via Claude."""

    async def worker(job):
        def cb(progress: float, message: str) -> None:
            store.update(job.job_id, progress=progress, message=message)

        products, batches = await translate_products(
            products=req.products,
            source_language=req.source_language,
            target_language=req.target_language,
            sector=req.sector,
            progress_cb=cb,
        )
        return {
            "products": [p.model_dump() for p in products],
            "batches": batches,
        }

    job = launch("translate", worker)
    return JobRef(job_id=job.job_id)
