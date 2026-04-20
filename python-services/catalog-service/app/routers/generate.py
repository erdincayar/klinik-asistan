from fastapi import APIRouter

from ..jobs import launch, store
from ..schemas import GenerateCatalogRequest, JobRef
from ..services.generator import generate_catalog

router = APIRouter(tags=["generate"])


@router.post("/generate-catalog", response_model=JobRef, status_code=202)
async def start_generate_catalog(req: GenerateCatalogRequest) -> JobRef:
    """
    Render Jinja templates → WeasyPrint PDF → (optional) PNG previews.

    Job result: GenerateCatalogResult (pdf_path, preview_paths, page_count, file_size).
    """

    async def worker(job):
        def cb(progress: float, message: str) -> None:
            store.update(job.job_id, progress=progress, message=message)

        result = await generate_catalog(req, progress_cb=cb)
        return result.model_dump()

    job = launch("generate-catalog", worker)
    return JobRef(job_id=job.job_id)
