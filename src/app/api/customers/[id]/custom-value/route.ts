import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  columnKey: z.string().min(1),
  value: z.string(),
});

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

    // Verify patient belongs to clinic
    const patient = await prisma.patient.findFirst({
      where: { id, clinicId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const { columnKey, value } = parsed.data;

    const result = await prisma.customerCustomValue.upsert({
      where: { customerId_columnKey: { customerId: id, columnKey } },
      update: { value },
      create: { customerId: id, columnKey, value },
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
