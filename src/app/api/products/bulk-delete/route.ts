import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const body = await req.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "Silinecek ürün seçilmedi" }, { status: 400 });
    }

    // Hard delete — remove related stock movements first, then products
    await prisma.stockMovement.deleteMany({
      where: { productId: { in: ids }, clinicId },
    });

    const result = await prisma.product.deleteMany({
      where: { id: { in: ids }, clinicId },
    });

    return Response.json({ success: true, deleted: result.count });
  } catch (err) {
    console.error("Bulk product delete error:", err);
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
