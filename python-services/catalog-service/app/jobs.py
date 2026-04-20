"""Thread-safe in-memory job store.

Designed to be swapped for Redis later — only `JobStore` interface
is used from routers.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from threading import Lock
from typing import Any, Awaitable, Callable, Optional

from .schemas import JobInfo, JobStatus


@dataclass
class _Job:
    job_id: str
    kind: str
    status: JobStatus = "pending"
    progress: Optional[float] = None
    message: Optional[str] = None
    error: Optional[str] = None
    result: Optional[Any] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_info(self) -> JobInfo:
        return JobInfo(
            job_id=self.job_id,
            kind=self.kind,
            status=self.status,
            progress=self.progress,
            message=self.message,
            error=self.error,
            result=self.result,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class JobStore:
    """In-memory job registry. Safe for concurrent mutation."""

    # How long completed/failed jobs are kept before sweeping
    DEFAULT_TTL_SECONDS = 3600

    def __init__(self) -> None:
        self._jobs: dict[str, _Job] = {}
        self._lock = Lock()

    def create(self, kind: str) -> _Job:
        jid = uuid.uuid4().hex
        with self._lock:
            job = _Job(job_id=jid, kind=kind)
            self._jobs[jid] = job
            return job

    def get(self, job_id: str) -> Optional[_Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def update(
        self,
        job_id: str,
        *,
        status: Optional[JobStatus] = None,
        progress: Optional[float] = None,
        message: Optional[str] = None,
        error: Optional[str] = None,
        result: Optional[Any] = None,
    ) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            if status is not None:
                job.status = status
            if progress is not None:
                job.progress = progress
            if message is not None:
                job.message = message
            if error is not None:
                job.error = error
            if result is not None:
                job.result = result
            job.updated_at = time.time()

    def sweep(self, ttl_seconds: Optional[int] = None) -> int:
        """Remove completed/failed jobs older than TTL. Returns removed count."""
        ttl = ttl_seconds or self.DEFAULT_TTL_SECONDS
        now = time.time()
        removed = 0
        with self._lock:
            stale = [
                jid
                for jid, j in self._jobs.items()
                if j.status in ("completed", "failed") and now - j.updated_at > ttl
            ]
            for jid in stale:
                self._jobs.pop(jid, None)
                removed += 1
        return removed


# Module-level singleton
store = JobStore()


# ─── helpers ────────────────────────────────────────────────
def launch(
    kind: str,
    coro_factory: Callable[[_Job], Awaitable[Any]],
) -> _Job:
    """Create a job and schedule its coroutine on the current event loop."""
    job = store.create(kind)

    async def runner() -> None:
        store.update(job.job_id, status="running", progress=0.0)
        try:
            result = await coro_factory(job)
            store.update(job.job_id, status="completed", progress=1.0, result=result)
        except Exception as exc:  # noqa: BLE001
            store.update(
                job.job_id,
                status="failed",
                error=f"{type(exc).__name__}: {exc}",
            )

    asyncio.create_task(runner())
    return job
