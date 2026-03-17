export interface ModuleDefinition {
  slug: string;
  name: string;
  shortDescription: string;
  featureList: string[];
  icon: string;
  color: string;
  basePrice: number;
  sectors: string[];
  isPremium: boolean;
  sortOrder: number;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    slug: "whatsapp-assistant",
    name: "WhatsApp AI Asistan",
    shortDescription: "7/24 otomatik müşteri yanıtı, randevu alma, SSS",
    featureList: [
      "Otomatik müşteri yanıtı",
      "WhatsApp'tan randevu alma",
      "Sık sorulan sorular",
      "Akıllı yönlendirme",
    ],
    icon: "MessageCircle",
    color: "#25D366",
    basePrice: 299,
    sectors: ["dental", "doctor", "restaurant", "market", "barbershop", "beauty", "other"],
    isPremium: false,
    sortOrder: 1,
  },
  {
    slug: "appointment",
    name: "Randevu Yönetimi",
    shortDescription: "Online randevu, takvim, hatırlatma bildirimleri",
    featureList: [
      "Online randevu sistemi",
      "Çalışan bazlı takvim",
      "Otomatik hatırlatma",
      "Çakışma kontrolü",
    ],
    icon: "Calendar",
    color: "#3B82F6",
    basePrice: 199,
    sectors: ["dental", "doctor", "barbershop", "beauty", "other"],
    isPremium: false,
    sortOrder: 2,
  },
  {
    slug: "finance",
    name: "Finans Takibi",
    shortDescription: "Gelir/gider takibi, fatura, finansal raporlar",
    featureList: [
      "Gelir/gider takibi",
      "Fatura oluşturma",
      "Mali raporlar",
      "KDV hesaplama",
    ],
    icon: "DollarSign",
    color: "#EF9F27",
    basePrice: 249,
    sectors: ["dental", "doctor", "restaurant", "market", "barbershop", "beauty", "other"],
    isPremium: false,
    sortOrder: 3,
  },
  {
    slug: "ai-content",
    name: "AI İçerik Stüdyosu",
    shortDescription: "Sosyal medya görseli ve video üretimi, özel gün kampanyaları",
    featureList: [
      "AI görsel üretimi",
      "Özel gün kampanyaları",
      "Marka uyumlu tasarım",
      "Sosyal medya şablonları",
    ],
    icon: "Sparkles",
    color: "#8B5CF6",
    basePrice: 349,
    sectors: ["dental", "doctor", "restaurant", "barbershop", "beauty", "other"],
    isPremium: true,
    sortOrder: 4,
  },
  {
    slug: "meta-ads",
    name: "Meta Ads Yönetimi",
    shortDescription: "Facebook/Instagram reklam yönetimi, performans takibi",
    featureList: [
      "Kampanya oluşturma",
      "Performans takibi",
      "AI bütçe optimizasyonu",
      "Hedef kitle analizi",
    ],
    icon: "Megaphone",
    color: "#1877F2",
    basePrice: 399,
    sectors: ["dental", "doctor", "restaurant", "barbershop", "beauty", "other"],
    isPremium: true,
    sortOrder: 5,
  },
  {
    slug: "social-media",
    name: "Sosyal Medya Yönetimi",
    shortDescription: "İçerik planlama, zamanlama, çoklu platform yönetimi",
    featureList: [
      "İçerik takvimi",
      "Otomatik paylaşım",
      "Çoklu platform",
      "Analitik raporlar",
    ],
    icon: "Share2",
    color: "#E1306C",
    basePrice: 279,
    sectors: ["dental", "doctor", "restaurant", "barbershop", "beauty", "other"],
    isPremium: false,
    sortOrder: 6,
  },
  {
    slug: "crm",
    name: "Müşteri Yönetimi (CRM)",
    shortDescription: "Müşteri kartları, geçmiş, segmentasyon",
    featureList: [
      "Müşteri kartları",
      "İşlem geçmişi",
      "Segmentasyon",
      "Sadakat takibi",
    ],
    icon: "Users",
    color: "#10B981",
    basePrice: 199,
    sectors: ["dental", "doctor", "restaurant", "market", "barbershop", "beauty", "other"],
    isPremium: false,
    sortOrder: 7,
  },
  {
    slug: "poby-assistant",
    name: "Poby AI Asistan",
    shortDescription: "Tüm kanallarda AI destekli müşteri iletişimi",
    featureList: [
      "Çok kanallı destek",
      "Doğal dil anlama",
      "Akıllı öneri sistemi",
      "Otomatik raporlama",
    ],
    icon: "Bot",
    color: "#EF9F27",
    basePrice: 349,
    sectors: ["dental", "doctor", "restaurant", "market", "barbershop", "beauty", "other"],
    isPremium: true,
    sortOrder: 8,
  },
];

export const PAIN_POINT_OPTIONS = [
  { id: "appointment", label: "Randevu takibi zor", icon: "Calendar" },
  { id: "whatsapp", label: "WhatsApp/telefon yoğunluğu", icon: "MessageCircle" },
  { id: "social-media", label: "Sosyal medya yönetimi", icon: "Share2" },
  { id: "finance", label: "Gelir-gider takibi", icon: "DollarSign" },
  { id: "customer-loss", label: "Müşteri kaybı", icon: "Users" },
  { id: "ads", label: "Reklam yönetimi", icon: "Megaphone" },
] as const;

export const SECTOR_OPTIONS = [
  { id: "dental", label: "Diş Kliniği", emoji: "🦷" },
  { id: "doctor", label: "Doktor/Klinik", emoji: "👨‍⚕️" },
  { id: "restaurant", label: "Restoran", emoji: "🍽️" },
  { id: "market", label: "Market", emoji: "🛒" },
  { id: "barbershop", label: "Kuaför", emoji: "✂️" },
  { id: "beauty", label: "Güzellik Merkezi", emoji: "💅" },
  { id: "other", label: "Diğer", emoji: "✏️" },
] as const;

export const TEAM_SIZE_OPTIONS = [
  { id: "1-5", label: "1-5 kişi", emoji: "👤" },
  { id: "5-10", label: "5-10 kişi", emoji: "👥" },
  { id: "10+", label: "10+ kişi", emoji: "🏢" },
] as const;

export type PainPointId = (typeof PAIN_POINT_OPTIONS)[number]["id"];
export type SectorId = (typeof SECTOR_OPTIONS)[number]["id"];
export type TeamSizeId = (typeof TEAM_SIZE_OPTIONS)[number]["id"];
