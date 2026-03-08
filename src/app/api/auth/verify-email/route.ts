import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/email";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resendSchema = z.object({
  email: z.string().email(),
  resend: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Resend code request
    const resendParsed = resendSchema.safeParse(body);
    if (resendParsed.success) {
      const { email } = resendParsed.data;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, emailVerified: true },
      });

      if (!user) {
        return Response.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
      }

      if (user.emailVerified) {
        return Response.json({ error: "Email zaten doğrulanmış" }, { status: 400 });
      }

      const newCode = generateVerificationCode();
      const newExpires = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { email },
        data: {
          emailVerifyToken: newCode,
          emailVerifyExpires: newExpires,
        },
      });

      try {
        await sendVerificationEmail(email, newCode, user.name);
      } catch {
        return Response.json(
          { error: "Email gönderilemedi. Lütfen tekrar deneyin." },
          { status: 500 }
        );
      }

      return Response.json({ success: true, message: "Yeni kod gönderildi" });
    }

    // Verify code request
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Geçersiz kod veya email" },
        { status: 400 }
      );
    }

    const { email, code } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
        emailVerifyToken: true,
        emailVerifyExpires: true,
      },
    });

    if (!user) {
      return Response.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    if (user.emailVerified) {
      return Response.json({ success: true, message: "Email zaten doğrulanmış" });
    }

    if (!user.emailVerifyToken || !user.emailVerifyExpires) {
      return Response.json(
        { error: "Doğrulama kodu bulunamadı. Yeni kod isteyin." },
        { status: 400 }
      );
    }

    if (user.emailVerifyExpires < new Date()) {
      return Response.json(
        { error: "Doğrulama kodunun süresi dolmuş. Yeni kod isteyin." },
        { status: 410 }
      );
    }

    if (user.emailVerifyToken !== code) {
      return Response.json(
        { error: "Doğrulama kodu hatalı" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    return Response.json({ success: true, message: "Email doğrulandı" });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
