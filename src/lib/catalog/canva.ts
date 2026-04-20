/**
 * Canva Connect API — minimal client for our catalog flow.
 *
 * Flow:
 *   1. Admin starts OAuth from /api/admin/catalog/canva/auth.
 *   2. Canva redirects back to /api/admin/catalog/canva/callback with `code`.
 *      We exchange it for access/refresh tokens and persist them.
 *   3. When admin hits "Canva'da Aç" on a generated PDF:
 *        - Upload asset (PDF) → poll until COMPLETED → asset_id.
 *        - Create import_job "design" from that asset → poll → design_id.
 *        - Return the urls.edit_url for the new sekmede açma.
 *
 * Env:
 *   CANVA_CLIENT_ID, CANVA_CLIENT_SECRET     — Canva developer app
 *   CANVA_REDIRECT_URI                        — https://poby.ai/api/admin/catalog/canva/callback
 *   CANVA_OAUTH_BASE (optional)               — default https://www.canva.com
 *   CANVA_API_BASE   (optional)               — default https://api.canva.com/rest/v1
 *
 * Docs: https://www.canva.dev/docs/connect/
 */

import { prisma } from "@/lib/prisma";

export const CANVA_OAUTH_BASE =
  process.env.CANVA_OAUTH_BASE || "https://www.canva.com";
export const CANVA_API_BASE =
  process.env.CANVA_API_BASE || "https://api.canva.com/rest/v1";

export const CANVA_SCOPES = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
  "profile:read",
].join(" ");

export function canvaConfigured(): boolean {
  return !!(
    process.env.CANVA_CLIENT_ID &&
    process.env.CANVA_CLIENT_SECRET &&
    process.env.CANVA_REDIRECT_URI
  );
}

export function buildAuthUrl(state: string): string {
  const u = new URL(`${CANVA_OAUTH_BASE}/api/oauth/authorize`);
  u.searchParams.set("client_id", process.env.CANVA_CLIENT_ID!);
  u.searchParams.set("redirect_uri", process.env.CANVA_REDIRECT_URI!);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", CANVA_SCOPES);
  u.searchParams.set("state", state);
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds
  scope?: string;
}

async function tokenRequest(params: URLSearchParams): Promise<TokenResponse> {
  // Basic auth with client_id:client_secret (Canva standard)
  const basic = Buffer.from(
    `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${CANVA_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params,
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Canva token endpoint HTTP ${res.status}: ${txt.slice(0, 300)}`
    );
  }
  return (await res.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.CANVA_REDIRECT_URI!,
  });
  return tokenRequest(params);
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return tokenRequest(params);
}

/**
 * Return a valid access token for the clinic, refreshing on the fly
 * if we're within 60 seconds of expiry.
 */
export async function getValidAccessToken(clinicId: string): Promise<string> {
  const conn = await prisma.catalogCanvaConnection.findUnique({
    where: { clinicId },
  });
  if (!conn) throw new Error("Canva bağlantısı yok");

  const now = Date.now();
  const expAt = new Date(conn.expiresAt).getTime();
  if (expAt - now > 60_000) {
    return conn.accessToken;
  }

  // Refresh
  const tok = await refreshTokens(conn.refreshToken);
  const expiresAt = new Date(Date.now() + tok.expires_in * 1000);
  await prisma.catalogCanvaConnection.update({
    where: { clinicId },
    data: {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? conn.refreshToken,
      tokenType: tok.token_type ?? "Bearer",
      scope: tok.scope ?? conn.scope,
      expiresAt,
    },
  });
  return tok.access_token;
}

/**
 * Upload a PDF as a Canva asset. Canva upload is polled via job status.
 *
 * Notes:
 * - POST /asset-uploads is a sync endpoint that accepts the raw body.
 * - For bigger files, the returned job_id should be polled.
 */
export async function uploadPdfAsset(
  token: string,
  pdfBuffer: Buffer,
  fileName: string
): Promise<{ assetId: string }> {
  const nameHeader = Buffer.from(
    JSON.stringify({ name_base64: Buffer.from(fileName).toString("base64") })
  ).toString("base64");

  // Canva requires the metadata as a header per docs.
  const res = await fetch(`${CANVA_API_BASE}/asset-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({
        name_base64: Buffer.from(fileName).toString("base64"),
      }),
    },
    body: pdfBuffer as any,
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Canva asset upload HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  // Canva returns a job envelope: { job: { id, status, asset?: {...} } }
  const job = data.job ?? data;
  const jobId: string = job.id;
  if (!jobId) throw new Error("Canva asset upload: job_id missing");

  // Poll
  const assetId = await pollAssetUpload(token, jobId);
  return { assetId };
}

async function pollAssetUpload(token: string, jobId: string): Promise<string> {
  const deadline = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${CANVA_API_BASE}/asset-uploads/${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `Canva asset poll HTTP ${res.status}: ${txt.slice(0, 200)}`
      );
    }
    const data = await res.json();
    const job = data.job ?? data;
    if (job.status === "success" || job.status === "SUCCESS") {
      const aid = job.asset?.id ?? job.asset_id;
      if (!aid) throw new Error("Canva asset job success but no asset.id");
      return aid;
    }
    if (job.status === "failed" || job.status === "FAILED") {
      throw new Error(
        `Canva asset upload failed: ${job.error?.message ?? "unknown"}`
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Canva asset upload timed out");
}

/**
 * Create a design from an uploaded asset (PDF). Returns edit_url.
 *
 * Canva route: POST /imports — creates an import job that turns the
 * asset into an editable design. Poll until COMPLETED.
 */
export async function createImportDesign(
  token: string,
  assetId: string,
  title: string
): Promise<{ designId: string; editUrl: string; viewUrl: string | null }> {
  const body = {
    asset_id: assetId,
    title: title.slice(0, 120),
    mime_type: "application/pdf",
  };

  const res = await fetch(`${CANVA_API_BASE}/imports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Canva imports HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const job = data.job ?? data;
  const jobId: string = job.id;
  if (!jobId) throw new Error("Canva imports: missing job.id");

  return await pollImport(token, jobId);
}

async function pollImport(
  token: string,
  jobId: string
): Promise<{ designId: string; editUrl: string; viewUrl: string | null }> {
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${CANVA_API_BASE}/imports/${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(
        `Canva import poll HTTP ${res.status}: ${txt.slice(0, 200)}`
      );
    }
    const data = await res.json();
    const job = data.job ?? data;
    if (job.status === "success" || job.status === "SUCCESS") {
      const design = job.result?.designs?.[0] ?? job.result?.design ?? job.design;
      if (!design?.id)
        throw new Error("Canva import success but design.id missing");
      return {
        designId: design.id,
        editUrl: design.urls?.edit_url ?? design.url ?? "",
        viewUrl: design.urls?.view_url ?? null,
      };
    }
    if (job.status === "failed" || job.status === "FAILED") {
      throw new Error(
        `Canva import failed: ${job.error?.message ?? "unknown"}`
      );
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Canva import timed out");
}

/** Optional: fetch profile so we can store display name. */
export async function fetchProfile(
  token: string
): Promise<{ id?: string; display_name?: string }> {
  try {
    const res = await fetch(`${CANVA_API_BASE}/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return {};
    const data = await res.json();
    return {
      id: data.profile?.user_id ?? data.user_id,
      display_name: data.profile?.display_name ?? data.display_name,
    };
  } catch {
    return {};
  }
}
