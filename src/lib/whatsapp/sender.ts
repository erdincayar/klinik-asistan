export interface WhatsAppMessage {
  to: string;
  body: string;
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; message: string; sid?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  // If Twilio credentials are configured, use Twilio API
  if (accountSid && authToken && fromNumber && accountSid !== "your-twilio-account-sid") {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const toNumber = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;

      const body = new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: "WhatsApp mesajı gönderildi", sid: data.sid };
      } else {
        console.error("[WhatsApp] Twilio error:", data);
        return { success: false, message: `Twilio hatası: ${data.message || "Bilinmeyen hata"}` };
      }
    } catch (error) {
      console.error("[WhatsApp] Send error:", error);
      return { success: false, message: "WhatsApp mesajı gönderilemedi" };
    }
  }

  // Mock mode - log to console
  console.log("\n========================================");
  console.log("[WhatsApp Mock] Mesaj Gönderimi");
  console.log(`Kime: ${phone}`);
  console.log(`Mesaj: ${message}`);
  console.log("========================================\n");

  return {
    success: true,
    message: "WhatsApp mesajı gönderildi (simülasyon)",
  };
}

export async function sendDoctorNotification(message: string) {
  const doctorPhone = process.env.DOCTOR_WHATSAPP_NUMBER || "doctor";
  return sendWhatsAppMessage(doctorPhone, message);
}
