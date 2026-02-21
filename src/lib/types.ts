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
