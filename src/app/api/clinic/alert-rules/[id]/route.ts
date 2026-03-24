import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
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
    const body = await req.json();

    const data: any = {};
    if (typeof body.thresholdDays === "number") data.thresholdDays = body.thresholdDays;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const rule = await prisma.customerAlertRule.updateMany({
      where: { id, clinicId },
      data,
    });

    if (rule.count === 0) {
      return NextResponse.json({ error: "Kural bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
