import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/finance/cleanup — Remove orphaned stock movements
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    // Find all stock movements with references
    const allMovements = await prisma.stockMovement.findMany({
      where: { clinicId },
      select: { id: true, reference: true, productId: true, quantity: true, type: true },
    });

    const orphanIds: string[] = [];

    for (const m of allMovements) {
      if (!m.reference) continue;

      let parentExists = false;

      if (m.reference.startsWith("treatment-")) {
        const treatmentId = m.reference.replace("treatment-", "");
        const t = await prisma.treatment.findFirst({ where: { id: treatmentId, clinicId }, select: { id: true } });
        parentExists = !!t;
      } else if (m.reference.startsWith("expense-income-")) {
        const expenseId = m.reference.replace("expense-income-", "");
        const e = await prisma.expense.findFirst({ where: { id: expenseId, clinicId }, select: { id: true } });
        parentExists = !!e;
      } else if (m.reference.startsWith("expense-")) {
        const expenseId = m.reference.replace("expense-", "");
        const e = await prisma.expense.findFirst({ where: { id: expenseId, clinicId }, select: { id: true } });
        parentExists = !!e;
      } else if (m.reference.startsWith("invoice-")) {
        const invoiceId = m.reference.replace("invoice-", "");
        const inv = await prisma.uploadedInvoice.findFirst({ where: { id: invoiceId, clinicId }, select: { id: true } });
        parentExists = !!inv;
      } else {
        parentExists = true; // Unknown reference format, keep it
      }

      if (!parentExists) {
        orphanIds.push(m.id);

        // Reverse stock for orphaned movement
        const product = await prisma.product.findFirst({
          where: { id: m.productId, clinicId },
        });
        if (product) {
          if (m.type === "OUT") {
            await prisma.product.update({
              where: { id: product.id },
              data: { currentStock: (product.currentStock ?? 0) + m.quantity },
            });
          } else if (m.type === "IN") {
            await prisma.product.update({
              where: { id: product.id },
              data: { currentStock: Math.max(0, (product.currentStock ?? 0) - m.quantity) },
            });
          }
        }
      }
    }

    // Delete orphaned movements
    if (orphanIds.length > 0) {
      await prisma.stockMovement.deleteMany({
        where: { id: { in: orphanIds } },
      });
    }

    return NextResponse.json({
      success: true,
      cleaned: orphanIds.length,
      message: `${orphanIds.length} yetim stok hareketi temizlendi`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Temizlik hatası" }, { status: 500 });
  }
}
