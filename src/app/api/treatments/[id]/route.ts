import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const treatment = await prisma.treatment.findFirst({
      where: { id: params.id, clinicId },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!treatment) {
      return Response.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    return Response.json(treatment);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const existing = await prisma.treatment.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    await prisma.treatment.delete({ where: { id: params.id } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
