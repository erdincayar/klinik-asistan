import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { createHash } from "crypto";
import { hash } from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Hash the raw token to compare with DB
    const hashedToken = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!resetToken) {
      return Response.json(
        { error: "Geçersiz veya süresi dolmuş bağlantı" },
        { status: 400 }
      );
    }

    if (resetToken.usedAt) {
      return Response.json(
        { error: "Bu bağlantı daha önce kullanılmış" },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt < new Date()) {
      return Response.json(
        { error: "Bağlantının süresi dolmuş. Lütfen yeni bir talep oluşturun" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    // Atomic update: mark token as used + update password
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
    ]);

    return Response.json({
      success: true,
      message: "Şifreniz başarıyla güncellendi",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
