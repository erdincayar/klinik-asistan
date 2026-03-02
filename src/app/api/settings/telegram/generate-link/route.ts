import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.telegramLink.create({
      data: {
        clinicId,
        code,
        expiresAt,
      },
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "inPobiBot";
    const link = `https://t.me/${botUsername}?start=${code}`;

    return NextResponse.json({ code, link, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("Generate telegram link error:", error);
    return NextResponse.json({ error: "Link oluşturulamadı" }, { status: 500 });
  }
}
