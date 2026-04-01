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

    const allMovements = await prisma.stockMovement.findMany({
      where: { clinicId },
      select: { id: true, reference: true, productId: true, quantity: true, type: true },
    });

    const orphanIds: string[] = [];

    // Batch-collect all referenced IDs for efficient lookup
    const treatmentIds = new Set<string>();
    const expenseIds = new Set<string>();
    const invoiceIds = new Set<string>();

    for (const m of allMovements) {
      if (!m.reference) continue;
      if (m.reference.startsWith("treatment-")) treatmentIds.add(m.reference.replace("treatment-", ""));
      else if (m.reference.startsWith("expense-income-")) expenseIds.add(m.reference.replace("expense-income-", ""));
      else if (m.reference.startsWith("expense-")) expenseIds.add(m.reference.replace("expense-", ""));
      else if (m.reference.startsWith("invoice-")) invoiceIds.add(m.reference.replace("invoice-", ""));
    }

    // Batch lookup existing parents
    const [existingTreatments, existingExpenses, existingInvoices] = await Promise.all([
      treatmentIds.size > 0
        ? prisma.treatment.findMany({ where: { id: { in: Array.from(treatmentIds) }, clinicId }, select: { id: true } })
        : Promise.resolve([]),
      expenseIds.size > 0
        ? prisma.expense.findMany({ where: { id: { in: Array.from(expenseIds) }, clinicId }, select: { id: true } })
        : Promise.resolve([]),
      invoiceIds.size > 0
        ? prisma.uploadedInvoice.findMany({ where: { id: { in: Array.from(invoiceIds) }, clinicId }, select: { id: true } })
        : Promise.resolve([]),
    ]);

    const validTreatments = new Set(existingTreatments.map(t => t.id));
    const validExpenses = new Set(existingExpenses.map(e => e.id));
    const validInvoices = new Set(existingInvoices.map(i => i.id));

    for (const m of allMovements) {
      if (!m.reference) continue; // Keep manual movements

      let parentExists = true;

      if (m.reference.startsWith("treatment-")) {
        parentExists = validTreatments.has(m.reference.replace("treatment-", ""));
      } else if (m.reference.startsWith("expense-income-")) {
        parentExists = validExpenses.has(m.reference.replace("expense-income-", ""));
      } else if (m.reference.startsWith("expense-")) {
        parentExists = validExpenses.has(m.reference.replace("expense-", ""));
      } else if (m.reference.startsWith("invoice-")) {
        parentExists = validInvoices.has(m.reference.replace("invoice-", ""));
      }

      if (!parentExists) {
        orphanIds.push(m.id);

        // Reverse stock
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
