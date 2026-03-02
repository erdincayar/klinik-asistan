import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const where: any = { clinicId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = new Date(startDate);
      if (endDate) where.issueDate.lt = new Date(endDate);
    }
    if (search) {
      where.customerName = { contains: search, mode: "insensitive" };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        patient: { select: { name: true } },
        treatment: { select: { name: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    return Response.json(invoices);
  } catch {
    return Response.json({ error: "Bir hata olustu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Gecersiz veri") },
        { status: 400 }
      );
    }

    const { issueDate, dueDate, ...rest } = parsed.data;

    // Generate invoice number: KA-YYYY-NNNN
    const year = new Date().getFullYear();
    const prefix = `KA-${year}-`;

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        clinicId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: "desc" },
    });

    let nextSeq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split("-")[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    const invoiceNumber = `${prefix}${nextSeq.toString().padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        ...rest,
        invoiceNumber,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        clinicId,
      },
      include: {
        patient: { select: { name: true } },
        treatment: { select: { name: true } },
      },
    });

    return Response.json(invoice, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata olustu" }, { status: 500 });
  }
}
