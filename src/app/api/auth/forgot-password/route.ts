import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { randomBytes, createHash } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const successResponse = Response.json({
      success: true,
      message: "Şifre sıfırlama bağlantısı email adresinize gönderildi",
    });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return successResponse;
    }

    // Invalidate existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate token: raw token for URL, hashed token for DB
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Replace with actual email sending
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;
    console.log(`[PASSWORD RESET] ${email}: ${resetUrl}`);

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
