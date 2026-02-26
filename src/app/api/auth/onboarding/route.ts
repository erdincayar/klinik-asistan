import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/validations";
import { hash } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      password,
      clinicName,
      sector,
      plan,
      selectedModules,
      messagingPreference,
      phone,
    } = parsed.data;

    const hashedPassword = await hash(password, 12);

    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName,
        phone,
        sector,
        plan,
        selectedModules: JSON.stringify(selectedModules),
        messagingPreference,
      },
    });

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        clinicId: clinic.id,
        onboardingCompleted: true,
      },
    });

    return Response.json({ success: true, message: "Kayıt başarılı" });
  } catch (error: any) {
    if (
      error?.code === "P2002" ||
      error?.message?.includes("Unique constraint")
    ) {
      return Response.json(
        { error: "Bu email adresi zaten kullanılıyor" },
        { status: 409 }
      );
    }
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
