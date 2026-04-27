import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function loadOwnedTodo(id: string) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const userId = (session.user as any).id;
  const todo = await prisma.todo.findFirst({ where: { id, userId } });
  if (!todo) return { error: NextResponse.json({ error: "Bulunamadı" }, { status: 404 }) };
  return { todo, userId };
}

/**
 * PATCH /api/todos/[id]
 * Body fields:
 *   title?      string
 *   note?       string | null
 *   status?     "ACTIVE" | "COMPLETED"  — toggling sets/clears completedAt
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const r = await loadOwnedTodo(id);
  if ("error" in r) return r.error;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const data: any = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "Başlık boş olamaz" }, { status: 400 });
    if (t.length > 300) return NextResponse.json({ error: "Başlık 300 karakteri aşamaz" }, { status: 400 });
    data.title = t;
  }
  if (body.note !== undefined) {
    data.note = body.note ? String(body.note).slice(0, 4000) : null;
  }
  if (body.status === "ACTIVE" || body.status === "COMPLETED") {
    data.status = body.status;
    data.completedAt = body.status === "COMPLETED" ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const updated = await prisma.todo.update({ where: { id }, data });
  return NextResponse.json({ todo: updated });
}

/** DELETE /api/todos/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const r = await loadOwnedTodo(id);
  if ("error" in r) return r.error;
  await prisma.todo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
