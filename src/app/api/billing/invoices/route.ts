import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;

    const subscription = await prisma.subscription.findFirst({
      where: { clinicId },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ payments: subscription?.payments || [] });
  } catch {
    return NextResponse.json({ error: "Veri alinamadi" }, { status: 500 });
  }
}
