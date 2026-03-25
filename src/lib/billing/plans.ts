export type ModuleSlug =
  | "base"
  | "appointments"
  | "customers"
  | "finance"
  | "employees"
  | "inventory"
  | "alarms"
  | "reports"
  | "messaging"
  | "marketing"
  | "ai_assistant";

export interface ModulePrice {
  price: number;
  name: string;
  icon: string;
  desc: string;
}

export const MODULE_PRICES: Record<string, ModulePrice> = {
  base:         { price: 9900,  name: "Başlangıç Platformu", icon: "LayoutDashboard", desc: "Dashboard, temel özellikler" },
  appointments: { price: 24900, name: "Randevu Yönetimi",    icon: "Calendar",        desc: "Randevu takvimi ve yönetimi" },
  customers:    { price: 35900, name: "Müşteri & CRM",       icon: "Users",           desc: "Müşteri takibi ve CRM" },
  finance:      { price: 35900, name: "Finans Takibi",       icon: "DollarSign",      desc: "Gelir-gider, mali tablolar" },
  employees:    { price: 14900, name: "Çalışan Yönetimi",    icon: "UserCog",         desc: "Çalışan ve İK yönetimi" },
  inventory:    { price: 14900, name: "Stok & Envanter",     icon: "Package",         desc: "Ürün ve stok takibi" },
  alarms:       { price: 24900, name: "Alarmlar",            icon: "BellRing",        desc: "Otomatik alarm sistemi" },
  reports:      { price: 24900, name: "Raporlar",            icon: "BarChart3",       desc: "Detaylı analiz ve raporlar" },
  messaging:    { price: 0,     name: "Mesajlaşma",          icon: "MessageCircle",   desc: "Telegram entegrasyonu (ücretsiz)" },
} as const;

export const EXTRA_USER_PRICE = 4900; // ₺49/kullanıcı

export const DISCOUNT_TIERS = [
  { minModules: 7, discount: 25 },
  { minModules: 5, discount: 15 },
  { minModules: 3, discount: 10 },
] as const;

export const LOCKED_MODULES: readonly string[] = ["marketing", "ai_assistant"];

export interface StoragePlan {
  name: string;
  sizeMB: number;
  price: number;
  desc: string;
}

export const STORAGE_PLANS: Record<string, StoragePlan> = {
  free:         { name: "Ücretsiz",    sizeMB: 100,    price: 0,     desc: "100 MB" },
  standard:     { name: "Standart",    sizeMB: 5120,   price: 9900,  desc: "5 GB" },
  professional: { name: "Profesyonel", sizeMB: 20480,  price: 34900, desc: "20 GB" },
  enterprise:   { name: "Kurumsal",    sizeMB: 102400, price: 89900, desc: "100 GB" },
} as const;

export function calculateTotal(
  modules: string[],
  extraUsers: number,
  storagePlan?: string
): { subtotal: number; discount: number; discountRate: number; total: number } {
  // Module costs
  let subtotal = 0;
  for (const mod of modules) {
    const mp = MODULE_PRICES[mod];
    if (mp) subtotal += mp.price;
  }

  // Extra users
  subtotal += extraUsers * EXTRA_USER_PRICE;

  // Storage
  if (storagePlan && storagePlan !== "free") {
    const sp = STORAGE_PLANS[storagePlan];
    if (sp) subtotal += sp.price;
  }

  // Discount based on module count
  const paidModules = modules.filter((m) => MODULE_PRICES[m]?.price > 0).length;
  let discountRate = 0;
  for (const tier of DISCOUNT_TIERS) {
    if (paidModules >= tier.minModules) {
      discountRate = tier.discount;
      break;
    }
  }

  const discount = Math.round(subtotal * (discountRate / 100));
  const total = subtotal - discount;

  return { subtotal, discount, discountRate, total };
}
