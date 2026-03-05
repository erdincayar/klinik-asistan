export interface WhatsAppMessage {
  to: string;
  body: string;
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; message: string; messageId?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  // Meta Cloud API
  if (phoneNumberId && accessToken && accessToken.length > 20) {
    try {
      // Normalize phone: remove +, spaces, dashes
      const cleanPhone = phone.replace(/[\s\-\+()]/g, "");

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "text",
            text: { body: message },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          message: "WhatsApp mesajı gönderildi",
          messageId: data.messages[0].id,
        };
      } else {
        console.error("[WhatsApp] Meta API error:", data);
        const errorMsg =
          data.error?.message || data.error?.error_data?.details || "Bilinmeyen hata";
        return { success: false, message: `WhatsApp hatası: ${errorMsg}` };
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
