from fastapi import APIRouter

from ..jobs import launch, store
from ..schemas import ExtractProductsRequest, JobRef
from ..services.claude_client import extract_products

router = APIRouter(tags=["extract"])


@router.post("/extract-products", response_model=JobRef, status_code=202)
async def start_extract_products(req: ExtractProductsRequest) -> JobRef:
    """
    Start a Claude-backed product extraction job over parsed pages.
    Result shape: { "products": [...], "batches": N }
    """

    async def worker(job):
        def cb(progress: float, message: str) -> None:
            store.update(job.job_id, progress=progress, message=message)

        products, batches = await extract_products(
            pages=req.pages,
            sector=req.sector,
            brand=req.brand,
            extra_context=req.extra_context,
            progress_cb=cb,
        )
        return {
            "products": [p.model_dump() for p in products],
            "batches": batches,
        }

    job = launch("extract-products", worker)
    return JobRef(job_id=job.job_id)
