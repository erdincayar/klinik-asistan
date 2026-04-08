import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lookupUser } from "@/lib/x-api";

// GET — list target accounts
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  const targets = await prisma.targetAccount.findMany({
    where: { clinicId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ targets });
}

// POST — add target account
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  const { username, note } = await req.json();
  if (!username) return NextResponse.json({ error: "Username gerekli" }, { status: 400 });

  const clean = username.replace(/^@/, "").replace(/^https?:\/\/(x|twitter)\.com\//, "").split("/")[0].split("?")[0].trim();
  if (!clean) return NextResponse.json({ error: "Geçersiz username" }, { status: 400 });

  // Check if already exists
  const existing = await prisma.targetAccount.findUnique({
    where: { clinicId_username: { clinicId, username: clean } },
  });
  if (existing) {
    if (!existing.isActive) {
      await prisma.targetAccount.update({ where: { id: existing.id }, data: { isActive: true, note } });
      return NextResponse.json({ target: { ...existing, isActive: true } });
    }
    return NextResponse.json({ error: "Bu hesap zaten eklendi" }, { status: 400 });
  }

  // Lookup on X
  const xUser = await lookupUser(clean);

  const target = await prisma.targetAccount.create({
    data: {
      clinicId,
      username: clean,
      displayName: xUser?.name || null,
      xUserId: xUser?.id || null,
      note: note || null,
    },
  });

  return NextResponse.json({ target });
}

// DELETE — remove target account
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  const { id } = await req.json();
  await prisma.targetAccount.updateMany({
    where: { id, clinicId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
