import { prisma } from "./prisma";

export type ActivityAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PATIENT_CREATE"
  | "PATIENT_UPDATE"
  | "APPOINTMENT_CREATE"
  | "APPOINTMENT_UPDATE"
  | "TREATMENT_CREATE"
  | "EXPENSE_CREATE"
  | "INVOICE_CREATE"
  | "INVOICE_UPLOAD"
  | "SETTINGS_UPDATE"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "TELEGRAM_CONNECT"
  | "META_CONNECT"
  | "META_DISCONNECT"
  | "CAMPAIGN_CREATE"
  | "CAMPAIGN_UPDATE"
  | "PHOTO_UPLOAD"
  | "POST_SCHEDULE";

export async function logActivity({
  userId,
  clinicId,
  action,
  details,
  ipAddress,
}: {
  userId: string;
  clinicId?: string | null;
  action: ActivityAction;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        clinicId: clinicId || null,
        action,
        details: details ? (details as any) : undefined,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Activity log error:", error);
  }
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    LOGIN: "Giriş yapıldı",
    LOGIN_FAILED: "Başarısız giriş denemesi",
    LOGOUT: "Çıkış yapıldı",
    PATIENT_CREATE: "Müşteri eklendi",
    PATIENT_UPDATE: "Müşteri güncellendi",
    APPOINTMENT_CREATE: "Randevu oluşturuldu",
    APPOINTMENT_UPDATE: "Randevu güncellendi",
    TREATMENT_CREATE: "Tedavi kaydı eklendi",
    EXPENSE_CREATE: "Gider kaydedildi",
    INVOICE_CREATE: "Fatura oluşturuldu",
    INVOICE_UPLOAD: "Fatura yüklendi",
    SETTINGS_UPDATE: "Ayarlar güncellendi",
    USER_CREATE: "Kullanıcı oluşturuldu",
    USER_UPDATE: "Kullanıcı güncellendi",
    TELEGRAM_CONNECT: "Telegram bağlandı",
    META_CONNECT: "Meta Ads bağlandı",
    META_DISCONNECT: "Meta Ads bağlantısı kesildi",
    CAMPAIGN_CREATE: "Kampanya oluşturuldu",
    CAMPAIGN_UPDATE: "Kampanya güncellendi",
    PHOTO_UPLOAD: "Fotoğraf yüklendi",
    POST_SCHEDULE: "Paylaşım planlandı",
  };
  return labels[action] || action;
}
