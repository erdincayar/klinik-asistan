import { Resend } from "resend";

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Poby <noreply@poby.ai>";

export async function sendVerificationEmail(
  email: string,
  code: string,
  name: string
) {
  const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                <span style="color:#ffffff;">Po</span><span style="color:#bfdbfe;">by</span>
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
                Email Doğrulama
              </h2>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#6b7280;">
                Merhaba <strong style="color:#111827;">${name}</strong>, hesabınızı doğrulamak için aşağıdaki kodu kullanın.
              </p>

              <!-- Code Box -->
              <div style="background-color:#f0f5ff;border:2px solid #dbeafe;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;">
                  Doğrulama Kodu
                </p>
                <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:8px;color:#1d4ed8;font-family:'Courier New',monospace;">
                  ${code}
                </p>
              </div>

              <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
                Bu kod <strong style="color:#6b7280;">15 dakika</strong> içinde geçerliliğini yitirecektir.
              </p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">
                Bu işlemi siz yapmadıysanız bu emaili görmezden gelebilirsiniz.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="margin:0;font-size:11px;color:#d1d5db;">
                &copy; 2026 Poby. Tüm hakları saklıdır.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${code} - Poby Email Doğrulama Kodu`,
    html,
  });

  if (error) {
    console.error("[Email] Verification email error:", error);
    throw new Error("Email gönderilemedi");
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
