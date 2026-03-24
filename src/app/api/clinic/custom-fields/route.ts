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

    const fields = await prisma.transactionCustomField.findMany({
      where: { clinicId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(fields);
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

    const { fieldName, fieldType = "text" } = await req.json();
    if (!fieldName || typeof fieldName !== "string" || fieldName.trim().length < 1) {
      return NextResponse.json({ error: "Alan adı gerekli" }, { status: 400 });
    }

    const validTypes = ["text", "number", "date"];
    if (!validTypes.includes(fieldType)) {
      return NextResponse.json({ error: "Geçersiz alan tipi" }, { status: 400 });
    }

    const fieldKey = slugify(fieldName.trim());
    if (!fieldKey) {
      return NextResponse.json({ error: "Geçersiz alan adı" }, { status: 400 });
    }

    const maxSort = await prisma.transactionCustomField.findFirst({
      where: { clinicId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const field = await prisma.transactionCustomField.create({
      data: {
        clinicId,
        fieldName: fieldName.trim(),
        fieldKey,
        fieldType,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Bu alan zaten mevcut" }, { status: 409 });
    }
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
