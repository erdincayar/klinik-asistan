/**
 * Sektör Konfigürasyon Sistemi
 *
 * Her sektör için UI etiketleri, varsayılan alanlar ve iş akışını tanımlar.
 * "DIGER" sektörü kullanıcının kendi özelleştirmesine açıktır.
 */

export interface SectorLabels {
  // Ana modül etiketleri
  customerSingular: string;    // "Hasta" | "Müşteri" | "Bayi"
  customerPlural: string;      // "Hastalar" | "Müşteriler" | "Bayiler"
  appointmentSingular: string; // "Randevu" | "Sipariş" | "Toplantı" | "Rezervasyon"
  appointmentPlural: string;   // "Randevular" | "Siparişler" | "Toplantılar"
  treatmentSingular: string;   // "Tedavi" | "İşlem" | "Hizmet" | "Sipariş"
  treatmentPlural: string;     // "Tedaviler" | "İşlemler" | "Hizmetler"
  employeeSingular: string;    // "Çalışan" | "Personel" | "Ekip Üyesi"
  employeePlural: string;      // "Çalışanlar" | "Personel" | "Ekip"
  // Ek alanlar
  showTcField: boolean;        // TC Kimlik alanı göster
  showBirthDate: boolean;      // Doğum tarihi göster
  showCompanyFields: boolean;  // Firma/vergi alanları göster
  // Varsayılan işlem kategorileri
  defaultCategories: { value: string; label: string }[];
}

export const SECTOR_CONFIGS: Record<string, SectorLabels> = {
  SAGLIK: {
    customerSingular: "Hasta",
    customerPlural: "Hastalar",
    appointmentSingular: "Randevu",
    appointmentPlural: "Randevular",
    treatmentSingular: "Tedavi",
    treatmentPlural: "Tedaviler",
    employeeSingular: "Çalışan",
    employeePlural: "Çalışanlar",
    showTcField: true,
    showBirthDate: true,
    showCompanyFields: false,
    defaultCategories: [
      { value: "BOTOX", label: "Botox" },
      { value: "DOLGU", label: "Dolgu" },
      { value: "DIS_TEDAVI", label: "Diş Tedavisi" },
      { value: "GENEL", label: "Genel" },
    ],
  },
  GUZELLIK: {
    customerSingular: "Müşteri",
    customerPlural: "Müşteriler",
    appointmentSingular: "Randevu",
    appointmentPlural: "Randevular",
    treatmentSingular: "İşlem",
    treatmentPlural: "İşlemler",
    employeeSingular: "Çalışan",
    employeePlural: "Çalışanlar",
    showTcField: false,
    showBirthDate: true,
    showCompanyFields: false,
    defaultCategories: [
      { value: "BAKIM", label: "Bakım" },
      { value: "MAKYAJ", label: "Makyaj" },
      { value: "EPILASYON", label: "Epilasyon" },
      { value: "GENEL", label: "Genel" },
    ],
  },
  KUAFOR: {
    customerSingular: "Müşteri",
    customerPlural: "Müşteriler",
    appointmentSingular: "Randevu",
    appointmentPlural: "Randevular",
    treatmentSingular: "Hizmet",
    treatmentPlural: "Hizmetler",
    employeeSingular: "Personel",
    employeePlural: "Personel",
    showTcField: false,
    showBirthDate: true,
    showCompanyFields: false,
    defaultCategories: [
      { value: "SAC_KESIM", label: "Saç Kesim" },
      { value: "BOYA", label: "Boya" },
      { value: "BAKIM", label: "Bakım" },
      { value: "GENEL", label: "Genel" },
    ],
  },
  RESTORAN: {
    customerSingular: "Müşteri",
    customerPlural: "Müşteriler",
    appointmentSingular: "Rezervasyon",
    appointmentPlural: "Rezervasyonlar",
    treatmentSingular: "Sipariş",
    treatmentPlural: "Siparişler",
    employeeSingular: "Personel",
    employeePlural: "Personel",
    showTcField: false,
    showBirthDate: false,
    showCompanyFields: false,
    defaultCategories: [
      { value: "YEMEK", label: "Yemek" },
      { value: "ICECEK", label: "İçecek" },
      { value: "PAKET", label: "Paket Servis" },
      { value: "GENEL", label: "Genel" },
    ],
  },
  OTEL: {
    customerSingular: "Misafir",
    customerPlural: "Misafirler",
    appointmentSingular: "Rezervasyon",
    appointmentPlural: "Rezervasyonlar",
    treatmentSingular: "Konaklama",
    treatmentPlural: "Konaklamalar",
    employeeSingular: "Personel",
    employeePlural: "Personel",
    showTcField: true,
    showBirthDate: false,
    showCompanyFields: false,
    defaultCategories: [
      { value: "STANDART", label: "Standart Oda" },
      { value: "SUIT", label: "Suit" },
      { value: "DELUXE", label: "Deluxe" },
      { value: "GENEL", label: "Genel" },
    ],
  },
  DISTRIBUTOR: {
    customerSingular: "Müşteri",
    customerPlural: "Müşteriler",
    appointmentSingular: "Toplantı",
    appointmentPlural: "Toplantılar",
    treatmentSingular: "Sipariş",
    treatmentPlural: "Siparişler",
    employeeSingular: "Ekip Üyesi",
    employeePlural: "Ekip",
    showTcField: false,
    showBirthDate: false,
    showCompanyFields: true,
    defaultCategories: [
      { value: "TOPTAN", label: "Toptan Satış" },
      { value: "PERAKENDE", label: "Perakende" },
      { value: "IHRACAT", label: "İhracat" },
      { value: "GENEL", label: "Genel" },
    ],
  },
  DIGER: {
    customerSingular: "Müşteri",
    customerPlural: "Müşteriler",
    appointmentSingular: "Randevu",
    appointmentPlural: "Randevular",
    treatmentSingular: "İşlem",
    treatmentPlural: "İşlemler",
    employeeSingular: "Çalışan",
    employeePlural: "Çalışanlar",
    showTcField: false,
    showBirthDate: false,
    showCompanyFields: false,
    defaultCategories: [
      { value: "GENEL", label: "Genel" },
    ],
  },
};

// Varsayılan config (sektör bulunamazsa)
export const DEFAULT_SECTOR_CONFIG = SECTOR_CONFIGS.DIGER;

export function getSectorConfig(sector: string | null | undefined): SectorLabels {
  if (!sector) return DEFAULT_SECTOR_CONFIG;
  return SECTOR_CONFIGS[sector] || DEFAULT_SECTOR_CONFIG;
}

// Sektör listesi (onboarding + ayarlar için)
export const SECTOR_LIST = [
  { value: "SAGLIK", label: "Sağlık / Medikal Estetik" },
  { value: "GUZELLIK", label: "Güzellik Merkezi" },
  { value: "KUAFOR", label: "Kuaför / Berber" },
  { value: "RESTORAN", label: "Restoran / Kafe" },
  { value: "OTEL", label: "Otel / Konaklama" },
  { value: "DISTRIBUTOR", label: "Distribütör / Toptan" },
  { value: "DIGER", label: "Diğer" },
];
