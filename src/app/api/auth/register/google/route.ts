import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const googleRegisterSchema = z.object({
  clinicName: z.string().min(2, "İşletme adı en az 2 karakter olmalı"),
  sector: z.string().min(1, "Sektör seçin"),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return Response.json({ error: "Kullanıcı bulunamadı" }, { status: 401 });
    }

    // Check if user already has a clinic
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { clinicId: true },
    });

    if (existingUser?.clinicId) {
      return Response.json(
        { error: "Zaten bir işletmeniz var" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = googleRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const { clinicName, sector, phone } = parsed.data;

    // Create clinic and link to user
    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName,
        sector,
        phone: phone || null,
      },
    });

    await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: {
          clinicId: clinic.id,
          onboardingCompleted: true,
        },
      }),
      prisma.tokenBalance.create({
        data: { clinicId: clinic.id, balance: 50000 },
      }),
    ]);

    return Response.json({ success: true, message: "Kayıt tamamlandı" });
  } catch (error: any) {
    console.error("Google register error:", error);
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
