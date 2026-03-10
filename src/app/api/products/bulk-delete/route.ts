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

    // Soft delete — only products belonging to this clinic
    const result = await prisma.product.updateMany({
      where: { id: { in: ids }, clinicId },
      data: { isActive: false },
    });

    return Response.json({ success: true, deleted: result.count });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
