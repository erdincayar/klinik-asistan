import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";

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

    const product = await prisma.product.findFirst({
      where: { id: params.id, clinicId },
      include: {
        movements: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });

    if (!product) {
      return Response.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    return Response.json(product);
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

    const existing = await prisma.product.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = productSchema.partial().safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    // Check SKU uniqueness if changed
    if (parsed.data.sku && parsed.data.sku !== existing.sku) {
      const existingSku = await prisma.product.findFirst({
        where: { sku: parsed.data.sku, clinicId, id: { not: params.id } },
      });
      if (existingSku) {
        return Response.json(
          { error: "Bu SKU kodu zaten kullanılıyor" },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return Response.json(product);
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

    const existing = await prisma.product.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!existing) {
      return Response.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    // Soft delete
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
