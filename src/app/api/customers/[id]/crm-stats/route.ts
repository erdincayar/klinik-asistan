import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { id } = await params;

    const treatments = await prisma.treatment.findMany({
      where: { patientId: id, clinicId },
      orderBy: { date: "asc" },
      select: { date: true, amount: true },
    });

    if (treatments.length === 0) {
      return NextResponse.json({
        totalVisits: 0,
        totalRevenue: 0,
        avgAmount: 0,
        firstVisit: null,
        lastVisit: null,
        avgIntervalDays: null,
        status: "new",
      });
    }

    const totalVisits = treatments.length;
    const totalRevenue = treatments.reduce((s, t) => s + t.amount, 0);
    const avgAmount = Math.round(totalRevenue / totalVisits);
    const firstVisit = treatments[0].date;
    const lastVisit = treatments[treatments.length - 1].date;

    // Calculate average visit interval
    let avgIntervalDays: number | null = null;
    if (treatments.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < treatments.length; i++) {
        const diff = new Date(treatments[i].date).getTime() - new Date(treatments[i - 1].date).getTime();
        intervals.push(diff / (1000 * 60 * 60 * 24));
      }
      avgIntervalDays = Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length);
    }

    // Get alert rule for threshold
    const alertRule = await prisma.customerAlertRule.findFirst({
      where: { clinicId, alertType: "no_visit", isActive: true },
    });
    const thresholdDays = alertRule?.thresholdDays ?? 60;

    // Calculate status based on last visit
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24),
    );
    const expectedInterval = avgIntervalDays ?? thresholdDays;

    let status: "active" | "warning" | "risk";
    if (daysSinceLastVisit <= expectedInterval) {
      status = "active";
    } else if (daysSinceLastVisit <= expectedInterval * 1.5) {
      status = "warning";
    } else {
      status = "risk";
    }

    return NextResponse.json({
      totalVisits,
      totalRevenue,
      avgAmount,
      firstVisit,
      lastVisit,
      avgIntervalDays,
      daysSinceLastVisit,
      thresholdDays,
      status,
    });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
