export const TREATMENT_CATEGORIES = [
  { value: "BOTOX", label: "Botox" },
  { value: "DOLGU", label: "Dolgu" },
  { value: "DIS_TEDAVI", label: "Diş Tedavisi" },
  { value: "GENEL", label: "Genel" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "KIRA", label: "Kira" },
  { value: "MAAS", label: "Maaş" },
  { value: "MALZEME", label: "Malzeme" },
  { value: "FATURA", label: "Fatura" },
  { value: "DIGER", label: "Diğer" },
] as const;

export type TreatmentCategory = "BOTOX" | "DOLGU" | "DIS_TEDAVI" | "GENEL";
export type ExpenseCategory = "KIRA" | "MAAS" | "MALZEME" | "FATURA" | "DIGER";

export const APPOINTMENT_STATUSES = [
  { value: "SCHEDULED", label: "Planlandı", color: "bg-blue-100 text-blue-800" },
  { value: "COMPLETED", label: "Tamamlandı", color: "bg-green-100 text-green-800" },
  { value: "CANCELLED", label: "İptal Edildi", color: "bg-red-100 text-red-800" },
  { value: "NO_SHOW", label: "Gelmedi", color: "bg-yellow-100 text-yellow-800" },
] as const;

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;
