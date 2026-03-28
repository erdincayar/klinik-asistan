"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  AlertTriangle,
  Clock,
  Package,
  TrendingDown,
  Truck,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ──────────── Types ──────────── */

interface ProductAnalysis {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  supplier: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  leadTimeDays: number | null;
  reorderPoint: number | null;
  reorderQty: number | null;
  autoReorder: boolean;
  purchasePrice: number;
  avgDailyConsumption: number;
  daysOfSupply: number;
  reorderDate: string | null;
  stockOutDate: string | null;
  urgency: "critical" | "warning" | "safe" | "overstocked";
  monthlyConsumption: number[];
  peakMonth: string | null;
}

interface SupplierGroup {
  supplier: string;
  products: ProductAnalysis[];
  totalOrderValue: number;
  urgentCount: number;
}

interface Summary {
  total: number;
  critical: number;
  warning: number;
  safe: number;
  overstocked: number;
  needsReorder: number;
}

/* ──────────── Constants ──────────── */

const URGENCY_CONFIG = {
  critical: { label: "Kritik", color: "bg-red-100 text-red-700", dot: "bg-red-500", icon: AlertCircle },
  warning: { label: "Uyarı", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500", icon: AlertTriangle },
  safe: { label: "Güvenli", color: "bg-green-100 text-green-700", dot: "bg-green-500", icon: CheckCircle },
  overstocked: { label: "Fazla Stok", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500", icon: Archive },
};

const MONTH_NAMES = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function fmtTL(kurus: number) {
  return (kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₺";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

/* ──────────── Component ──────────── */

export default function SupplyChainTab() {
  const [data, setData] = useState<{ products: ProductAnalysis[]; supplierGroups: SupplierGroup[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "safe" | "overstocked">("all");
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductAnalysis | null>(null);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ supplier: "", leadTimeDays: "", reorderQty: "", autoReorder: false });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stock/supply-chain");
      if (res.ok) setData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSaveSupplySettings(productId: string) {
    setSaving(true);
    try {
      await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: editValues.supplier || null,
          leadTimeDays: editValues.leadTimeDays ? parseInt(editValues.leadTimeDays) : null,
          reorderQty: editValues.reorderQty ? parseInt(editValues.reorderQty) : null,
          autoReorder: editValues.autoReorder,
        }),
      });
      setEditingProduct(null);
      fetchData();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  if (!data) return <p className="text-center py-12 text-gray-400">Veri yüklenemedi</p>;

  const { summary, supplierGroups } = data;
  const filtered = filter === "all" ? data.products : data.products.filter((p) => p.urgency === filter);

  // Aylık tüketim grafiği (tüm ürünlerin toplamı)
  const now = new Date();
  const chartData = MONTH_NAMES.slice(0, 6).map((_, i) => {
    const monthIdx = (now.getMonth() - 5 + i + 12) % 12;
    const total = data.products.reduce((s, p) => s + (p.monthlyConsumption[i] || 0), 0);
    return { month: MONTH_NAMES[monthIdx], toplam: total };
  });

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Toplam Ürün", value: summary.total, color: "text-gray-700", bg: "bg-gray-50", icon: Package },
          { label: "Kritik", value: summary.critical, color: "text-red-700", bg: "bg-red-50", icon: AlertCircle },
          { label: "Uyarı", value: summary.warning, color: "text-orange-700", bg: "bg-orange-50", icon: AlertTriangle },
          { label: "Güvenli", value: summary.safe, color: "text-green-700", bg: "bg-green-50", icon: CheckCircle },
          { label: "Sipariş Gerekli", value: summary.needsReorder, color: "text-[#4F46E5]", bg: "bg-[#EEF2FF]", icon: ShoppingCart },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={cn("rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-3")}>
              <div className={cn("rounded-lg p-2.5", card.bg)}>
                <Icon className={cn("h-4 w-4", card.color)} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={cn("text-xl font-bold", card.color)}>{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sol: Ürün Listesi */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtre */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "critical", "warning", "safe", "overstocked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f ? "bg-[#6366F1] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f === "all" ? "Tümü" : URGENCY_CONFIG[f].label}
                {f !== "all" && ` (${summary[f]})`}
              </button>
            ))}
          </div>

          {/* Ürün Tablosu */}
          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ürün</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Stok</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Gün/Tüketim</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Yetecek Gün</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Sipariş Tarihi</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Bu filtrede ürün yok</td></tr>
                  ) : filtered.map((p) => {
                    const urg = URGENCY_CONFIG[p.urgency];
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProduct(p)}
                        className={cn("cursor-pointer hover:bg-gray-50/50 transition-colors", selectedProduct?.id === p.id && "bg-[#EEF2FF]/30")}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", urg.dot)} />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                              <p className="text-[11px] text-gray-400">{p.brand || p.supplier || p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{p.currentStock} {p.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{p.avgDailyConsumption}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn("font-semibold", p.daysOfSupply <= 7 ? "text-red-600" : p.daysOfSupply <= 14 ? "text-orange-600" : "text-gray-900")}>
                            {p.daysOfSupply > 365 ? "365+" : p.daysOfSupply}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                          {p.reorderDate ? fmtDate(p.reorderDate) : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", urg.color)}>
                            {urg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ: Detay & Tedarik Grupları */}
        <div className="space-y-4">
          {/* Seçili Ürün Detayı */}
          {selectedProduct ? (
            <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", URGENCY_CONFIG[selectedProduct.urgency].color)}>
                  {URGENCY_CONFIG[selectedProduct.urgency].label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Mevcut Stok</p>
                  <p className="font-bold text-gray-900">{selectedProduct.currentStock} {selectedProduct.unit}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Günlük Tüketim</p>
                  <p className="font-bold text-gray-900">{selectedProduct.avgDailyConsumption}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Yetecek Süre</p>
                  <p className={cn("font-bold", selectedProduct.daysOfSupply <= 7 ? "text-red-600" : "text-gray-900")}>
                    {selectedProduct.daysOfSupply > 365 ? "365+ gün" : `${selectedProduct.daysOfSupply} gün`}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Tedarik Süresi</p>
                  <p className="font-bold text-gray-900">{selectedProduct.leadTimeDays || "?"} gün</p>
                </div>
              </div>

              {selectedProduct.stockOutDate && (
                <div className={cn("rounded-lg p-3 text-xs", selectedProduct.urgency === "critical" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700")}>
                  <Clock className="inline h-3 w-3 mr-1" />
                  Stok bitme tahmini: <strong>{fmtDate(selectedProduct.stockOutDate)}</strong>
                  {selectedProduct.reorderDate && (
                    <> · Sipariş: <strong>{fmtDate(selectedProduct.reorderDate)}</strong></>
                  )}
                </div>
              )}

              {selectedProduct.peakMonth && (
                <p className="text-xs text-gray-500">
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                  En yoğun ay: <strong>{selectedProduct.peakMonth}</strong>
                </p>
              )}

              {/* Aylık Tüketim Spark */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Son 6 Ay Tüketim</p>
                <div className="flex items-end gap-1 h-12">
                  {selectedProduct.monthlyConsumption.map((v, i) => {
                    const max = Math.max(...selectedProduct.monthlyConsumption, 1);
                    const h = (v / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-t bg-[#6366F1]" style={{ height: `${Math.max(h, 4)}%` }} />
                        <span className="text-[8px] text-gray-400">{MONTH_NAMES[(now.getMonth() - 5 + i + 12) % 12]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tedarik Ayarları */}
              {editingProduct === selectedProduct.id ? (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-700">Tedarik Ayarları</p>
                  <input
                    value={editValues.supplier}
                    onChange={(e) => setEditValues({ ...editValues, supplier: e.target.value })}
                    placeholder="Tedarikçi adı"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#6366F1] outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={editValues.leadTimeDays}
                      onChange={(e) => setEditValues({ ...editValues, leadTimeDays: e.target.value })}
                      placeholder="Tedarik süresi (gün)"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#6366F1] outline-none"
                    />
                    <input
                      type="number"
                      value={editValues.reorderQty}
                      onChange={(e) => setEditValues({ ...editValues, reorderQty: e.target.value })}
                      placeholder="Sipariş miktarı"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#6366F1] outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={editValues.autoReorder}
                      onChange={(e) => setEditValues({ ...editValues, autoReorder: e.target.checked })}
                      className="rounded"
                    />
                    Otomatik tedarik listesine ekle
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveSupplySettings(selectedProduct.id)}
                      disabled={saving}
                      className="flex-1 rounded-lg bg-[#6366F1] py-1.5 text-xs font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50"
                    >
                      {saving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                    <button
                      onClick={() => setEditingProduct(null)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingProduct(selectedProduct.id);
                    setEditValues({
                      supplier: selectedProduct.supplier || "",
                      leadTimeDays: selectedProduct.leadTimeDays ? String(selectedProduct.leadTimeDays) : "",
                      reorderQty: selectedProduct.reorderQty ? String(selectedProduct.reorderQty) : "",
                      autoReorder: selectedProduct.autoReorder,
                    });
                  }}
                  className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-[#6366F1] hover:text-[#6366F1] transition-colors"
                >
                  Tedarik Ayarlarını Düzenle
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Detay için bir ürün seçin</p>
            </div>
          )}

          {/* Tedarikçi Grupları */}
          {supplierGroups.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <Truck className="h-4 w-4 text-[#6366F1]" />
                <h3 className="text-sm font-semibold text-gray-900">Tedarik Listesi</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {supplierGroups.map((sg) => (
                  <div key={sg.supplier}>
                    <button
                      onClick={() => setExpandedSupplier(expandedSupplier === sg.supplier ? null : sg.supplier)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{sg.supplier}</p>
                        <p className="text-[11px] text-gray-400">
                          {sg.products.length} ürün · {sg.urgentCount} acil
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sg.totalOrderValue > 0 && (
                          <span className="text-xs font-semibold text-[#6366F1]">
                            {fmtTL(sg.totalOrderValue)}
                          </span>
                        )}
                        {expandedSupplier === sg.supplier ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>
                    {expandedSupplier === sg.supplier && (
                      <div className="bg-gray-50/50 px-5 py-2 space-y-1.5">
                        {sg.products.map((p) => {
                          const urg = URGENCY_CONFIG[p.urgency];
                          return (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={cn("h-1.5 w-1.5 rounded-full", urg.dot)} />
                                <span className="text-gray-700">{p.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-gray-500">
                                <span>Stok: {p.currentStock}</span>
                                <span>{p.daysOfSupply > 365 ? "365+" : p.daysOfSupply} gün</span>
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", urg.color)}>
                                  {urg.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toplam Tüketim Grafiği */}
          {chartData.some((d) => d.toplam > 0) && (
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-semibold text-gray-700 mb-3">Aylık Toplam Tüketim</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                  <Bar dataKey="toplam" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
