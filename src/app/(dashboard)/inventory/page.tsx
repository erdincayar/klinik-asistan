"use client";

import { useEffect, useState } from "react";
import { Plus, Search, AlertTriangle, CheckCircle, Package } from "lucide-react";
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
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  purchasePrice: number;
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
        <Button onClick={() => setShowNewProduct(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Ürün
        </Button>
      </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Mevcut Stok</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Min Stok</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Alış Fiyatı</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Satış Fiyatı</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const isLow = product.currentStock <= product.minStock;
                  return (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleProductClick(product)}
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {product.sku}
                      </TableCell>
                      <TableCell>
                        <Badge className={CATEGORY_BADGE_COLORS[product.category] || CATEGORY_BADGE_COLORS.DIGER}>
                          {getCategoryLabel(product.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {product.currentStock} {getUnitLabel(product.unit)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        {product.minStock} {getUnitLabel(product.unit)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right">
                        {formatCurrency(product.purchasePrice)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right">
                        {formatCurrency(product.salePrice)}
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge className="bg-red-100 text-red-800">Düşük Stok</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Yeterli</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New product modal */}
      <NewProductDialog
        open={showNewProduct}
        onOpenChange={setShowNewProduct}
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
                <DialogDescription>SKU: {selectedProduct.sku}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Kategori:</span>{" "}
                  {getCategoryLabel(selectedProduct.category)}
                </div>
                <div>
                  <span className="text-muted-foreground">Birim:</span>{" "}
                  {getUnitLabel(selectedProduct.unit)}
                </div>
                <div>
                  <span className="text-muted-foreground">Mevcut Stok:</span>{" "}
                  {selectedProduct.currentStock}
                </div>
                <div>
                  <span className="text-muted-foreground">Min Stok:</span>{" "}
                  {selectedProduct.minStock}
                </div>
                <div>
                  <span className="text-muted-foreground">Alış Fiyatı:</span>{" "}
                  {formatCurrency(selectedProduct.purchasePrice)}
                </div>
                <div>
                  <span className="text-muted-foreground">Satış Fiyatı:</span>{" "}
                  {formatCurrency(selectedProduct.salePrice)}
                </div>
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
    category: "DIGER",
    unit: "ADET",
    currentStock: 0,
    minStock: 0,
    purchasePrice: 0,
    salePrice: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
          purchasePrice: toKurus(form.purchasePrice),
          salePrice: toKurus(form.salePrice),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ürün oluşturulamadı");
      }

      onOpenChange(false);
      setForm({
        name: "",
        sku: "",
        category: "DIGER",
        unit: "ADET",
        currentStock: 0,
        minStock: 0,
        purchasePrice: 0,
        salePrice: 0,
      });
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
              <Label htmlFor="purchasePrice">Alış Fiyatı (TL)</Label>
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
              <Label htmlFor="salePrice">Satış Fiyatı (TL)</Label>
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
      {/* Filters and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Başlangıç</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bitiş</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowStockIn(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Stok Girişi
          </Button>
          <Button
            onClick={() => setShowStockOut(true)}
            variant="destructive"
          >
            <Plus className="mr-2 h-4 w-4" />
            Stok Çıkışı
          </Button>
        </div>
      </div>

      {/* Movements table */}
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
                      <TableCell className="font-medium">
                        {m.product?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.quantity} {m.product?.unit ? getUnitLabel(m.product.unit) : ""}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">
                        {formatCurrency(m.unitPrice)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">
                        {formatCurrency(m.totalPrice)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {m.description || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stock In modal */}
      <StockMovementDialog
        open={showStockIn}
        onOpenChange={setShowStockIn}
        type="IN"
        onSuccess={fetchMovements}
      />

      {/* Stock Out modal */}
      <StockMovementDialog
        open={showStockOut}
        onOpenChange={setShowStockOut}
        type="OUT"
        onSuccess={fetchMovements}
      />
    </div>
  );
}

// --- Stock Movement Dialog ---

function StockMovementDialog({
  open,
  onOpenChange,
  type,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "IN" | "OUT";
  onSuccess: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    productId: "",
    quantity: 1,
    unitPrice: 0,
    description: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/products?active=true")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setProducts(data);
        })
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
        body: JSON.stringify({
          ...form,
          type,
          unitPrice: toKurus(form.unitPrice),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Hareket oluşturulamadı");
      }

      onOpenChange(false);
      setForm({
        productId: "",
        quantity: 1,
        unitPrice: 0,
        description: "",
        reference: "",
        date: new Date().toISOString().split("T")[0],
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const title = type === "IN" ? "Stok Girişi" : "Stok Çıkışı";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {type === "IN" ? "Stoğa ürün girişi yapın" : "Stoktan ürün çıkışı yapın"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Ürün</Label>
            <select
              id="productId"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Ürün seçin...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Miktar</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Birim Fiyat (TL)</Label>
              <Input
                id="unitPrice"
                type="number"
                min={0}
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Opsiyonel açıklama..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Referans / Fatura No</Label>
              <Input
                id="reference"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className={type === "IN" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={type === "OUT" ? "destructive" : "default"}
            >
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
            <p className="text-sm text-green-600">
              Stok seviyesi düşük ürün bulunmuyor.
            </p>
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
                    <span className="font-medium text-red-900">
                      {product.currentStock} {getUnitLabel(product.unit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Min Stok:</span>
                    <span className="font-medium text-red-900">
                      {product.minStock} {getUnitLabel(product.unit)}
                    </span>
                  </div>
                  {deficit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-700">Eksik:</span>
                      <span className="font-bold text-red-900">
                        {deficit} {getUnitLabel(product.unit)}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={() =>
                    setOrderNote({ productId: product.id, name: product.name })
                  }
                >
                  <Package className="mr-2 h-4 w-4" />
                  Sipariş Ver
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order note dialog */}
      <Dialog open={orderNote !== null} onOpenChange={(open) => { if (!open) setOrderNote(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sipariş Notu</DialogTitle>
            <DialogDescription>
              {orderNote?.name} için sipariş notu ekleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderNote">Not</Label>
              <Textarea
                id="orderNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Sipariş detayları, tedarikçi bilgileri vb."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOrderNote(null); setNote(""); }}>
              Kapat
            </Button>
            <Button onClick={() => { setOrderNote(null); setNote(""); }}>
              Tamam
            </Button>
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
      {/* Summary cards */}
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
            <p
              className={`text-2xl font-bold ${
                summary.lowStockCount > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {summary.lowStockCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Toplam Stok Değeri</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalStockValue.purchase)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category pie chart */}
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
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent movements bar chart */}
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
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top consumed products */}
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
