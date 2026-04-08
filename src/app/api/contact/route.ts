import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Lütfen tüm alanları doğru şekilde doldurun." }, { status: 400 });
  }

  const { name, email, subject, message } = parsed.data;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Poby İletişim <noreply@poby.ai>",
      to: "destek@poby.ai",
      replyTo: email,
      subject: `[İletişim] ${subject}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 18px;">Yeni İletişim Formu</h2>
          </div>
          <div style="background: #fff; border: 1px solid #E5E7EB; border-top: none; padding: 24px 32px; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6B7280; font-size: 13px; width: 100px;">İsim</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; font-size: 13px;">E-posta</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;"><a href="mailto:${email}" style="color: #6366F1;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; font-size: 13px;">Konu</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${subject}</td>
              </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 16px 0;" />
            <p style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin." }, { status: 500 });
  }
}
