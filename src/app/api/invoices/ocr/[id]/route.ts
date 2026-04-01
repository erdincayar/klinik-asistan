import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { id } = await params;

    const invoice = await prisma.uploadedInvoice.findFirst({
      where: { id, clinicId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // If invoice was approved, reverse all side effects
      if (invoice.approved) {
        const reference = `invoice-${id}`;

        // Find all stock movements created by this invoice
        const stockMovements = await tx.stockMovement.findMany({
          where: { clinicId, reference },
        });

        // Reverse product stock for each movement
        for (const movement of stockMovements) {
          const product = await tx.product.findFirst({
            where: { id: movement.productId, clinicId },
          });
          if (!product) continue;

          if (movement.type === "IN") {
            // Was a purchase invoice — reverse stock addition
            await tx.product.update({
              where: { id: product.id },
              data: {
                currentStock: Math.max(0, (product.currentStock ?? 0) - movement.quantity),
              },
            });
          } else if (movement.type === "OUT") {
            // Was a sales invoice — reverse stock deduction
            await tx.product.update({
              where: { id: product.id },
              data: {
                currentStock: (product.currentStock ?? 0) + movement.quantity,
              },
            });
          }
        }

        // Delete all stock movements for this invoice
        await tx.stockMovement.deleteMany({
          where: { clinicId, reference },
        });
      }

      // Delete linked expense/income record
      if (invoice.linkedExpenseId) {
        await tx.expense.delete({ where: { id: invoice.linkedExpenseId } }).catch(() => {});
      }

      // Delete linked cari hesap entry
      if (invoice.vendor) {
        await tx.debt.deleteMany({
          where: {
            clinicId,
            description: `Fatura - ${invoice.fileName}`,
            contactName: invoice.vendor,
          },
        });
      }

      // Delete the invoice itself
      await tx.uploadedInvoice.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: "Fatura silindi" });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Silme hatası" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { id } = await params;

    const invoice = await prisma.uploadedInvoice.findFirst({
      where: { id, clinicId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
    }

    const body = await req.json();

    // If fileName update requested
    if (body.fileName) {
      await prisma.uploadedInvoice.update({
        where: { id },
        data: { fileName: body.fileName },
      });
      return NextResponse.json({ success: true, message: "Fatura ismi güncellendi" });
    }

    // Otherwise reject
    if (invoice.approved) {
      return NextResponse.json(
        { error: "Onaylanmış fatura reddedilemez" },
        { status: 400 }
      );
    }

    await prisma.uploadedInvoice.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ success: true, message: "Fatura reddedildi" });
  } catch (error) {
    console.error("Reject invoice error:", error);
    return NextResponse.json({ error: "Reddetme hatası" }, { status: 500 });
  }
}
