import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export interface AdminContext {
  userId: string;
  clinicId: string;
  role: string;
}

/**
 * Require the caller to be signed in as ADMIN or SUPERADMIN and
 * to belong to a clinic (tenant).
 *
 * Returns either a NextResponse (error) or AdminContext (ok).
 * Usage:
 *   const ctx = await requireAdmin();
 *   if (ctx instanceof NextResponse) return ctx;
 *   // use ctx.clinicId, ctx.userId
 */
export async function requireAdmin(): Promise<NextResponse | AdminContext> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user: any = session.user;
  const role = user.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  if (!user.clinicId) {
    return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
  }
  return {
    userId: user.id,
    clinicId: user.clinicId,
    role,
  };
}
