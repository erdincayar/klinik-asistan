"use client";

import { useEffect, useRef, useState } from "react";

export interface ProjectDetailResponse {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    sourceLanguage: string;
    targetLanguage: string;
    templateId: string | null;
    template: { id: string; slug: string; name: string; sector: string } | null;
    sourceFiles: Array<{
      id: string;
      fileType: string;
      originalName: string;
      storagePath: string;
      fileSize: number;
      mimeType: string;
      uploadedAt: string;
    }>;
    _count: { sourceFiles: number; products: number; generations: number };
    updatedAt: string;
    createdAt: string;
  };
  usedBytes: number;
  usedFormatted: string;
  quotaBytes: number;
  quotaFormatted: string;
  usagePercent: number;
}

/**
 * Poll GET /api/admin/catalog/projects/[id] every N seconds.
 * Automatically slows down once the project is in a terminal state.
 * Returns latest data + a manual refresh handle.
 */
export function useProjectPolling(projectId: string | null, intervalMs = 3000) {
  const [data, setData] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  async function fetchOnce() {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/catalog/projects/${projectId}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      if (alive.current) setData(body);
      if (alive.current) setError(null);
    } catch (e: any) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    if (!projectId) return;
    fetchOnce();

    let handle: ReturnType<typeof setTimeout>;
    function schedule() {
      const status = data?.project.status;
      const fast = status === "ANALYZING" || status === "GENERATING";
      const next = fast ? intervalMs : intervalMs * 4;
      handle = setTimeout(async () => {
        await fetchOnce();
        if (alive.current) schedule();
      }, next);
    }
    schedule();

    return () => {
      alive.current = false;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, data?.project.status]);

  return { data, loading, error, refresh: fetchOnce };
}
