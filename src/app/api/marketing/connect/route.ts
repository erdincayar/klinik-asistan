import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { accessToken, adAccountId, pageId } = await req.json();

    if (!accessToken || !adAccountId) {
      return NextResponse.json({ error: "Access Token ve Ad Account ID gerekli" }, { status: 400 });
    }

    const connection = await prisma.metaAdsConnection.upsert({
      where: { clinicId },
      update: { accessToken, adAccountId, pageId },
      create: { clinicId, accessToken, adAccountId, pageId },
    });

    return NextResponse.json({ success: true, id: connection.id });
  } catch (error) {
    console.error("Meta connect error:", error);
    return NextResponse.json({ error: "Bağlantı kurulamadı" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const connection = await prisma.metaAdsConnection.findUnique({
      where: { clinicId },
    });

    return NextResponse.json({ connected: !!connection });
  } catch (error) {
    console.error("Meta status error:", error);
    return NextResponse.json({ error: "Durum alınamadı" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    await prisma.metaAdsConnection.deleteMany({ where: { clinicId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meta disconnect error:", error);
    return NextResponse.json({ error: "Bağlantı kaldırılamadı" }, { status: 500 });
  }
}
