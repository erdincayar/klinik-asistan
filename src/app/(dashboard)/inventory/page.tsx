"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, AlertTriangle, CheckCircle, Package, Upload, Download, Loader2, FileSpreadsheet, ArrowRight, Trash2, ShoppingCart, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate, toKurus, fromKurus } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// --- Types ---

interface Product {
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
  isActive: boolean;
  createdAt: string;
  movements?: StockMovement[];
}

interface StockMovement {
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

interface StockSummary {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  totalStockValue: { purchase: number; sale: number };
  categoryDistribution: { category: string; count: number; value: number }[];
  recentMovements: { in: number; out: number };
  topConsumed: { productId: string; name: string; totalOut: number }[];
}

interface ExchangeRates {
  rates: Record<string, number>;
  fetchedAt: number;
}

// --- Constants ---

const CATEGORIES = [
  { value: "KOZMETIK", label: "Kozmetik" },
  { value: "MEDIKAL", label: "Medikal" },
  { value: "SARF_MALZEME", label: "Sarf Malzeme" },
  { value: "DIGER", label: "Diğer" },
];

const UNITS = [
  { value: "ADET", label: "Adet" },
  { value: "KUTU", label: "Kutu" },
  { value: "ML", label: "ml" },
  { value: "GR", label: "gr" },
];

const CURRENCIES = [
  { value: "TRY", label: "₺ TRY", symbol: "₺" },
  { value: "USD", label: "$ USD", symbol: "$" },
  { value: "EUR", label: "€ EUR", symbol: "€" },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  KOZMETIK: "bg-pink-100 text-pink-800",
  MEDIKAL: "bg-blue-100 text-blue-800",
  SARF_MALZEME: "bg-orange-100 text-orange-800",
  DIGER: "bg-gray-100 text-gray-800",
};

const CATEGORY_PIE_COLORS: Record<string, string> = {
  KOZMETIK: "#ec4899",
  MEDIKAL: "#3b82f6",
  SARF_MALZEME: "#f97316",
  DIGER: "#6b7280",
};

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  IN: { label: "Giriş", className: "bg-green-100 text-green-800" },
  OUT: { label: "Çıkış", className: "bg-red-100 text-red-800" },
  ADJUSTMENT: { label: "Düzeltme", className: "bg-yellow-100 text-yellow-800" },
};

function getCategoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

function getUnitLabel(value: string) {
  return UNITS.find((u) => u.value === value)?.label || value;
}

function getCurrencySymbol(value: string) {
  return CURRENCIES.find((c) => c.value === value)?.symbol || "₺";
}

// --- Exchange rate cache ---
let cachedRates: ExchangeRates | null = null;

async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  // Cache for 1 hour
  if (cachedRates && now - cachedRates.fetchedAt < 3600000) {
    return cachedRates.rates;
  }
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (!res.ok) throw new Error("Kur alınamadı");
    const data = await res.json();
    cachedRates = { rates: data.rates, fetchedAt: now };
    return data.rates;
  } catch {
    return cachedRates?.rates || { TRY: 38, EUR: 0.92, USD: 1 };
  }
}

function convertToTRY(amountKurus: number, fromCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === "TRY" || !rates.TRY) return amountKurus;
  const fromRate = rates[fromCurrency] || 1;
  const tryRate = rates.TRY;
  return Math.round(amountKurus * (tryRate / fromRate));
}

function calcProfitMargin(costTRY: number, saleTRY: number): number | null {
  if (saleTRY <= 0 || costTRY <= 0) return null;
  return Math.round(((saleTRY - costTRY) / saleTRY) * 100);
}

// --- Main Page ---

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stok Takibi</h1>
        <p className="text-muted-foreground">
          Ürün, stok hareketi ve alarm yönetimi
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="movements">Stok Hareketleri</TabsTrigger>
          <TabsTrigger value="alerts">Stok Alarmları</TabsTrigger>
          <TabsTrigger value="report">Stok Raporu</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="movements">
          <MovementsTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTab />
        </TabsContent>
        <TabsContent value="report">
          <ReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// TAB 1: Products
