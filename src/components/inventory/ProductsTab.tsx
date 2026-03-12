"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Search, AlertTriangle, CheckCircle, Upload, Download,
  Loader2, FileSpreadsheet, ArrowRight, Trash2, Pencil, Tag, Camera, ChevronDown, Eye,
  Settings, GripVertical, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, toKurus, fromKurus } from "@/lib/utils";
import {
  Product, TYPE_BADGE, CATEGORIES, UNITS, CURRENCIES,
  CATEGORY_BADGE_COLORS, getCategoryLabel, getUnitLabel, getCurrencySymbol, calcProfitMargin,
  DEFAULT_COLUMNS, ColumnConfig, CustomColumn,
} from "./constants";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";

// ─── Main ProductsTab ───

export default function ProductsTab({ onDataChange }: { onDataChange?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAIExtract, setShowAIExtract] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkBrand, setShowBulkBrand] = useState(false);
  const [bulkBrandValue, setBulkBrandValue] = useState("");
  const [bulkBrandSaving, setBulkBrandSaving] = useState(false);
  const [brandEditTarget, setBrandEditTarget] = useState<Product | null>(null);
  const [brandEditValue, setBrandEditValue] = useState("");
  const [brandEditSaving, setBrandEditSaving] = useState(false);
  const [importNoBrandNotice, setImportNoBrandNotice] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig>({
    order: DEFAULT_COLUMNS.map((c) => c.key),
    hidden: [],
    customColumns: [],
  });
  const [showColumnManager, setShowColumnManager] = useState(false);

  const existingBrands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean) as string[])).sort();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    }
    if (showAddMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddMenu]);

  // Fetch column config
  useEffect(() => {
    async function fetchColumnConfig() {
      try {
        const res = await fetch("/api/inventory/column-config");
        if (res.ok) {
          const data = await res.json();
          if (data.columns) setColumnConfig(data.columns);
        }
      } catch {
        // use default config
      }
    }
    fetchColumnConfig();
  }, []);

  // Compute visible columns
  const visibleColumns = columnConfig.order
    .filter((key) => !columnConfig.hidden.includes(key))
    .filter((key) => {
      // Keep if it's a default column or a custom column
      return DEFAULT_COLUMNS.some((d) => d.key === key) || columnConfig.customColumns.some((c) => c.id === key);
    });
  // Ensure "actions" is always last
  const orderedColumns = visibleColumns.filter((k) => k !== "actions");
  if (visibleColumns.includes("actions")) orderedColumns.push("actions");

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (brandFilter) params.set("brand", brandFilter);
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
  }, [search, categoryFilter, brandFilter]);

  // Fetch unique brands for filter
  useEffect(() => {
    async function fetchBrands() {
      try {
        const res = await fetch("/api/products?active=all");
        if (!res.ok) return;
        const data: Product[] = await res.json();
        const brands = Array.from(new Set(data.map((p) => p.brand).filter(Boolean) as string[])).sort();
        setBrandOptions(brands);
      } catch { /* ignore */ }
    }
    fetchBrands();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

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
      onDataChange?.();
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
      onDataChange?.();
    } catch {
      // silent
    } finally {
      setBulkDeleting(false);
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

  const handleBulkBrandAssign = async () => {
    if (!bulkBrandValue.trim() || selectedIds.size === 0) return;
    setBulkBrandSaving(true);
    try {
      const res = await fetch("/api/products/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), data: { brand: bulkBrandValue.trim() } }),
      });
      if (!res.ok) throw new Error("Toplu güncelleme hatası");
      setProducts((prev) =>
        prev.map((p) => selectedIds.has(p.id) ? { ...p, brand: bulkBrandValue.trim() } : p)
      );
      setShowBulkBrand(false);
      setBulkBrandValue("");
      setSelectedIds(new Set());
    } catch {
      // silent
    } finally {
      setBulkBrandSaving(false);
    }
  };

  const handleInlineBrandSave = async () => {
    if (!brandEditTarget) return;
    setBrandEditSaving(true);
    try {
      const res = await fetch(`/api/products/${brandEditTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brandEditValue.trim() || null }),
      });
      if (!res.ok) throw new Error("Marka güncelleme hatası");
      setProducts((prev) =>
        prev.map((p) => p.id === brandEditTarget.id ? { ...p, brand: brandEditValue.trim() || null } : p)
      );
      setBrandEditTarget(null);
      setBrandEditValue("");
    } catch {
      // silent
    } finally {
      setBrandEditSaving(false);
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
            <option value="">Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {brandOptions.length > 0 && (
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Marka</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowColumnManager(true)} title="Kolonları Düzenle">
            <Settings className="h-4 w-4" />
          </Button>
          <a href="/api/products/export" download>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Dışa Aktar
            </Button>
          </a>
          <div className="relative" ref={addMenuRef}>
            <Button onClick={() => setShowAddMenu(!showAddMenu)}>
              <Plus className="mr-2 h-4 w-4" />
              Ürün Ekle
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
            {showAddMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
                <button
                  onClick={() => { setShowNewProduct(true); setShowAddMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <Pencil className="h-4 w-4" /> Manuel
                </button>
                <button
                  onClick={() => { setShowImport(true); setShowAddMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel / CSV
                </button>
                <button
                  onClick={() => { setShowAIExtract(true); setShowAddMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <Camera className="h-4 w-4" /> Fotoğraf AI
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import no-brand notice */}
      {importNoBrandNotice > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2">
          <span className="text-sm text-yellow-800">
            <strong>{importNoBrandNotice}</strong> ürünün markası boş. Şimdi atamak ister misiniz?
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const noBrandIds = new Set(products.filter((p) => !p.brand).map((p) => p.id));
              setSelectedIds(noBrandIds);
              setShowBulkBrand(true);
              setImportNoBrandNotice(0);
            }}>
              <Tag className="mr-1 h-3.5 w-3.5" /> Marka Ata
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setImportNoBrandNotice(0)}>Kapat</Button>
          </div>
        </div>
      )}

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} ürün seçildi</span>
          <Button size="sm" variant="outline" onClick={() => setShowBulkBrand(true)}>
            <Tag className="mr-1 h-3.5 w-3.5" /> Marka Ata
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Sil
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
                    {orderedColumns.map((key) => {
                      const def = DEFAULT_COLUMNS.find((d) => d.key === key);
                      const custom = columnConfig.customColumns.find((c) => c.id === key);
                      const label = def?.label || custom?.name || key;
                      const isRight = ["stock", "purchasePriceTRY", "purchasePriceFX", "salePriceTRY", "salePriceFX", "profitMargin"].includes(key);
                      const isCenter = key === "actions";
                      return (
                        <TableHead key={key} className={isCenter ? "text-center" : isRight ? "text-right" : ""}>
                          {label}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const margin = calcProfitMargin(product.purchasePrice, product.salePrice);
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
                        {orderedColumns.map((key) => {
                          // Default columns
                          if (key === "brand") return (
                            <TableCell key={key} className="text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                              {product.brand ? product.brand : (
                                <button onClick={() => { setBrandEditTarget(product); setBrandEditValue(""); }} className="text-xs text-blue-500 hover:text-blue-700 hover:underline">+ Marka Ekle</button>
                              )}
                            </TableCell>
                          );
                          if (key === "name") return <TableCell key={key} className="font-medium">{product.name}</TableCell>;
                          if (key === "sku") return <TableCell key={key} className="text-muted-foreground text-xs">{product.sku}</TableCell>;
                          if (key === "category") return (
                            <TableCell key={key}>
                              <Badge className={CATEGORY_BADGE_COLORS[product.category] || "bg-gray-100 text-gray-800"}>{getCategoryLabel(product.category)}</Badge>
                            </TableCell>
                          );
                          if (key === "stock") return (
                            <TableCell key={key} className="text-right">
                              {product.currentStock === null || product.currentStock === undefined
                                ? <span className="text-gray-400">-</span>
                                : product.currentStock === 0
                                  ? <span className="text-gray-400">0</span>
                                  : <>{product.currentStock} {getUnitLabel(product.unit)}</>}
                            </TableCell>
                          );
                          if (key === "purchasePriceTRY") return <TableCell key={key} className="text-right">{formatCurrency(product.purchasePrice)}</TableCell>;
                          if (key === "purchasePriceFX") return (
                            <TableCell key={key} className="text-right">
                              {product.currency !== "TRY" && product.purchasePriceUSD ? (
                                <span className="text-muted-foreground text-xs">{getCurrencySymbol(product.currency)}{product.purchasePriceUSD.toFixed(2)}</span>
                              ) : <span className="text-gray-300">&mdash;</span>}
                            </TableCell>
                          );
                          if (key === "salePriceTRY") return <TableCell key={key} className="text-right">{formatCurrency(product.salePrice)}</TableCell>;
                          if (key === "salePriceFX") return (
                            <TableCell key={key} className="text-right">
                              {product.saleCurrency !== "TRY" && product.salePriceUSD ? (
                                <span className="text-muted-foreground text-xs">{getCurrencySymbol(product.saleCurrency)}{product.salePriceUSD.toFixed(2)}</span>
                              ) : <span className="text-gray-300">&mdash;</span>}
                            </TableCell>
                          );
                          if (key === "profitMargin") return (
                            <TableCell key={key} className="text-right">
                              {margin !== null ? (
                                <span className="flex items-center justify-end gap-1">
                                  {marginLow && <span title={`Kâr marjı %${product.minProfitMargin} altında`}><AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /></span>}
                                  <span className={margin >= 0 ? (marginLow ? "text-yellow-600 font-medium" : "text-green-600 font-medium") : "text-red-600 font-medium"}>%{margin}</span>
                                </span>
                              ) : <span className="text-gray-300">&mdash;</span>}
                            </TableCell>
                          );
                          if (key === "currency") return <TableCell key={key}>{product.currency}</TableCell>;
                          if (key === "orderAlert") return (
                            <TableCell key={key}>
                              {product.orderAlert ? <Badge className="bg-green-100 text-green-800">Aktif</Badge> : <span className="text-gray-300">&mdash;</span>}
                            </TableCell>
                          );
                          if (key === "actions") return (
                            <TableCell key={key} className="text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleProductClick(product)} className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors" title="Detay"><Eye className="h-4 w-4" /></button>
                                <button onClick={() => setEditProduct(product)} className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Düzenle"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => setDeleteTarget(product)} className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Sil"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </TableCell>
                          );
                          // Custom columns
                          const customCol = columnConfig.customColumns.find((c) => c.id === key);
                          if (customCol) {
                            // For cf_ prefixed columns, lookup by name in customFields; otherwise by id
                            const cfKey = key.startsWith("cf_") ? customCol.name : key;
                            const val = product.customFields?.[cfKey];
                            return (
                              <TableCell key={key}>
                                {customCol.type === "boolean" ? (val ? "Evet" : "Hayır") :
                                  customCol.type === "number" && val != null ? String(val) :
                                  customCol.type === "date" && val ? formatDate(val) :
                                  val != null ? String(val) : <span className="text-gray-300">&mdash;</span>}
                              </TableCell>
                            );
                          }
                          return <TableCell key={key}>&mdash;</TableCell>;
                        })}
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
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(""); }}>İptal</Button>
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
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? "Siliniyor..." : `${selectedIds.size} Ürünü Sil`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New product modal */}
      <NewProductDialog open={showNewProduct} onOpenChange={setShowNewProduct} onSuccess={fetchProducts} />

      {/* Edit product modal */}
      <EditProductDialog
        product={editProduct}
        onOpenChange={(open) => { if (!open) setEditProduct(null); }}
        onSuccess={fetchProducts}
        customColumns={columnConfig.customColumns}
      />

      {/* Import dialog */}
      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={fetchProducts}
        onComplete={(n) => { if (n > 0) setImportNoBrandNotice(n); }}
      />

      {/* AI Extract dialog */}
      <AIExtractDialog open={showAIExtract} onOpenChange={setShowAIExtract} onSuccess={fetchProducts} />

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
                  <div><span className="text-muted-foreground">Marka:</span> {selectedProduct.brand}</div>
                )}
                <div><span className="text-muted-foreground">Kategori:</span> {getCategoryLabel(selectedProduct.category)}</div>
                <div><span className="text-muted-foreground">Birim:</span> {getUnitLabel(selectedProduct.unit)}</div>
                <div><span className="text-muted-foreground">Para Birimi:</span> {selectedProduct.currency}</div>
                <div><span className="text-muted-foreground">Mevcut Stok:</span> {selectedProduct.currentStock === null || selectedProduct.currentStock === undefined ? "-" : selectedProduct.currentStock}</div>
                <div><span className="text-muted-foreground">Min Stok:</span> {selectedProduct.minStock}</div>
                <div><span className="text-muted-foreground">Alış Fiyatı (TRY):</span> {formatCurrency(selectedProduct.purchasePrice)}</div>
                {selectedProduct.currency !== "TRY" && selectedProduct.purchasePriceUSD != null && selectedProduct.purchasePriceUSD > 0 && (
                  <div><span className="text-muted-foreground">Orijinal Alış ({selectedProduct.currency}):</span> {getCurrencySymbol(selectedProduct.currency)}{selectedProduct.purchasePriceUSD.toFixed(2)}</div>
                )}
                <div><span className="text-muted-foreground">Satış Fiyatı:</span> {formatCurrency(selectedProduct.salePrice)}</div>
                {selectedProduct.saleCurrency !== "TRY" && selectedProduct.salePriceUSD != null && selectedProduct.salePriceUSD > 0 && (
                  <div><span className="text-muted-foreground">Orijinal Satış ({selectedProduct.saleCurrency}):</span> {getCurrencySymbol(selectedProduct.saleCurrency)}{selectedProduct.salePriceUSD.toFixed(2)}</div>
                )}
                <div><span className="text-muted-foreground">Min Kâr Marjı:</span> %{selectedProduct.minProfitMargin}</div>
                {(() => {
                  const margin = calcProfitMargin(selectedProduct.purchasePrice, selectedProduct.salePrice);
                  if (margin === null) return null;
                  const marginLow = margin < selectedProduct.minProfitMargin;
                  return (
                    <div>
                      <span className="text-muted-foreground">Kâr Marjı:</span>{" "}
                      <span className={marginLow ? "text-yellow-600 font-semibold" : margin >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        %{margin}{marginLow && " (Düşük!)"}
                      </span>
                    </div>
                  );
                })()}
              </div>

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
                            <TableCell><Badge className={typeBadge.className}>{typeBadge.label}</Badge></TableCell>
                            <TableCell className="text-right">{m.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(m.totalPrice)}</TableCell>
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

      {/* Bulk brand assignment modal */}
      <Dialog open={showBulkBrand} onOpenChange={(open) => { if (!open) { setShowBulkBrand(false); setBulkBrandValue(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marka Ata</DialogTitle>
            <DialogDescription><strong>{selectedIds.size}</strong> ürüne marka atayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {existingBrands.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mevcut markalardan seç</Label>
                <div className="flex flex-wrap gap-2">
                  {existingBrands.map((b) => (
                    <button key={b} onClick={() => setBulkBrandValue(b)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${bulkBrandValue === b ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"}`}
                    >{b}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="bulkBrand">{existingBrands.length > 0 ? "veya yeni marka yaz" : "Marka adı"}</Label>
              <Input id="bulkBrand" value={bulkBrandValue} onChange={(e) => setBulkBrandValue(e.target.value)} placeholder="Marka adı girin..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkBrand(false); setBulkBrandValue(""); }}>İptal</Button>
            <Button onClick={handleBulkBrandAssign} disabled={bulkBrandSaving || !bulkBrandValue.trim()}>
              {bulkBrandSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline brand edit modal */}
      <Dialog open={brandEditTarget !== null} onOpenChange={(open) => { if (!open) { setBrandEditTarget(null); setBrandEditValue(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marka Ekle</DialogTitle>
            <DialogDescription>{brandEditTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {existingBrands.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mevcut markalar</Label>
                <div className="flex flex-wrap gap-2">
                  {existingBrands.map((b) => (
                    <button key={b} onClick={() => setBrandEditValue(b)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${brandEditValue === b ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"}`}
                    >{b}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="inlineBrand">Marka</Label>
              <Input id="inlineBrand" value={brandEditValue} onChange={(e) => setBrandEditValue(e.target.value)} placeholder="Marka adı..." autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInlineBrandSave(); } }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBrandEditTarget(null); setBrandEditValue(""); }}>İptal</Button>
            <Button onClick={handleInlineBrandSave} disabled={brandEditSaving || !brandEditValue.trim()}>
              {brandEditSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column manager dialog */}
      <ColumnManagerDialog
        open={showColumnManager}
        onOpenChange={setShowColumnManager}
        columnConfig={columnConfig}
        onSave={(config) => { setColumnConfig(config); setShowColumnManager(false); }}
        products={products}
      />
    </div>
  );
}

// ─── New Product Dialog ───

function NewProductDialog({
  open, onOpenChange, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "", sku: "", brand: "", category: "DIGER", unit: "ADET",
    currentStock: 0, minStock: 0, orderAlert: false,
    purchasePrice: 0, purchasePriceUSD: "", currency: "TRY",
    minProfitMargin: 20, salePrice: 0, salePriceUSD: "", saleCurrency: "TRY",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => setForm({
    name: "", sku: "", brand: "", category: "DIGER", unit: "ADET",
    currentStock: 0, minStock: 0, orderAlert: false,
    purchasePrice: 0, purchasePriceUSD: "", currency: "TRY",
    minProfitMargin: 20, salePrice: 0, salePriceUSD: "", saleCurrency: "TRY",
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
          salePriceUSD: form.salePriceUSD ? parseFloat(form.salePriceUSD) : null,
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
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU Kodu</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marka</Label>
              <Input id="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Opsiyonel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Birim</Label>
              <select id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {UNITS.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Alış Para Birimi</Label>
              <select id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CURRENCIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentStock">Mevcut Stok</Label>
              <Input id="currentStock" type="number" min={0} value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Minimum Stok</Label>
              <Input id="minStock" type="number" min={0} value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Alış Fiyatı ({getCurrencySymbol(form.currency)})</Label>
              <Input id="purchasePrice" type="number" min={0} step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Satış Fiyatı (₺)</Label>
              <Input id="salePrice" type="number" min={0} step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
            </div>
          </div>
          {form.currency !== "TRY" && (
            <div className="space-y-2">
              <Label htmlFor="purchasePriceUSD">Alış Fiyatı Orijinal ({form.currency})</Label>
              <Input id="purchasePriceUSD" type="number" min={0} step="0.01" placeholder="Opsiyonel" value={form.purchasePriceUSD} onChange={(e) => setForm({ ...form, purchasePriceUSD: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saleCurrency">Satış Para Birimi</Label>
              <select id="saleCurrency" value={form.saleCurrency} onChange={(e) => setForm({ ...form, saleCurrency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CURRENCIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
            {form.saleCurrency !== "TRY" && (
              <div className="space-y-2">
                <Label htmlFor="salePriceUSD">Satış Fiyatı Orijinal ({form.saleCurrency})</Label>
                <Input id="salePriceUSD" type="number" min={0} step="0.01" placeholder="Opsiyonel" value={form.salePriceUSD} onChange={(e) => setForm({ ...form, salePriceUSD: e.target.value })} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="minProfitMargin">Min Kâr Marjı (%)</Label>
            <Input id="minProfitMargin" type="number" min={0} max={100} value={form.minProfitMargin} onChange={(e) => setForm({ ...form, minProfitMargin: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="orderAlert" checked={form.orderAlert} onChange={(e) => setForm({ ...form, orderAlert: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="orderAlert" className="text-sm font-normal cursor-pointer">Sipariş hatırlatması aktif</Label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Product Dialog ───

function EditProductDialog({
  product, onOpenChange, onSuccess, customColumns = [],
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  customColumns?: CustomColumn[];
}) {
  const [form, setForm] = useState({
    name: "", sku: "", brand: "", category: "DIGER", unit: "ADET",
    currentStock: 0, minStock: 0, orderAlert: false,
    purchasePrice: 0, purchasePriceUSD: "", currency: "TRY",
    minProfitMargin: 20, salePrice: 0, salePriceUSD: "", saleCurrency: "TRY",
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku,
        brand: product.brand || "",
        category: product.category,
        unit: product.unit,
        currentStock: product.currentStock ?? 0,
        minStock: product.minStock,
        orderAlert: product.orderAlert,
        purchasePrice: fromKurus(product.purchasePrice),
        purchasePriceUSD: product.purchasePriceUSD != null ? String(product.purchasePriceUSD) : "",
        currency: product.currency,
        minProfitMargin: product.minProfitMargin,
        salePrice: fromKurus(product.salePrice),
        salePriceUSD: product.salePriceUSD != null ? String(product.salePriceUSD) : "",
        saleCurrency: product.saleCurrency || "TRY",
      });
      setCustomFieldValues(product.customFields || {});
      setError("");
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          brand: form.brand || null,
          category: form.category,
          unit: form.unit,
          currentStock: form.currentStock,
          minStock: form.minStock,
          orderAlert: form.orderAlert,
          purchasePrice: toKurus(form.purchasePrice),
          purchasePriceUSD: form.purchasePriceUSD ? parseFloat(form.purchasePriceUSD) : null,
          currency: form.currency,
          minProfitMargin: form.minProfitMargin,
          salePrice: toKurus(form.salePrice),
          salePriceUSD: form.salePriceUSD ? parseFloat(form.salePriceUSD) : null,
          saleCurrency: form.saleCurrency,
          customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Güncelleme hatası");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ürün Düzenle</DialogTitle>
          <DialogDescription>{product?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Ürün Adı</Label>
              <Input id="editName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSku">SKU Kodu</Label>
              <Input id="editSku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editBrand">Marka</Label>
              <Input id="editBrand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Opsiyonel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategory">Kategori</Label>
              <select id="editCategory" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editUnit">Birim</Label>
              <select id="editUnit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {UNITS.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCurrency">Alış Para Birimi</Label>
              <select id="editCurrency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CURRENCIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editCurrentStock">Mevcut Stok</Label>
              <Input id="editCurrentStock" type="number" min={0} value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editMinStock">Minimum Stok</Label>
              <Input id="editMinStock" type="number" min={0} value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editPurchasePrice">Alış Fiyatı ({getCurrencySymbol(form.currency)})</Label>
              <Input id="editPurchasePrice" type="number" min={0} step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSalePrice">Satış Fiyatı (₺)</Label>
              <Input id="editSalePrice" type="number" min={0} step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
            </div>
          </div>
          {form.currency !== "TRY" && (
            <div className="space-y-2">
              <Label htmlFor="editPurchasePriceUSD">Alış Fiyatı Orijinal ({form.currency})</Label>
              <Input id="editPurchasePriceUSD" type="number" min={0} step="0.01" placeholder="Opsiyonel" value={form.purchasePriceUSD} onChange={(e) => setForm({ ...form, purchasePriceUSD: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editSaleCurrency">Satış Para Birimi</Label>
              <select id="editSaleCurrency" value={form.saleCurrency} onChange={(e) => setForm({ ...form, saleCurrency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CURRENCIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
            {form.saleCurrency !== "TRY" && (
              <div className="space-y-2">
                <Label htmlFor="editSalePriceUSD">Satış Fiyatı Orijinal ({form.saleCurrency})</Label>
                <Input id="editSalePriceUSD" type="number" min={0} step="0.01" placeholder="Opsiyonel" value={form.salePriceUSD} onChange={(e) => setForm({ ...form, salePriceUSD: e.target.value })} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="editMinProfitMargin">Min Kâr Marjı (%)</Label>
            <Input id="editMinProfitMargin" type="number" min={0} max={100} value={form.minProfitMargin} onChange={(e) => setForm({ ...form, minProfitMargin: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="editOrderAlert" checked={form.orderAlert} onChange={(e) => setForm({ ...form, orderAlert: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="editOrderAlert" className="text-sm font-normal cursor-pointer">Sipariş hatırlatması aktif</Label>
          </div>
          {customColumns.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-semibold text-gray-700">Özel Alanlar</p>
              <div className="grid grid-cols-2 gap-4">
                {customColumns.map((col) => {
                  // For cf_ prefixed columns, use col.name as the storage key
                  const cfKey = col.id.startsWith("cf_") ? col.name : col.id;
                  return (
                    <div key={col.id} className="space-y-2">
                      <Label htmlFor={`custom-${col.id}`}>{col.name}</Label>
                      {col.type === "boolean" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`custom-${col.id}`}
                            checked={!!customFieldValues[cfKey]}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [cfKey]: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </div>
                      ) : (
                        <Input
                          id={`custom-${col.id}`}
                          type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                          value={customFieldValues[cfKey] ?? ""}
                          onChange={(e) => setCustomFieldValues({
                            ...customFieldValues,
                            [cfKey]: col.type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value,
                          })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Dialog ───

interface ImportPreview {
  columns: string[];
  preview: Record<string, any>[];
  totalRows: number;
}

interface ImportErrorDetail {
  row: number;
  productName: string;
  reason: string;
}

interface ImportResult {
  added: number;
  updated: number;
  errors: number;
  total: number;
  noBrandCount: number;
  errorDetails?: ImportErrorDetail[];
}

const MAPPING_FIELDS = [
  { key: "name", label: "Ürün Adı", required: true },
  { key: "brand", label: "Marka", required: false },
  { key: "category", label: "Kategori", required: false },
  { key: "unit", label: "Birim", required: false },
  { key: "sku", label: "SKU", required: false },
  { key: "quantity", label: "Stok Miktarı", required: false },
  { key: "minStock", label: "Min Stok", required: false },
  { key: "purchasePrice", label: "Alış Fiyatı", required: false },
  { key: "salePrice", label: "Satış Fiyatı", required: false },
];

const IMPORT_CURRENCIES = [
  { value: "TRY", label: "₺ TRY" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
];

const CURRENCY_SYMBOLS: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" };

function ImportDialog({
  open, onOpenChange, onSuccess, onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onComplete?: (noBrandCount: number) => void;
}) {
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "result">("upload");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedCurrency, setSelectedCurrency] = useState("TRY");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBrand, setImportBrand] = useState("");
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [customMappings, setCustomMappings] = useState<{ name: string; column: string }[]>([]);
  const [newCustomName, setNewCustomName] = useState("");

  function reset() {
    setStep("upload"); setPreview(null); setMapping({}); setResult(null); setError("");
    setUploading(false); setImportFile(null); setSelectedCurrency("TRY"); setExchangeRate(null);
    setImportBrand(""); setShowErrorDetails(false); setCustomMappings([]); setNewCustomName("");
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  // Fetch exchange rate when currency changes
  useEffect(() => {
    if (selectedCurrency === "TRY") {
      setExchangeRate(null);
      return;
    }
    let cancelled = false;
    async function fetchRate() {
      setRateLoading(true);
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${selectedCurrency}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setExchangeRate(data.rates?.TRY || null);
      } catch {
        if (!cancelled) setExchangeRate(null);
      } finally {
        if (!cancelled) setRateLoading(false);
      }
    }
    fetchRate();
    return () => { cancelled = true; };
  }, [selectedCurrency]);

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
      const res = await fetch("/api/products/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Dosya okunamadı"); return; }
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
          if (field.key === "unit") return cl.includes("birim") || cl === "unit";
          if (field.key === "sku") return cl.includes("sku") || cl.includes("kod") || cl.includes("code");
          if (field.key === "quantity") return cl.includes("miktar") || cl.includes("stok") || cl.includes("quantity") || cl.includes("stock");
          if (field.key === "minStock") return cl.includes("min") || cl.includes("minimum");
          if (field.key === "purchasePrice") return cl.includes("alış") || cl.includes("alis") || cl.includes("purchase") || cl.includes("cost") || cl.includes("fiyat");
          if (field.key === "salePrice") return cl.includes("satış") || cl.includes("satis") || cl.includes("sale");
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
    setStep("importing"); setError("");
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const finalMapping = { ...mapping };
      if (customMappings.length > 0) {
        finalMapping._customFields = JSON.stringify(customMappings);
      }
      formData.append("mapping", JSON.stringify(finalMapping));
      formData.append("currency", selectedCurrency);
      if (importBrand.trim()) formData.append("brand", importBrand.trim());
      const res = await fetch("/api/products/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "İçe aktarma hatası"); setStep("mapping"); return; }
      setResult(data); setStep("result"); onSuccess();
      if (data.noBrandCount > 0) onComplete?.(data.noBrandCount);
    } catch {
      setError("İçe aktarma sırasında hata oluştu"); setStep("mapping");
    }
  }

  // Format number as Turkish locale
  function formatTRY(value: number): string {
    return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileSelect(e.target.files)} className="hidden" />
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
              <p className="text-sm text-blue-700"><strong>{preview.totalRows}</strong> satır bulundu. Sütunları eşleştirin:</p>
            </div>

            {/* Column mapping */}
            <div className="space-y-2">
              {MAPPING_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-sm text-gray-700">
                    {field.label}{field.required && <span className="text-red-500"> *</span>}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <select value={mapping[field.key] || ""} onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1 text-sm">
                    <option value="">Eşleştirme yok</option>
                    {preview.columns.map((col) => (<option key={col} value={col}>{col}</option>))}
                  </select>
                </div>
              ))}

              {/* Custom field mappings — added by user */}
              {customMappings.map((cm, idx) => (
                <div key={`custom-${idx}`} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-sm text-purple-700 truncate" title={cm.name}>{cm.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <select
                    value={cm.column}
                    onChange={(e) => setCustomMappings((prev) => prev.map((m, i) => i === idx ? { ...m, column: e.target.value } : m))}
                    className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Eşleştirme yok</option>
                    {preview.columns.map((col) => (<option key={col} value={col}>{col}</option>))}
                  </select>
                  <button
                    onClick={() => setCustomMappings((prev) => prev.filter((_, i) => i !== idx))}
                    className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add custom column input */}
              <div className="flex items-center gap-2 border-t border-dashed pt-3">
                <span className="w-28 shrink-0 text-xs text-gray-400">Özel Kolon Ekle</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-transparent" />
                <Input
                  placeholder="Kolon adı girin..."
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="flex-1 h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newCustomName.trim()) {
                        setCustomMappings((prev) => [...prev, { name: newCustomName.trim(), column: "" }]);
                        setNewCustomName("");
                      }
                    }
                  }}
                />
                <button
                  disabled={!newCustomName.trim()}
                  onClick={() => {
                    if (newCustomName.trim()) {
                      setCustomMappings((prev) => [...prev, { name: newCustomName.trim(), column: "" }]);
                      setNewCustomName("");
                    }
                  }}
                  className="shrink-0 rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Brand for this import */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-1">
              <Label className="text-xs font-semibold">Marka (opsiyonel)</Label>
              <p className="text-xs text-muted-foreground">Sadece bu import&apos;taki ürünlere uygulanır. Excel&apos;de marka kolonu varsa o önceliklidir.</p>
              <Input
                value={importBrand}
                onChange={(e) => setImportBrand(e.target.value)}
                placeholder="Ör: Bioderma"
                className="max-w-[300px]"
              />
            </div>

            {/* Currency selection */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Para Birimi</Label>
                <p className="text-xs text-muted-foreground">Alış fiyatlarının para birimi</p>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="flex h-9 w-full max-w-[200px] rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  {IMPORT_CURRENCIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>

              {selectedCurrency !== "TRY" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Fiyatlar {selectedCurrency} olarak okunup güncel kurla TL&apos;ye çevrilecek.
                      {rateLoading ? (
                        <span className="ml-1 text-amber-600">Kur yükleniyor...</span>
                      ) : exchangeRate ? (
                        <span className="ml-1 font-semibold">1 {selectedCurrency} = ₺{formatTRY(exchangeRate)}</span>
                      ) : (
                        <span className="ml-1 text-red-600">Kur alınamadı (sunucu fallback kullanacak)</span>
                      )}
                    </span>
                  </div>

                  {/* Live conversion preview */}
                  {exchangeRate && mapping.purchasePrice && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-amber-700 uppercase">Alış Fiyatı Önizleme</p>
                      <div className="rounded bg-white border border-amber-100 divide-y divide-amber-50">
                        {preview.preview.map((row, i) => {
                          const rawVal = parseFloat(String(row[mapping.purchasePrice] || "0").replace(",", ".")) || 0;
                          if (rawVal <= 0) return null;
                          const tryVal = rawVal * exchangeRate;
                          const sym = CURRENCY_SYMBOLS[selectedCurrency] || selectedCurrency;
                          return (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                              <span className="text-gray-600 truncate max-w-[200px]">{String(row[mapping.name] || `Satır ${i + 1}`)}</span>
                              <span className="text-amber-800 font-medium whitespace-nowrap">
                                {sym}{rawVal.toFixed(2)} {selectedCurrency} = ₺{formatTRY(tryVal)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Raw preview table */}
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Önizleme (ilk 5 satır)</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>{preview.columns.map((col) => (<th key={col} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{col}</th>))}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.preview.map((row, i) => (
                      <tr key={i}>{preview.columns.map((col) => (<td key={col} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">{String(row[col] ?? "")}</td>))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => reset()}>Geri</Button>
              <Button className="flex-1" onClick={handleImport} disabled={!mapping.name}><ArrowRight className="mr-2 h-4 w-4" />İçe Aktar ({preview.totalRows} satır)</Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-600">Veriler içe aktarılıyor...</p>
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
                  {result.errors > 0 && result.errorDetails && result.errorDetails.length > 0 && (
                    <button onClick={() => setShowErrorDetails(!showErrorDetails)} className="mt-1 text-xs text-red-600 hover:text-red-800 underline">
                      {showErrorDetails ? "Gizle" : "Detayları Gör"}
                    </button>
                  )}
                </div>
              </div>
              {result.noBrandCount > 0 && (
                <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                  <strong>{result.noBrandCount}</strong> ürünün markası boş. Kapatınca marka atayabilirsiniz.
                </div>
              )}
            </div>

            {showErrorDetails && result.errorDetails && result.errorDetails.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-red-800">Hatalı Satırlar ({result.errorDetails.length})</p>
                  <button
                    onClick={() => {
                      const csv = ["Satır,Ürün Adı,Hata Sebebi", ...result.errorDetails!.map((e) => `${e.row},"${e.productName.replace(/"/g, '""')}","${e.reason.replace(/"/g, '""')}"`)].join("\n");
                      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = "import-hatalari.csv"; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-white border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV İndir
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-red-100 bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-red-700 w-16">Satır</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700">Ürün Adı</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700">Hata Sebebi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                      {result.errorDetails.map((err, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 text-gray-600">{err.row}</td>
                          <td className="px-3 py-1.5 text-gray-800 max-w-[150px] truncate">{err.productName}</td>
                          <td className="px-3 py-1.5 text-red-600">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter><Button onClick={() => handleClose(false)}>Kapat</Button></DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── AI Extract Dialog ───

interface AIProduct {
  name: string;
  brand: string | null;
  category: string;
  sku: string | null;
  purchasePrice: number | null;
  currency: string;
}

function AIExtractDialog({
  open, onOpenChange, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"upload" | "processing" | "review" | "saving">("upload");
  const [extractedProducts, setExtractedProducts] = useState<AIProduct[]>([]);
  const [error, setError] = useState("");

  function reset() {
    setStep("upload"); setExtractedProducts([]); setError("");
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setStep("processing"); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/products/ai-extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "AI tanıma hatası"); setStep("upload"); return; }
      if (data.products && data.products.length > 0) {
        setExtractedProducts(data.products);
        setStep("review");
      } else {
        setError("Fotoğrafta ürün bulunamadı."); setStep("upload");
      }
    } catch {
      setError("AI tanıma sırasında hata oluştu"); setStep("upload");
    }
  }

  async function handleSaveAll() {
    setStep("saving");
    let saved = 0;
    for (const p of extractedProducts) {
      try {
        const sku = p.sku || `AI-${Date.now().toString(36).slice(-4).toUpperCase()}${saved}`;
        const purchasePrice = p.purchasePrice ? Math.round(p.purchasePrice * 100) : 0;
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: p.name,
            sku,
            brand: p.brand || null,
            category: p.category || "DIGER",
            unit: "ADET",
            purchasePrice,
            currency: p.currency || "TRY",
            salePrice: 0,
          }),
        });
        if (res.ok) saved++;
      } catch {
        // skip individual errors
      }
    }
    onSuccess();
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-purple-600" />
            AI ile Ürün Tanıma
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Ürün fotoğrafı veya fatura görseli yükleyin"}
            {step === "processing" && "AI görüntüyü analiz ediyor..."}
            {step === "review" && "Tanınan ürünleri kontrol edin"}
            {step === "saving" && "Ürünler kaydediliyor..."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-purple-200 p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <Camera className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Fotoğraf yükleyin</p>
                  <p className="text-xs text-gray-400">JPG, PNG veya WebP</p>
                </div>
                <label className="cursor-pointer rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
                  Fotoğraf Seç
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">3.000 token harcanır</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
            <p className="text-sm font-medium text-gray-600">AI görüntüyü analiz ediyor...</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-purple-50 p-3">
              <p className="text-sm text-purple-700"><strong>{extractedProducts.length}</strong> ürün tanındı</p>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Ürün Adı</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Marka</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Kategori</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Fiyat</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Döviz</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {extractedProducts.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.brand || "—"}</td>
                      <td className="px-3 py-2">{getCategoryLabel(p.category)}</td>
                      <td className="px-3 py-2 text-right">{p.purchasePrice != null ? p.purchasePrice.toFixed(2) : "—"}</td>
                      <td className="px-3 py-2 text-center">{p.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => reset()}>Geri</Button>
              <Button onClick={handleSaveAll}><CheckCircle className="mr-2 h-4 w-4" />Tümünü Kaydet</Button>
            </DialogFooter>
          </div>
        )}

        {step === "saving" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
            <p className="text-sm font-medium text-gray-600">Ürünler kaydediliyor...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Column Manager Dialog ───

function SortableColumnItem({
  id, label, isHidden, isLocked, isCustom, onToggle, onRemove,
}: {
  id: string; label: string; isHidden: boolean; isLocked: boolean; isCustom: boolean;
  onToggle: () => void; onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 touch-none" tabIndex={-1}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className={`flex-1 text-sm ${isHidden ? "text-gray-400" : "text-gray-700"}`}>{label}</span>
      {isCustom && onRemove && (
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors" title="Sil">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        onClick={onToggle}
        disabled={isLocked}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${isHidden ? "bg-gray-200" : "bg-blue-600"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${isHidden ? "translate-x-1" : "translate-x-[18px]"}`} />
      </button>
    </div>
  );
}

const CUSTOM_COL_TYPES = [
  { value: "text", label: "Metin" },
  { value: "number", label: "Sayı" },
  { value: "date", label: "Tarih" },
  { value: "boolean", label: "Evet/Hayır" },
] as const;

function ColumnManagerDialog({
  open, onOpenChange, columnConfig, onSave, products = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnConfig: ColumnConfig;
  onSave: (config: ColumnConfig) => void;
  products?: Product[];
}) {
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [localHidden, setLocalHidden] = useState<string[]>([]);
  const [localCustom, setLocalCustom] = useState<CustomColumn[]>([]);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<CustomColumn["type"]>("text");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Auto-detect custom field keys from products' customFields
      const detectedKeys = new Set<string>();
      for (const p of products) {
        if (p.customFields && typeof p.customFields === "object") {
          for (const key of Object.keys(p.customFields)) {
            detectedKeys.add(key);
          }
        }
      }

      // Merge detected keys into existing custom columns
      const existingCustomIds = new Set(columnConfig.customColumns.map((c) => c.id));
      const existingCustomNames = new Set(columnConfig.customColumns.map((c) => c.name));
      const mergedCustom = [...columnConfig.customColumns];
      const mergedOrder = columnConfig.order.filter((k) => k !== "actions");

      Array.from(detectedKeys).forEach((key) => {
        // Use key as both id and name if not already tracked
        const cfId = `cf_${key}`;
        if (!existingCustomIds.has(cfId) && !existingCustomNames.has(key)) {
          // Detect type from first non-null value
          let detectedType: CustomColumn["type"] = "text";
          for (const p of products) {
            const val = p.customFields?.[key];
            if (val != null) {
              if (typeof val === "number") detectedType = "number";
              else if (typeof val === "boolean") detectedType = "boolean";
              break;
            }
          }
          mergedCustom.push({ id: cfId, name: key, type: detectedType });
          if (!mergedOrder.includes(cfId)) mergedOrder.push(cfId);
        }
      });

      setLocalOrder(mergedOrder);
      setLocalHidden([...columnConfig.hidden]);
      setLocalCustom(mergedCustom);
    }
  }, [open, columnConfig, products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function toggleColumn(key: string) {
    setLocalHidden((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function addCustomColumn() {
    if (!newColName.trim()) return;
    const id = `custom_${Date.now().toString(36)}`;
    setLocalCustom((prev) => [...prev, { id, name: newColName.trim(), type: newColType }]);
    setLocalOrder((prev) => [...prev, id]);
    setNewColName("");
    setNewColType("text");
  }

  function removeCustomColumn(id: string) {
    setLocalCustom((prev) => prev.filter((c) => c.id !== id));
    setLocalOrder((prev) => prev.filter((k) => k !== id));
    setLocalHidden((prev) => prev.filter((k) => k !== id));
  }

  function getLabel(key: string): string {
    const def = DEFAULT_COLUMNS.find((d) => d.key === key);
    if (def) return def.label;
    const custom = localCustom.find((c) => c.id === key);
    return custom?.name || key;
  }

  function isLocked(key: string): boolean {
    const def = DEFAULT_COLUMNS.find((d) => d.key === key);
    return !!(def && "locked" in def && def.locked);
  }

  async function handleSave() {
    const finalOrder = [...localOrder, "actions"];
    const config: ColumnConfig = {
      order: finalOrder,
      hidden: localHidden,
      customColumns: localCustom,
    };
    setSaving(true);
    try {
      await fetch("/api/inventory/column-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: config }),
      });
      onSave(config);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  // Sortable items excluding "actions" (always last)
  const sortableItems = localOrder;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Kolonları Düzenle
          </DialogTitle>
          <DialogDescription>
            Kolonları sürükleyerek sıralayın, toggle ile gizleyin/gösterin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
              {sortableItems.map((key) => (
                <SortableColumnItem
                  key={key}
                  id={key}
                  label={getLabel(key)}
                  isHidden={localHidden.includes(key)}
                  isLocked={isLocked(key)}
                  isCustom={localCustom.some((c) => c.id === key)}
                  onToggle={() => toggleColumn(key)}
                  onRemove={localCustom.some((c) => c.id === key) ? () => removeCustomColumn(key) : undefined}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Add custom column */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-semibold text-gray-700">Yeni Kolon Ekle</p>
          <div className="flex gap-2">
            <Input
              placeholder="Kolon adı"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomColumn(); } }}
            />
            <select
              value={newColType}
              onChange={(e) => setNewColType(e.target.value as CustomColumn["type"])}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {CUSTOM_COL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={addCustomColumn} disabled={!newColName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
