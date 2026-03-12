import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { hash } from "bcryptjs";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const { name, email, password, clinicName } = parsed.data;
    const hashedPassword = await hash(password, 12);

    const verifyCode = generateVerificationCode();
    const verifyExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const clinic = await prisma.clinic.create({
      data: { name: clinicName, storageLimitMB: 100 },
    });

    await Promise.all([
      prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          clinicId: clinic.id,
          emailVerified: false,
          emailVerifyToken: verifyCode,
          emailVerifyExpires: verifyExpires,
        },
      }),
      prisma.tokenBalance.create({
        data: { clinicId: clinic.id, balance: 50000 },
      }),
    ]);

    // Send verification email (non-blocking — don't fail registration if email fails)
    try {
      await sendVerificationEmail(email, verifyCode, name);
    } catch (emailError) {
      console.error("[Register] Verification email failed:", emailError);
    }

    return Response.json({ success: true, email, message: "Kayıt başarılı" });
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