// ============================================================

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    getExchangeRates().then(setRates);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const qs = params.toString();
      const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Ürünler alınamadı");
      const data = await res.json();
      setProducts(data);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [search, categoryFilter]);

  const handleProductClick = async (product: Product) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}`);
      if (!res.ok) throw new Error("Ürün detayı alınamadı");
      const data = await res.json();
      setSelectedProduct(data);
    } catch {
      setSelectedProduct(product);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Silme hatası");
      }
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Silme hatası");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/products/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Toplu silme hatası");
      setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch {
      // silent
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleToggleOrderAlert = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !product.orderAlert;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, orderAlert: newValue } : p))
    );
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderAlert: newValue }),
      });
      if (!res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, orderAlert: !newValue } : p))
        );
      }
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, orderAlert: !newValue } : p))
      );
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Ürün ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tümü</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            İçe Aktar
          </Button>
          <a href="/api/inventory/export" download>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Dışa Aktar
            </Button>
          </a>
          <Button onClick={() => setShowNewProduct(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2">
          <span className="text-sm font-medium text-red-800">
            {selectedIds.size} ürün seçildi
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowBulkDeleteConfirm(true)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Sil
          </Button>
        </div>
      )}

      {/* Products table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-gray-500">Yükleniyor...</p>
          ) : error ? (
            <p className="p-6 text-red-500">{error}</p>
          ) : products.length === 0 ? (
            <p className="p-6 text-gray-500">Ürün bulunamadı</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={products.length > 0 && selectedIds.size === products.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Marka</TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                    <TableHead className="text-right">Maliyet</TableHead>
                    <TableHead className="text-right">Kâr Marjı</TableHead>
                    <TableHead className="text-center">Para Birimi</TableHead>
                    <TableHead className="text-center">Sipariş</TableHead>
                    <TableHead className="text-center">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const costInTRY = convertToTRY(product.purchasePrice, product.currency, rates);
                    const margin = calcProfitMargin(costInTRY, product.salePrice);
                    const marginLow = margin !== null && margin < product.minProfitMargin;
                    return (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleProductClick(product)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={(e) => toggleSelect(product.id, e)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.brand || "—"}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge className={CATEGORY_BADGE_COLORS[product.category] || CATEGORY_BADGE_COLORS.DIGER}>
                            {getCategoryLabel(product.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.currentStock > 0 ? (
                            <>{product.currentStock} {getUnitLabel(product.unit)}</>
                          ) : (
                            <span className="text-gray-400">Stok Yok</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.salePrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.currency !== "TRY" ? (
                            <span title={`${getCurrencySymbol(product.currency)} → ₺${(costInTRY / 100).toFixed(2)}`}>
                              {getCurrencySymbol(product.currency)}{(product.purchasePrice / 100).toFixed(2)}
                            </span>
                          ) : (
                            formatCurrency(product.purchasePrice)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {margin !== null ? (
                            <span className="flex items-center justify-end gap-1">
                              {marginLow && (
                                <span title={`Kâr marjı %${product.minProfitMargin} altında`}><AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /></span>
                              )}
                              <span className={margin >= 0 ? (marginLow ? "text-yellow-600 font-medium" : "text-green-600 font-medium") : "text-red-600 font-medium"}>
                                %{margin}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {product.currency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleToggleOrderAlert(product, e)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              product.orderAlert ? "bg-green-500" : "bg-gray-300"
                            }`}
                            title={product.orderAlert ? "Sipariş hatırlatması açık" : "Sipariş hatırlatması kapalı"}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                product.orderAlert ? "translate-x-4.5" : "translate-x-0.5"
                              }`}
                              style={{ transform: product.orderAlert ? "translateX(18px)" : "translateX(2px)" }}
                            />
                          </button>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleProductClick(product)}
                              className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ürünü Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> ürününü silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(""); }}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Silme</DialogTitle>
            <DialogDescription>
              <strong>{selectedIds.size}</strong> ürünü silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? "Siliniyor..." : `${selectedIds.size} Ürünü Sil`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New product modal */}
      <NewProductDialog
        open={showNewProduct}
        onOpenChange={setShowNewProduct}
        onSuccess={fetchProducts}
      />

      {/* Import dialog */}
      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={fetchProducts}
      />

      {/* Product detail modal */}
      <Dialog open={selectedProduct !== null} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {detailLoading ? (
            <p className="text-gray-500">Yükleniyor...</p>
          ) : selectedProduct ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
                <DialogDescription>
                  SKU: {selectedProduct.sku}
                  {selectedProduct.brand && ` | Marka: ${selectedProduct.brand}`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedProduct.brand && (
                  <div>
                    <span className="text-muted-foreground">Marka:</span>{" "}
                    {selectedProduct.brand}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Kategori:</span>{" "}
                  {getCategoryLabel(selectedProduct.category)}
                </div>
                <div>
                  <span className="text-muted-foreground">Birim:</span>{" "}
                  {getUnitLabel(selectedProduct.unit)}
                </div>
                <div>
                  <span className="text-muted-foreground">Para Birimi:</span>{" "}
                  {selectedProduct.currency}
                </div>
                <div>
                  <span className="text-muted-foreground">Mevcut Stok:</span>{" "}
                  {selectedProduct.currentStock > 0 ? selectedProduct.currentStock : "Stok Yok"}
                </div>
                <div>
                  <span className="text-muted-foreground">Min Stok:</span>{" "}
                  {selectedProduct.minStock}
                </div>
                <div>
                  <span className="text-muted-foreground">Sipariş Hatırlatması:</span>{" "}
                  {selectedProduct.orderAlert ? "Açık" : "Kapalı"}
                </div>
                <div>
                  <span className="text-muted-foreground">Alış Fiyatı ({selectedProduct.currency}):</span>{" "}
                  {getCurrencySymbol(selectedProduct.currency)}{(selectedProduct.purchasePrice / 100).toFixed(2)}
                </div>
                {selectedProduct.purchasePriceUSD != null && selectedProduct.purchasePriceUSD > 0 && (
                  <div>
                    <span className="text-muted-foreground">Alış Fiyatı (USD):</span>{" "}
                    ${selectedProduct.purchasePriceUSD.toFixed(2)}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Satış Fiyatı:</span>{" "}
                  {formatCurrency(selectedProduct.salePrice)}
                </div>
                <div>
                  <span className="text-muted-foreground">Min Kâr Marjı:</span>{" "}
                  %{selectedProduct.minProfitMargin}
                </div>
                {(() => {
                  const costTRY = convertToTRY(selectedProduct.purchasePrice, selectedProduct.currency, rates);
                  const margin = calcProfitMargin(costTRY, selectedProduct.salePrice);
                  if (margin === null) return null;
                  const marginLow = margin < selectedProduct.minProfitMargin;
                  return (
                    <div>
                      <span className="text-muted-foreground">Kâr Marjı:</span>{" "}
                      <span className={marginLow ? "text-yellow-600 font-semibold" : margin >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        %{margin}
                        {marginLow && " (Düşük!)"}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Movement history */}
              {selectedProduct.movements && selectedProduct.movements.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 font-semibold">Hareket Geçmişi</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead className="text-right">Miktar</TableHead>
                        <TableHead className="text-right">Fiyat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProduct.movements.map((m) => {
                        const typeBadge = TYPE_BADGE[m.type] || TYPE_BADGE.ADJUSTMENT;
                        return (
                          <TableRow key={m.id}>
                            <TableCell>{formatDate(m.date)}</TableCell>
                            <TableCell>
                              <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{m.quantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(m.totalPrice)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- New Product Dialog ---

function NewProductDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    sku: "",
    brand: "",
    category: "DIGER",
    unit: "ADET",
    currentStock: 0,
    minStock: 0,
    orderAlert: false,
    purchasePrice: 0,
    purchasePriceUSD: "",
    currency: "TRY",
    minProfitMargin: 20,
    salePrice: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => setForm({
    name: "",
    sku: "",
    brand: "",
    category: "DIGER",
    unit: "ADET",
    currentStock: 0,
    minStock: 0,
    orderAlert: false,
    purchasePrice: 0,
    purchasePriceUSD: "",
    currency: "TRY",
    minProfitMargin: 20,
    salePrice: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          brand: form.brand || null,
          purchasePrice: toKurus(form.purchasePrice),
          purchasePriceUSD: form.purchasePriceUSD ? parseFloat(form.purchasePriceUSD) : null,
          salePrice: toKurus(form.salePrice),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ürün oluşturulamadı");
      }

      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Ürün</DialogTitle>
          <DialogDescription>Yeni bir ürün ekleyin</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ürün Adı</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU Kodu</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marka</Label>
              <Input
                id="brand"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Para Birimi</Label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Birim</Label>
              <select
                id="unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentStock">Mevcut Stok</Label>
              <Input
                id="currentStock"
                type="number"
                min={0}
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Minimum Stok</Label>
              <Input
                id="minStock"
                type="number"
                min={0}
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Alış Fiyatı ({getCurrencySymbol(form.currency)})</Label>
              <Input
                id="purchasePrice"
                type="number"
                min={0}
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Satış Fiyatı (₺)</Label>
              <Input
                id="salePrice"
                type="number"
                min={0}
                step="0.01"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })}
              />
            </div>
          </div>
          {form.currency !== "TRY" && (
            <div className="space-y-2">
              <Label htmlFor="purchasePriceUSD">Alış Fiyatı (USD)</Label>
              <Input
                id="purchasePriceUSD"
                type="number"
                min={0}
                step="0.01"
                placeholder="Opsiyonel"
                value={form.purchasePriceUSD}
                onChange={(e) => setForm({ ...form, purchasePriceUSD: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="minProfitMargin">Min Kâr Marjı (%)</Label>
            <Input
              id="minProfitMargin"
              type="number"
              min={0}
              max={100}
              value={form.minProfitMargin}
              onChange={(e) => setForm({ ...form, minProfitMargin: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="orderAlert"
              checked={form.orderAlert}
              onChange={(e) => setForm({ ...form, orderAlert: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="orderAlert" className="text-sm font-normal cursor-pointer">
              Sipariş hatırlatması aktif
            </Label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Import Dialog ---

interface ImportPreview {
  columns: string[];
  preview: Record<string, any>[];
  totalRows: number;
}

interface ImportResult {
  added: number;
  updated: number;
  errors: number;
  total: number;
}

const MAPPING_FIELDS = [
  { key: "name", label: "Ürün Adı", required: true },
  { key: "brand", label: "Marka", required: false },
  { key: "category", label: "Kategori", required: false },
  { key: "quantity", label: "Miktar / Stok", required: false },
  { key: "unit", label: "Birim", required: false },
  { key: "purchasePrice", label: "Alış Fiyatı TL", required: false },
  { key: "purchasePriceUSD", label: "Alış Fiyatı USD", required: false },
  { key: "salePrice", label: "Satış Fiyatı", required: false },
  { key: "minStock", label: "Minimum Stok", required: false },
  { key: "currency", label: "Para Birimi", required: false },
];

function ImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "result">("upload");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  function reset() {
    setStep("upload");
    setPreview(null);
    setMapping({});
    setResult(null);
    setError("");
    setUploading(false);
    setImportFile(null);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validExts = [".xlsx", ".xls", ".csv"];
    if (!validExts.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setError("Desteklenmeyen format. Excel (.xlsx) veya CSV (.csv) yükleyin.");
      return;
    }

    setUploading(true);
    setError("");
    setImportFile(file);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Dosya okunamadı");
        return;
      }

      setPreview(data);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      const cols = data.columns as string[];
      for (const field of MAPPING_FIELDS) {
        const match = cols.find((c) => {
          const cl = c.toLowerCase();
          if (field.key === "name") return cl.includes("ürün") || cl.includes("urun") || cl.includes("ad") || cl === "name" || cl === "product";
          if (field.key === "brand") return cl.includes("marka") || cl.includes("brand");
          if (field.key === "category") return cl.includes("kategori") || cl.includes("category");
          if (field.key === "quantity") return cl.includes("miktar") || cl.includes("stok") || cl.includes("quantity") || cl.includes("stock");
          if (field.key === "unit") return cl.includes("birim") || cl.includes("unit");
          if (field.key === "purchasePrice") return (cl.includes("alış") || cl.includes("alis") || cl.includes("purchase")) && cl.includes("tl");
          if (field.key === "purchasePriceUSD") return (cl.includes("alış") || cl.includes("alis") || cl.includes("purchase")) && cl.includes("usd");
          if (field.key === "salePrice") return cl.includes("satış") || cl.includes("satis") || cl.includes("sale");
          if (field.key === "minStock") return cl.includes("min") || cl.includes("minimum");
          if (field.key === "currency") return cl.includes("para") || cl.includes("döviz") || cl.includes("currency");
          return false;
        });
        if (match) autoMapping[field.key] = match;
      }
      setMapping(autoMapping);
      setStep("mapping");
    } catch {
      setError("Dosya yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  }

  async function handleImport() {
    if (!importFile || !mapping.name) return;

    setStep("importing");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "İçe aktarma hatası");
        setStep("mapping");
        return;
      }

      setResult(data);
      setStep("result");
      onSuccess();
    } catch {
      setError("İçe aktarma sırasında hata oluştu");
      setStep("mapping");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Stok Verisi İçe Aktar
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Excel (.xlsx) veya CSV (.csv) dosyası yükleyin"}
            {step === "mapping" && "Sütunları eşleştirin ve verileri kontrol edin"}
            {step === "importing" && "Veriler içe aktarılıyor..."}
            {step === "result" && "İçe aktarma tamamlandı"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">Dosya okunuyor...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Dosya seçin veya sürükleyin</p>
                    <p className="text-xs text-gray-400">Excel (.xlsx) veya CSV (.csv)</p>
                  </div>
                  <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Dosya Seç
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {step === "mapping" && preview && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm text-blue-700">
                <strong>{preview.totalRows}</strong> satır bulundu. Sütunları eşleştirin:
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MAPPING_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </Label>
                  <select
                    value={mapping[field.key] || ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="">— Seçin —</option>
                    {preview.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Önizleme (ilk 5 satır)</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.preview.map((row, i) => (
                      <tr key={i}>
                        {preview.columns.map((col) => (
                          <td key={col} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => reset()}>Geri</Button>
              <Button onClick={handleImport} disabled={!mapping.name}>
                <ArrowRight className="mr-2 h-4 w-4" />
                İçe Aktar ({preview.totalRows} satır)
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-600">Veriler içe aktarılıyor...</p>
            <p className="text-xs text-gray-400">Bu işlem birkaç saniye sürebilir</p>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-800">İçe aktarma tamamlandı</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.added}</p>
                  <p className="text-xs text-gray-500">Yeni eklendi</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                  <p className="text-xs text-gray-500">Güncellendi</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className={`text-2xl font-bold ${result.errors > 0 ? "text-red-600" : "text-gray-400"}`}>{result.errors}</p>
                  <p className="text-xs text-gray-500">Hatalı</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Kapat</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// TAB 2: Stock Movements
// ============================================================

function MovementsTab() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const qs = params.toString();
      const res = await fetch(`/api/stock-movements${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Hareketler alınamadı");
      const data = await res.json();
      setMovements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [startDate, endDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Başlangıç</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bitiş</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowStockIn(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Stok Girişi
          </Button>
          <Button onClick={() => setShowStockOut(true)} variant="destructive">
            <Plus className="mr-2 h-4 w-4" />
            Stok Çıkışı
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-gray-500">Yükleniyor...</p>
          ) : error ? (
            <p className="p-6 text-red-500">{error}</p>
          ) : movements.length === 0 ? (
            <p className="p-6 text-gray-500">Stok hareketi bulunamadı</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Birim Fiyat</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Toplam</TableHead>
                  <TableHead className="hidden md:table-cell">Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const typeBadge = TYPE_BADGE[m.type] || TYPE_BADGE.ADJUSTMENT;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.date)}</TableCell>
                      <TableCell className="font-medium">{m.product?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.quantity} {m.product?.unit ? getUnitLabel(m.product.unit) : ""}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{formatCurrency(m.unitPrice)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{formatCurrency(m.totalPrice)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{m.description || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StockMovementDialog open={showStockIn} onOpenChange={setShowStockIn} type="IN" onSuccess={fetchMovements} />
      <StockMovementDialog open={showStockOut} onOpenChange={setShowStockOut} type="OUT" onSuccess={fetchMovements} />
    </div>
  );
}

// --- Stock Movement Dialog ---

function StockMovementDialog({
  open, onOpenChange, type, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "IN" | "OUT";
  onSuccess: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    productId: "", quantity: 1, unitPrice: 0, description: "", reference: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/products?active=true")
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setProducts(data); })
        .catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type, unitPrice: toKurus(form.unitPrice) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Hareket oluşturulamadı");
      }
      onOpenChange(false);
      setForm({ productId: "", quantity: 1, unitPrice: 0, description: "", reference: "", date: new Date().toISOString().split("T")[0] });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "IN" ? "Stok Girişi" : "Stok Çıkışı"}</DialogTitle>
          <DialogDescription>{type === "IN" ? "Stoğa ürün girişi yapın" : "Stoktan ürün çıkışı yapın"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Ürün</Label>
            <select id="productId" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Ürün seçin...</option>
              {products.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.sku})</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Miktar</Label>
              <Input id="quantity" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Birim Fiyat (TL)</Label>
              <Input id="unitPrice" type="number" min={0} step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opsiyonel açıklama..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Referans / Fatura No</Label>
              <Input id="reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Opsiyonel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={saving} className={type === "IN" ? "bg-green-600 hover:bg-green-700" : ""} variant={type === "OUT" ? "destructive" : "default"}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// TAB 3: Stock Alerts
