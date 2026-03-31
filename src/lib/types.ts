export const TREATMENT_CATEGORIES = [
  { value: "SATIS", label: "Satış" },
  { value: "HIZMET", label: "Hizmet" },
  { value: "KOMISYON", label: "Komisyon" },
  { value: "DIGER", label: "Diğer" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "KIRA", label: "Kira" },
  { value: "MAAS", label: "Maaş" },
  { value: "MALZEME", label: "Malzeme / Tedarik" },
  { value: "NAKLIYE", label: "Nakliye / Kargo" },
  { value: "FATURA", label: "Fatura (Elektrik, Su, vb.)" },
  { value: "REKLAM", label: "Reklam / Pazarlama" },
  { value: "VERGI", label: "Vergi / Harç" },
  { value: "BAKIM", label: "Bakım / Onarım" },
  { value: "SIGORTA", label: "Sigorta" },
  { value: "DIGER", label: "Diğer" },
] as const;

export const INCOME_CATEGORIES = [
  { value: "SATIS", label: "Satış" },
  { value: "HIZMET", label: "Hizmet" },
  { value: "KOMISYON", label: "Komisyon" },
  { value: "IADE", label: "İade" },
  { value: "DIGER", label: "Diğer" },
] as const;

export type TreatmentCategory = (typeof TREATMENT_CATEGORIES)[number]["value"];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]["value"];

export const APPOINTMENT_STATUSES = [
  { value: "SCHEDULED", label: "Planlandı", color: "bg-[#EEF2FF] text-[#4F46E5]" },
  { value: "COMPLETED", label: "Tamamlandı", color: "bg-[#ECFDF5] text-[#059669]" },
  { value: "CANCELLED", label: "İptal Edildi", color: "bg-[#FEF2F2] text-[#DC2626]" },
  { value: "NO_SHOW", label: "Gelmedi", color: "bg-[#FFFBEB] text-[#D97706]" },
] as const;

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;
