import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
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
    const { ids, data } = body as { ids: string[]; data: Record<string, any> };

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "Güncellenecek ürün seçilmedi" }, { status: 400 });
    }

    // Only allow safe fields to be bulk-updated
    const allowedFields = ["brand", "category", "unit", "orderAlert", "minProfitMargin"];
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in data) {
        updateData[key] = data[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: "Güncellenecek alan bulunamadı" }, { status: 400 });
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: ids }, clinicId },
      data: updateData,
    });

    return Response.json({ success: true, updated: result.count });
  } catch (err) {
    console.error("Bulk update error:", err);
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