// ============================================================

function AlertsTab() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderNote, setOrderNote] = useState<{ productId: string; name: string } | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    async function fetchLowStock() {
      try {
        setLoading(true);
        const res = await fetch("/api/products/low-stock");
        if (!res.ok) throw new Error("Düşük stok verileri alınamadı");
        const data = await res.json();
        setLowStockProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchLowStock();
  }, []);

  if (loading) return <p className="text-gray-500">Yükleniyor...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  if (lowStockProducts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 p-6">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Tüm ürünler yeterli stokta</p>
            <p className="text-sm text-green-600">Sipariş hatırlatması açık ürünlerde düşük stok bulunmuyor.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span>{lowStockProducts.length} ürün düşük stokta</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lowStockProducts.map((product) => {
          const deficit = product.minStock - product.currentStock;
          return (
            <Card key={product.id} className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-red-900">{product.name}</p>
                    <p className="text-xs text-red-700">SKU: {product.sku}</p>
                  </div>
                  <Badge className={CATEGORY_BADGE_COLORS[product.category] || CATEGORY_BADGE_COLORS.DIGER}>
                    {getCategoryLabel(product.category)}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-700">Mevcut Stok:</span>
                    <span className="font-medium text-red-900">{product.currentStock} {getUnitLabel(product.unit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Min Stok:</span>
                    <span className="font-medium text-red-900">{product.minStock} {getUnitLabel(product.unit)}</span>
                  </div>
                  {deficit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-700">Eksik:</span>
                      <span className="font-bold text-red-900">{deficit} {getUnitLabel(product.unit)}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" className="mt-3 w-full" variant="outline"
                  onClick={() => setOrderNote({ productId: product.id, name: product.name })}>
                  <Package className="mr-2 h-4 w-4" />
                  Sipariş Ver
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={orderNote !== null} onOpenChange={(open) => { if (!open) setOrderNote(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sipariş Notu</DialogTitle>
            <DialogDescription>{orderNote?.name} için sipariş notu ekleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderNote">Not</Label>
              <Textarea id="orderNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sipariş detayları, tedarikçi bilgileri vb." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOrderNote(null); setNote(""); }}>Kapat</Button>
            <Button onClick={() => { setOrderNote(null); setNote(""); }}>Tamam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// TAB 4: Stock Report
// ============================================================

function ReportTab() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await fetch("/api/stock/summary");
        if (!res.ok) throw new Error("Rapor verileri alınamadı");
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) return <p className="text-gray-500">Yükleniyor...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!summary) return null;

  const pieData = summary.categoryDistribution.map((cd) => ({
    name: getCategoryLabel(cd.category),
    value: cd.count,
    fill: CATEGORY_PIE_COLORS[cd.category] || CATEGORY_PIE_COLORS.DIGER,
  }));

  const barData = [
    { name: "Giriş", value: summary.recentMovements.in, fill: "#22c55e" },
    { name: "Çıkış", value: summary.recentMovements.out, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Toplam Ürün</p>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Aktif Ürün</p>
            <p className="text-2xl font-bold text-blue-600">{summary.activeProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Düşük Stok</p>
            <p className={`text-2xl font-bold ${summary.lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.lowStockCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Toplam Stok Değeri</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalStockValue.purchase)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kategori Dağılımı</CardTitle>
            <CardDescription>Ürün kategorilerine göre dağılım</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="name">
                    {pieData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son 30 Gün Hareketler</CardTitle>
            <CardDescription>Giriş ve çıkış hareketleri</CardDescription>
          </CardHeader>
          <CardContent>
            {barData.every((d) => d.value === 0) ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En Çok Tüketilen Ürünler</CardTitle>
          <CardDescription>Son 30 günde en çok çıkış yapılan ürünler</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.topConsumed.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz veri bulunmuyor</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sıra</TableHead>
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead className="text-right">Toplam Çıkış Miktarı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.topConsumed.map((item, index) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right font-medium">{item.totalOut}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
