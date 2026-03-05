import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const connectSchema = z.object({
  phone: z
    .string()
    .min(10, "Geçerli bir telefon numarası girin")
    .transform((val) => val.replace(/[\s\-\(\)]/g, "")),
});

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

    const body = await req.json();
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { phone } = parsed.data;

    await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        whatsappPhone: phone,
        whatsappConnected: true,
      },
    });

    return NextResponse.json({ success: true, phone });
  } catch (error) {
    console.error("WhatsApp connect error:", error);
    return NextResponse.json(
      { error: "Bağlantı kurulamadı" },
      { status: 500 }
    );
  }
}
