import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const fields = await prisma.employeeCustomField.findMany({
      where: { clinicId },
      orderBy: { sortOrder: "asc" },
    });

    return Response.json({ fields });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const body = await req.json();
    const { fieldName, fieldType } = body;

    if (!fieldName) return Response.json({ error: "Alan adı gerekli" }, { status: 400 });

    // Generate fieldKey from fieldName
    const fieldKey = fieldName
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
      .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
      .substring(0, 50);

    // Get next sort order
    const maxOrder = await prisma.employeeCustomField.findFirst({
      where: { clinicId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const field = await prisma.employeeCustomField.create({
      data: {
        clinicId,
        fieldName,
        fieldKey,
        fieldType: fieldType || "text",
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });

    return Response.json({ field }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return Response.json({ error: "Bu alan zaten mevcut" }, { status: 409 });
    }
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID gerekli" }, { status: 400 });

    const field = await prisma.employeeCustomField.findFirst({
      where: { id, clinicId },
    });
    if (!field) return Response.json({ error: "Alan bulunamadı" }, { status: 404 });

    // Delete all values for this field key
    await prisma.employeeCustomValue.deleteMany({
      where: { fieldKey: field.fieldKey },
    });

    await prisma.employeeCustomField.delete({ where: { id } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
