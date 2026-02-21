import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";

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

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, clinicId },
    });

    if (!expense) {
      return Response.json({ error: "Gider bulunamadı" }, { status: 404 });
    }

    return Response.json(expense);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
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

    const existing = await prisma.expense.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Gider bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const { date, ...rest } = parsed.data;

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...rest,
        date: new Date(date),
      },
    });

    return Response.json(expense);
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

    const existing = await prisma.expense.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Gider bulunamadı" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id: params.id } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
