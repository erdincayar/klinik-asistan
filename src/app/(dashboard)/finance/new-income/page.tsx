"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { toKurus, formatCurrency } from "@/lib/utils";

interface Patient {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  unit: string;
  vatIncluded: boolean;
}

interface LineItem {
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: string; // TL string for input
  costPrice: number; // kuruş, from product
  vatIncluded: boolean;
  vatRate: number;
  productSearch: string;
  showDropdown: boolean;
}

const emptyLine = (): LineItem => ({
  productId: null,
  description: "",
  quantity: 1,
  unitPrice: "",
  costPrice: 0,
  vatIncluded: true,
  vatRate: 20,
  productSearch: "",
  showDropdown: false,
});

function NewIncomeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";
  const editId = searchParams.get("edit") || "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEdit, setFetchingEdit] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patientId: preselectedPatientId,
    name: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    addToDebt: false,
    contactName: "",
    dueDate: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);

  useEffect(() => {
    Promise.all([
      fetch("/api/patients").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/products?active=true").then((r) => (r.ok ? r.json() : [])),
    ]).then(([p, pr]) => {
      setPatients(p);
      if (Array.isArray(pr)) setProducts(pr);
    }).catch(() => {});
  }, []);

  // Edit mode
  const fetchTreatment = useCallback(async () => {
    if (!editId) return;
    setFetchingEdit(true);
    try {
      const res = await fetch(`/api/treatments/${editId}`);
      if (res.ok) {
        const t = await res.json();
        setForm((prev) => ({
          ...prev,
          patientId: t.patientId || "",
          name: t.name || "",
          category: t.category || "",
          date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
        }));
        // Put the existing amount as a single line item
        setLineItems([{
          ...emptyLine(),
          description: t.name || "Mevcut kayıt",
          unitPrice: String(t.amount / 100),
        }]);
      }
    } catch { /* ignore */ } finally {
      setFetchingEdit(false);
    }
  }, [editId]);

  useEffect(() => { fetchTreatment(); }, [fetchTreatment]);

  useEffect(() => {
    if (preselectedPatientId && !editId) {
      setForm((prev) => ({ ...prev, patientId: preselectedPatientId }));
    }
  }, [preselectedPatientId, editId]);

  // Line item helpers
  function updateLine(idx: number, updates: Partial<LineItem>) {
    setLineItems((prev) => prev.map((l, i) => (i === idx ? { ...l, ...updates } : l)));
  }

  function addLine() {
    setLineItems((prev) => [...prev, emptyLine()]);
  }

  function removeLine(idx: number) {
    setLineItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  function selectProduct(idx: number, product: Product) {
    updateLine(idx, {
      productId: product.id,
      description: product.name,
      costPrice: product.purchasePrice,
      unitPrice: product.salePrice > 0 ? String(product.salePrice / 100) : "",
      vatIncluded: product.vatIncluded,
      productSearch: "",
      showDropdown: false,
    });
  }

  // Calculations
  function lineTotal(line: LineItem): number {
    const price = parseFloat(line.unitPrice) || 0;
    return price * line.quantity;
  }

  function lineVat(line: LineItem): number {
    const total = lineTotal(line);
    if (line.vatRate === 0) return 0;
    return line.vatIncluded
      ? total - total / (1 + line.vatRate / 100)
      : total * (line.vatRate / 100);
  }

  const grandTotal = lineItems.reduce((sum, l) => {
    const price = parseFloat(l.unitPrice) || 0;
    const total = price * l.quantity;
    return sum + (l.vatIncluded ? total : total + total * (l.vatRate / 100));
  }, 0);

  const totalVat = lineItems.reduce((sum, l) => sum + lineVat(l), 0);
  const totalNet = grandTotal - totalVat;
  const totalCost = lineItems.reduce((sum, l) => {
    if (!l.productId || l.costPrice === 0) return sum;
    const cost = l.vatIncluded ? l.costPrice : Math.round(l.costPrice * (1 + l.vatRate / 100));
    return sum + (cost / 100) * l.quantity;
  }, 0);
  const estimatedProfit = grandTotal - totalCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const validLines = lineItems.filter((l) => l.description && (parseFloat(l.unitPrice) || 0) > 0);
      if (validLines.length === 0) throw new Error("En az bir kalem girin");
      if (grandTotal <= 0) throw new Error("Geçerli bir tutar girin");

      const payload: any = {
        patientId: form.patientId,
        name: form.name || validLines.map((l) => l.description).join(", "),
        category: form.category,
        description: validLines.map((l) =>
          `${l.description} x${l.quantity} = ${lineTotal(l).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`
        ).join("\n"),
        amount: toKurus(grandTotal),
        date: form.date,
        addToDebt: form.addToDebt,
        contactName: form.contactName || undefined,
        dueDate: form.dueDate || undefined,
        lineItems: validLines.map((l) => ({
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: toKurus(parseFloat(l.unitPrice) || 0),
          costPrice: l.costPrice,
          vatIncluded: l.vatIncluded,
          vatRate: l.vatRate,
        })),
      };

      const url = editId ? `/api/treatments/${editId}` : "/api/treatments";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "İşlem kaydedilemedi");
      }

      router.push("/finance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  if (fetchingEdit) {
    return <div className="mx-auto max-w-4xl p-8 text-center text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Gelir Kaydını Düzenle" : "Yeni Gelir Kaydı"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Müşteri *</Label>
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Müşteri seçin...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>İşlem Adı *</Label>
                <AutocompleteInput
                  value={form.name}
                  onChange={(val) => setForm({ ...form, name: val })}
                  fetchUrl="/api/clinic/service-names"
                  required
                  placeholder="Ürün satışı"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <AutocompleteInput
                  value={form.category}
                  onChange={(val) => setForm({ ...form, category: val })}
                  fetchUrl="/api/clinic/categories"
                  required
                  placeholder="Kategori"
                />
              </div>
              <div className="space-y-2">
                <Label>Tarih *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Kalemler</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLine}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Satır Ekle
                </Button>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Table header */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_70px_100px_80px_60px_40px] gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">
                  <span>Ürün / Açıklama</span>
                  <span className="text-center">Adet</span>
                  <span className="text-right">Birim Fiyat</span>
                  <span className="text-center">KDV</span>
                  <span className="text-right">Toplam</span>
                  <span></span>
                </div>

                {lineItems.map((line, idx) => {
                  const total = lineTotal(line);
                  const filtered = line.productSearch
                    ? products.filter((p) => p.name.toLowerCase().includes(line.productSearch.toLowerCase()))
                    : products;

                  return (
                    <div key={idx} className="border-t border-gray-100 px-3 py-3 sm:grid sm:grid-cols-[1fr_70px_100px_80px_60px_40px] sm:items-center gap-2">
                      {/* Product / Description */}
                      <div className="relative">
                        <div className="flex items-center gap-1.5">
                          {line.productId && (
                            <Package className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                          <input
                            type="text"
                            value={line.showDropdown ? line.productSearch : line.description}
                            onChange={(e) => {
                              updateLine(idx, {
                                productSearch: e.target.value,
                                description: line.productId ? line.description : e.target.value,
                                showDropdown: true,
                              });
                            }}
                            onFocus={() => updateLine(idx, { showDropdown: true, productSearch: "" })}
                            placeholder="Ürün ara veya açıklama yaz..."
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                          />
                        </div>
                        {line.showDropdown && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                            {line.productId && (
                              <button
                                type="button"
                                onClick={() => updateLine(idx, { productId: null, costPrice: 0, showDropdown: false })}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
                              >
                                Manuel giriş (stok bağlantısı kaldır)
                              </button>
                            )}
                            {filtered.slice(0, 20).map((p) => (
                              <button
                                type="button"
                                key={p.id}
                                onClick={() => selectProduct(idx, p)}
                                className={`flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-[#EEF2FF] ${
                                  line.productId === p.id ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-gray-700"
                                }`}
                              >
                                <span className="truncate">{p.name}</span>
                                <span className="shrink-0 ml-2 text-gray-400">
                                  {p.salePrice > 0 ? `${(p.salePrice / 100).toFixed(2)}₺` : ""} · Stok: {p.currentStock}
                                </span>
                              </button>
                            ))}
                            {filtered.length === 0 && (
                              <p className="px-3 py-2 text-xs text-gray-400">
                                {products.length === 0 ? "Stokta ürün yok" : "Sonuç bulunamadı"}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => updateLine(idx, { showDropdown: false })}
                              className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
                            >
                              Kapat
                            </button>
                          </div>
                        )}
                        {line.productId && line.costPrice > 0 && (
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            Maliyet: {formatCurrency(line.vatIncluded ? line.costPrice : Math.round(line.costPrice * 1.20))}
                          </p>
                        )}
                      </div>

                      {/* Quantity */}
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center"
                      />

                      {/* Unit Price */}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right"
                      />

                      {/* KDV */}
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={line.vatRate}
                          onChange={(e) => updateLine(idx, { vatRate: Number(e.target.value) })}
                          className="rounded border border-gray-200 px-1 py-1 text-xs"
                        >
                          <option value={0}>%0</option>
                          <option value={1}>%1</option>
                          <option value={10}>%10</option>
                          <option value={20}>%20</option>
                        </select>
                        <label className="flex items-center gap-0.5 text-[10px] text-gray-400 cursor-pointer" title={line.vatIncluded ? "KDV Dahil" : "KDV Hariç"}>
                          <input
                            type="checkbox"
                            checked={line.vatIncluded}
                            onChange={(e) => updateLine(idx, { vatIncluded: e.target.checked })}
                            className="h-3 w-3"
                          />
                          D
                        </label>
                      </div>

                      {/* Line total */}
                      <span className="text-sm font-semibold text-right text-gray-700 whitespace-nowrap">
                        {total > 0 ? `${total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}₺` : "—"}
                      </span>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Satırı sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Net Tutar</span>
                    <span className="font-medium text-gray-700">{formatCurrency(toKurus(totalNet))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>KDV Toplamı</span>
                    <span className="font-medium text-orange-600">{formatCurrency(toKurus(totalVat))}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5">
                    <span>Genel Toplam</span>
                    <span className="text-[#4F46E5]">{formatCurrency(toKurus(grandTotal))}</span>
                  </div>
                  {totalCost > 0 && (
                    <div className={`flex justify-between text-xs border-t border-gray-200 pt-1.5 ${estimatedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      <span>Tahmini Kar</span>
                      <span className="font-semibold">{formatCurrency(toKurus(estimatedProfit))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cari Hesap */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.addToDebt}
                  onChange={(e) => setForm({ ...form, addToDebt: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#6366F1]"
                />
                <span className="text-sm font-semibold text-gray-700">Cari Hesaba Ekle</span>
              </label>
              {form.addToDebt && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                  <div className="space-y-2">
                    <Label>Firma / Kişi Adı *</Label>
                    <Input
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      placeholder="Müşteri veya firma adı"
                      required={form.addToDebt}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vade Tarihi</Label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Kaydediliyor..." : editId ? "Güncelle" : "Kaydet"}
              </Button>
              <Link href="/finance">
                <Button type="button" variant="outline">İptal</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewIncomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Yükleniyor...</div>}>
      <NewIncomeForm />
    </Suspense>
  );
}
