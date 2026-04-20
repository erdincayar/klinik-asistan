from fastapi import APIRouter

from ..jobs import launch
from ..schemas import JobRef, MatchImagesRequest
from ..services.image_matcher import match_images

router = APIRouter(tags=["match"])


@router.post("/match-images", response_model=JobRef, status_code=202)
async def start_match_images(req: MatchImagesRequest) -> JobRef:
    """Match products to images (filename, then perceptual hash)."""

    async def worker(job):
        result = await match_images(
            products=req.products,
            photo_files=req.photo_files,
            extracted_images=req.extracted_images,
            phash_threshold=req.phash_threshold,
        )
        return result.model_dump()

    job = launch("match-images", worker)
    return JobRef(job_id=job.job_id)
