import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/todos?status=ACTIVE|COMPLETED
 * Returns the current user's todos within their clinic.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const status = req.nextUrl.searchParams.get("status");
  const where: any = { userId, clinicId };
  if (status === "ACTIVE" || status === "COMPLETED") where.status = status;

  // ACTIVE'de oluşturma sırası, COMPLETED'da tamamlanma sırası önce gelsin
  const [active, completed] = await Promise.all([
    prisma.todo.findMany({
      where: { userId, clinicId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.todo.findMany({
      where: { userId, clinicId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    active,
    completed,
    counts: { active: active.length, completed: completed.length },
  });
}

/**
 * POST /api/todos  { title, note?, source? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  if (title.length > 300) return NextResponse.json({ error: "Başlık 300 karakteri aşamaz" }, { status: 400 });

  const note = body.note ? String(body.note).slice(0, 4000) : null;
  const source = ["WEB", "TELEGRAM", "WHATSAPP"].includes(body.source) ? body.source : "WEB";

  const todo = await prisma.todo.create({
    data: { clinicId, userId, title, note, source },
  });
  return NextResponse.json({ todo }, { status: 201 });
}
