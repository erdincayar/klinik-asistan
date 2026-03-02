import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

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

    const nextNumber = `${prefix}${nextSeq.toString().padStart(4, "0")}`;

    return Response.json({ nextNumber });
  } catch {
    return Response.json({ error: "Bir hata olustu" }, { status: 500 });
  }
}
