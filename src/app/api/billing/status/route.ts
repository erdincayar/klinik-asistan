import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "Klinik bulunamadi" }, { status: 400 });

    const subscription = await prisma.subscription.findFirst({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      include: {
        payments: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    return NextResponse.json({ subscription });
  } catch {
    return NextResponse.json({ error: "Veri alinamadi" }, { status: 500 });
  }
}
