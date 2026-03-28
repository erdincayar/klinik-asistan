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
  { value: "SCHEDULED", label: "Planlandı", color: "bg-[#EEF2FF] text-[#4F46E5]" },
  { value: "COMPLETED", label: "Tamamlandı", color: "bg-[#ECFDF5] text-[#059669]" },
  { value: "CANCELLED", label: "İptal Edildi", color: "bg-[#FEF2F2] text-[#DC2626]" },
  { value: "NO_SHOW", label: "Gelmedi", color: "bg-[#FFFBEB] text-[#D97706]" },
] as const;

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;
