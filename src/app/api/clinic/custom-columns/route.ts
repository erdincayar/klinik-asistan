import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const columns = await prisma.customerCustomColumn.findMany({
      where: { clinicId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(columns);
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const body = await req.json();
    const { columnName, fieldType, options, isRequired } = body;
    if (!columnName || typeof columnName !== "string" || columnName.trim().length < 1) {
      return NextResponse.json({ error: "Sütun adı gerekli" }, { status: 400 });
    }

    const columnKey = slugify(columnName.trim());
    if (!columnKey) {
      return NextResponse.json({ error: "Geçersiz sütun adı" }, { status: 400 });
    }

    const validTypes = ["text", "number", "date", "select", "phone", "email", "textarea"];
    const type = validTypes.includes(fieldType) ? fieldType : "text";

    // Get current max sortOrder
    const maxSort = await prisma.customerCustomColumn.findFirst({
      where: { clinicId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const column = await prisma.customerCustomColumn.create({
      data: {
        clinicId,
        columnName: columnName.trim(),
        columnKey,
        fieldType: type,
        options: type === "select" && options ? JSON.stringify(options) : null,
        isRequired: isRequired === true,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Bu sütun zaten mevcut" }, { status: 409 });
    }
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { columnKey } = await req.json();
    if (!columnKey) {
      return NextResponse.json({ error: "columnKey gerekli" }, { status: 400 });
    }

    // Delete all values for this column
    await prisma.customerCustomValue.deleteMany({
      where: { columnKey, patient: { clinicId } },
    });

    // Delete the column definition
    await prisma.customerCustomColumn.delete({
      where: { clinicId_columnKey: { clinicId, columnKey } },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
