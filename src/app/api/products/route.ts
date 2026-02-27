import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";

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
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const active = searchParams.get("active");

    const where: any = { clinicId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (active !== null && active !== undefined && active !== "") {
      where.isActive = active === "true";
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return Response.json(products);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
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
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    // Check SKU uniqueness within clinic
    const existingSku = await prisma.product.findFirst({
      where: { sku: parsed.data.sku, clinicId },
    });
    if (existingSku) {
      return Response.json(
        { error: "Bu SKU kodu zaten kullanılıyor" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        clinicId,
      },
    });

    return Response.json(product, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
