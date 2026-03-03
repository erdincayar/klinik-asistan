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

    const { customers } = await req.json();

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "Müşteri verisi bulunamadı" }, { status: 400 });
    }

    let created = 0;
    let failed = 0;

    for (const customer of customers) {
      try {
        if (!customer.name?.trim()) {
          failed++;
          continue;
        }
        await prisma.patient.create({
          data: {
            name: customer.name.trim(),
            phone: customer.phone?.trim() || null,
            email: customer.email?.trim() || null,
            notes: customer.notes?.trim() || null,
            clinicId,
          },
        });
        created++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ created, failed });
  } catch (error) {
    return NextResponse.json(
      { error: "Kaydetme sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
