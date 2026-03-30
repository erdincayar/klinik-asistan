import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const existing = await prisma.debt.findFirst({ where: { id: params.id, clinicId } });
    if (!existing) return Response.json({ error: "Kayıt bulunamadı" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, any> = {};
    if (body.contactName !== undefined) updateData.contactName = body.contactName;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.totalAmount !== undefined) updateData.totalAmount = Math.round(body.totalAmount);
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.status !== undefined) updateData.status = body.status;

    const debt = await prisma.debt.update({ where: { id: params.id }, data: updateData });
    return Response.json({ debt });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const existing = await prisma.debt.findFirst({ where: { id: params.id, clinicId } });
    if (!existing) return Response.json({ error: "Kayıt bulunamadı" }, { status: 404 });

    await prisma.debt.delete({ where: { id: params.id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
