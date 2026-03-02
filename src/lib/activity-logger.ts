import { prisma } from "./prisma";

export type ActivityAction =
  | "LOGIN"
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
    LOGOUT: "Çıkış yapıldı",
    PATIENT_CREATE: "Hasta eklendi",
    PATIENT_UPDATE: "Hasta güncellendi",
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
    PHOTO_UPLOAD: "Fotoğraf yüklendi",
    POST_SCHEDULE: "Paylaşım planlandı",
  };
  return labels[action] || action;
}
