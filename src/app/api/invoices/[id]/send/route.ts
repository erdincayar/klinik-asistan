import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const existing = await prisma.invoice.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Fatura bulunamadi" }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return Response.json(
        { error: "Sadece taslak faturalar gonderilebilir" },
        { status: 400 }
      );
    }

    // Mock GIB integration - in production this would call the GIB e-fatura API
    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: { status: "SENT" },
      include: {
        patient: { select: { name: true } },
        treatment: { select: { name: true } },
      },
    });

    return Response.json({
      ...invoice,
      gibResponse: {
        success: true,
        message: "Fatura basariyla GIB sistemine gonderildi (mock)",
        uuid: `GIB-${Date.now()}`,
      },
    });
  } catch {
    return Response.json({ error: "Bir hata olustu" }, { status: 500 });
  }
}
