// ─── Types ───

export interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  orderAlert: boolean;
  purchasePrice: number;
  purchasePriceUSD: number | null;
  currency: string;
  minProfitMargin: number;
  salePrice: number;
  salePriceUSD: number | null;
  saleCurrency: string;
  isActive: boolean;
  createdAt: string;
  movements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description: string | null;
  reference: string | null;
  date: string;
  product?: { name: string; sku: string; unit: string };
}

export interface StockSummary {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  totalStockValue: { purchase: number; sale: number };
  categoryDistribution: { category: string; count: number; value: number }[];
  recentMovements: { in: number; out: number };
  topConsumed: { productId: string; name: string; totalOut: number }[];
}

export interface StockAlarm {
  id: string;
  clinicId: string;
  productId: string | null;
  product: { id: string; name: string; sku: string } | null;
  name: string;
  type: string;
  threshold: number;
  currency: string | null;
  isActive: boolean;
  lastTriggered: string | null;
  createdAt: string;
}

export interface FixedAsset {
  id: string;
  clinicId: string;
  name: string;
  category: string;
  purchaseDate: string | null;
  purchasePrice: number;
  serialNumber: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ───

export const CATEGORIES = [
  { value: "KOZMETIK", label: "Kozmetik" },
  { value: "MEDIKAL", label: "Medikal" },
  { value: "SARF_MALZEME", label: "Sarf Malzeme" },
  { value: "DIGER", label: "Diğer" },
];

export const UNITS = [
  { value: "ADET", label: "Adet" },
  { value: "KUTU", label: "Kutu" },
  { value: "ML", label: "ml" },
  { value: "GR", label: "gr" },
];

export const CURRENCIES = [
  { value: "TRY", label: "₺ TRY", symbol: "₺" },
  { value: "USD", label: "$ USD", symbol: "$" },
  { value: "EUR", label: "€ EUR", symbol: "€" },
];

export const CATEGORY_BADGE_COLORS: Record<string, string> = {
  KOZMETIK: "bg-pink-100 text-pink-800",
  MEDIKAL: "bg-blue-100 text-blue-800",
  SARF_MALZEME: "bg-orange-100 text-orange-800",
  DIGER: "bg-gray-100 text-gray-800",
};

export const CATEGORY_PIE_COLORS: Record<string, string> = {
  KOZMETIK: "#ec4899",
  MEDIKAL: "#3b82f6",
  SARF_MALZEME: "#f97316",
  DIGER: "#6b7280",
};

export const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  IN: { label: "Giriş", className: "bg-green-100 text-green-800" },
  OUT: { label: "Çıkış", className: "bg-red-100 text-red-800" },
  ADJUSTMENT: { label: "Düzeltme", className: "bg-yellow-100 text-yellow-800" },
};

export const ALARM_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  STOCK: { label: "Stok", className: "bg-blue-100 text-blue-800" },
  PROFIT_MARGIN: { label: "Kâr Marjı", className: "bg-orange-100 text-orange-800" },
  CURRENCY: { label: "Döviz", className: "bg-green-100 text-green-800" },
};

export const FIXED_ASSET_CATEGORIES = [
  { value: "ELEKTRONIK", label: "Elektronik" },
  { value: "MOBILYA", label: "Mobilya" },
  { value: "CIHAZ", label: "Cihaz" },
  { value: "ARAC", label: "Araç" },
  { value: "DIGER", label: "Diğer" },
];

export const FIXED_ASSET_STATUSES = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "MAINTENANCE", label: "Bakımda" },
  { value: "BROKEN", label: "Arızalı" },
  { value: "SCRAPPED", label: "Hurdaya Ayrıldı" },
];

export const ASSET_STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  BROKEN: "bg-red-100 text-red-800",
  SCRAPPED: "bg-gray-100 text-gray-800",
};

// ─── Helpers ───

export function getCategoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function getUnitLabel(value: string) {
  return UNITS.find((u) => u.value === value)?.label || value;
}

export function getCurrencySymbol(value: string) {
  return CURRENCIES.find((c) => c.value === value)?.symbol || "₺";
}

export function calcProfitMargin(costTRY: number, saleTRY: number): number | null {
  if (saleTRY <= 0 || costTRY <= 0) return null;
  return Math.round(((saleTRY - costTRY) / costTRY) * 100);
}
