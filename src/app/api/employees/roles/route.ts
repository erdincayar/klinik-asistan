import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const roles = await prisma.employeeRole.findMany({
      where: { clinicId },
      orderBy: { name: "asc" },
    });

    return Response.json({ roles });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const { name } = await req.json();
    if (!name?.trim()) return Response.json({ error: "Rol adı gerekli" }, { status: 400 });

    const existing = await prisma.employeeRole.findUnique({
      where: { clinicId_name: { clinicId, name: name.trim() } },
    });
    if (existing) {
      return Response.json({ error: "Bu rol zaten mevcut" }, { status: 409 });
    }

    const role = await prisma.employeeRole.create({
      data: { clinicId, name: name.trim() },
    });

    return Response.json({ success: true, role });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID gerekli" }, { status: 400 });

    const role = await prisma.employeeRole.findFirst({
      where: { id, clinicId },
    });
    if (!role) return Response.json({ error: "Rol bulunamadı" }, { status: 404 });

    await prisma.employeeRole.delete({ where: { id } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
