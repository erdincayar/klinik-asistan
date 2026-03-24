import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const rules = await prisma.customerAlertRule.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rules);
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

    const { alertType = "no_visit", thresholdDays = 60, isActive = true } = await req.json();

    if (typeof thresholdDays !== "number" || thresholdDays < 1) {
      return NextResponse.json({ error: "Geçerli bir gün sayısı girin" }, { status: 400 });
    }

    const rule = await prisma.customerAlertRule.create({
      data: { clinicId, alertType, thresholdDays, isActive },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
