from fastapi import APIRouter, HTTPException

from ..jobs import store
from ..schemas import JobInfo

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobInfo)
async def get_job(job_id: str) -> JobInfo:
    job = store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return job.to_info()


@router.post("/_sweep")
async def sweep() -> dict:
    """Remove completed jobs older than TTL (manual trigger; also auto on startup)."""
    removed = store.sweep()
    return {"removed": removed}
