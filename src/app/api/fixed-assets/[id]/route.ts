import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fixedAssetSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const parsed = fixedAssetSchema.partial().safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const data: any = { ...parsed.data };
    if (parsed.data.purchaseDate !== undefined) {
      data.purchaseDate = parsed.data.purchaseDate
        ? new Date(parsed.data.purchaseDate)
        : null;
    }

    const result = await prisma.fixedAsset.updateMany({
      where: { id, clinicId },
      data,
    });

    if (result.count === 0) {
      return Response.json({ error: "Demirbaş bulunamadı" }, { status: 404 });
    }

    const updated = await prisma.fixedAsset.findUnique({ where: { id } });
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const result = await prisma.fixedAsset.deleteMany({
      where: { id, clinicId },
    });

    if (result.count === 0) {
      return Response.json({ error: "Demirbaş bulunamadı" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
