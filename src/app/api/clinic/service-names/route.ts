import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const q = req.nextUrl.searchParams.get("q") || "";

    const results = await prisma.clinicServiceName.findMany({
      where: {
        clinicId,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { usageCount: "desc" },
      take: 10,
      select: { name: true },
    });

    return NextResponse.json(results.map((r) => r.name));
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

    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });
    }

    await prisma.clinicServiceName.upsert({
      where: { clinicId_name: { clinicId, name: name.trim() } },
      update: { usageCount: { increment: 1 } },
      create: { clinicId, name: name.trim() },
    });

    return NextResponse.json({ ok: true });
  } catch {
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

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });
    }

    await prisma.clinicServiceName.deleteMany({
      where: { clinicId, name: name.trim() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
