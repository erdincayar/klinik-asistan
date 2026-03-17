import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { sendTelegramMessage } from "@/lib/telegram/bot";

export async function sendMessage(
  channel: string,
  to: string,
  message: string,
): Promise<{ success: boolean; message: string }> {
  switch (channel) {
    case "whatsapp":
      return sendWhatsAppMessage(to, message);
    case "telegram":
      return sendTelegramMessage({ chat_id: to, text: message });
    default:
      return { success: false, message: `Desteklenmeyen kanal: ${channel}` };
  }
}

export async function sendLocation(
  channel: string,
  to: string,
  lat: number,
  lng: number,
  address: string,
): Promise<{ success: boolean; message: string }> {
  // For now, send location as text. Can be enhanced with native location messages later
  const locationText = `📍 Konum: ${address}\nhttps://www.google.com/maps?q=${lat},${lng}`;

  return sendMessage(channel, to, locationText);
}
