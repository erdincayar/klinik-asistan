import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Tek onam formu detayı + yanıtları
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const form = await prisma.consentForm.findFirst({
      where: { id: params.id, clinicId },
      include: {
        responses: {
          orderBy: { signedAt: "desc" },
          include: { patient: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    if (!form) return Response.json({ error: "Form bulunamadı" }, { status: 404 });
    return Response.json({ form });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// PUT — Onam formu güncelle
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const existing = await prisma.consentForm.findFirst({ where: { id: params.id, clinicId } });
    if (!existing) return Response.json({ error: "Form bulunamadı" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, any> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.fields !== undefined) updateData.fields = body.fields;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const form = await prisma.consentForm.update({
      where: { id: params.id },
      data: updateData,
    });

    return Response.json({ form });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// DELETE — Onam formu sil
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const existing = await prisma.consentForm.findFirst({ where: { id: params.id, clinicId } });
    if (!existing) return Response.json({ error: "Form bulunamadı" }, { status: 404 });

    await prisma.consentForm.delete({ where: { id: params.id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
