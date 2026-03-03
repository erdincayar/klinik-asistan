import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const subscription = await prisma.subscription.findFirst({
      where: { clinicId, status: { in: ["ACTIVE", "TRIAL"] } },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Aktif abonelik bulunamadi" }, { status: 404 });
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Iptal edilemedi" }, { status: 500 });
  }
}
