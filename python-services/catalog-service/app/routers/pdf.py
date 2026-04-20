from fastapi import APIRouter, HTTPException

from ..jobs import launch, store
from ..schemas import JobRef, ParsePdfRequest
from ..services.pdf_parser import parse_pdf

router = APIRouter(tags=["pdf"])


@router.post("/parse-pdf", response_model=JobRef, status_code=202)
async def start_parse_pdf(req: ParsePdfRequest) -> JobRef:
    """
    Start a background PDF parse job. Poll GET /jobs/{job_id} for status.
    When completed, job.result is ParsePdfResult.
    """

    async def worker(job):
        def cb(progress: float, message: str) -> None:
            store.update(job.job_id, progress=progress, message=message)

        try:
            result = await parse_pdf(
                req.pdf_path,
                extract_images_to=req.extract_images_to,
                progress_cb=cb,
            )
        except FileNotFoundError as e:
            raise
        except ValueError as e:
            # Path traversal / invalid path — surface as clean error
            raise RuntimeError(f"invalid path: {e}") from e
        return result.model_dump()

    job = launch("parse-pdf", worker)
    return JobRef(job_id=job.job_id)
