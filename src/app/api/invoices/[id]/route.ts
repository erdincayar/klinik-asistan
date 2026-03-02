import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validations";

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

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, clinicId },
      include: {
        patient: { select: { id: true, name: true, phone: true, email: true } },
        treatment: { select: { id: true, name: true, amount: true } },
        clinic: { select: { name: true, phone: true, address: true, taxRate: true } },
      },
    });

    if (!invoice) {
      return Response.json({ error: "Fatura bulunamadi" }, { status: 404 });
    }

    return Response.json(invoice);
  } catch {
    return Response.json({ error: "Bir hata olustu" }, { status: 500 });
  }
}

export async function PUT(
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
        { error: "Sadece taslak faturalar duzenlenebilir" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = invoiceSchema.partial().safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Gecersiz veri") },
        { status: 400 }
      );
    }

    const { issueDate, dueDate, ...rest } = parsed.data;

    const updateData: any = { ...rest };
    if (issueDate) updateData.issueDate = new Date(issueDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        patient: { select: { name: true } },
        treatment: { select: { name: true } },
      },
    });

    return Response.json(invoice);
  } catch {
    return Response.json({ error: "Bir hata olustu" }, { status: 500 });
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

    const existing = await prisma.invoice.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Fatura bulunamadi" }, { status: 404 });
    }

    if (existing.status === "SENT" || existing.status === "APPROVED") {
      return Response.json(
        { error: "Gonderilmis veya onaylanmis faturalar silinemez" },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({ where: { id: params.id } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata olustu" }, { status: 500 });
  }
}
