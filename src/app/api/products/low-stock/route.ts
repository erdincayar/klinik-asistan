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

    // Prisma doesn't support field-to-field comparison in SQLite, so filter in JS
    const allActive = await prisma.product.findMany({
      where: {
        clinicId,
        isActive: true,
      },
    });

    const lowStock = allActive
      .filter((p) => p.currentStock <= p.minStock)
      .sort((a, b) => (a.currentStock - a.minStock) - (b.currentStock - b.minStock));

    return Response.json(lowStock);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
