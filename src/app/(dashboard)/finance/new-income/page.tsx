"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
  brand: string | null;
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
    addToDebt: true,
    contactName: "",
    dueDate: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientSaving, setNewPatientSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Close all dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setPatientDropdownOpen(false);
        setShowNewPatient(false);
        setLineItems(prev => prev.map(l => ({ ...l, showDropdown: false })));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/patients").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/products?active=all").then((r) => (r.ok ? r.json() : [])),
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
        const patientName = t.patient?.name || "";
        setForm((prev) => ({
          ...prev,
          patientId: t.patientId || "",
          name: t.name || "",
          category: t.category || "",
          date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
          contactName: patientName,
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

  async function handleAddPatient() {
    if (!newPatientName.trim()) return;
    setNewPatientSaving(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPatientName.trim() }),
      });
      if (res.ok) {
        const patient = await res.json();
        setPatients((prev) => [...prev, patient]);
        setForm((prev) => ({ ...prev, patientId: patient.id }));
        setNewPatientName("");
        setShowNewPatient(false);
        setPatientDropdownOpen(false);
      }
    } catch { /* silent */ } finally {
      setNewPatientSaving(false);
    }
  }

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
    return sum + (l.costPrice / 100) * l.quantity;
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
        contactName: form.contactName || patients.find(p => p.id === form.patientId)?.name || undefined,
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
              <div className="space-y-2 relative" data-dropdown>
                <Label>Müşteri</Label>
                <div className="relative">
                  <input
                    type="text"
                    value={patientDropdownOpen ? patientSearch : (patients.find(p => p.id === form.patientId)?.name || "")}
                    onChange={(e) => { setPatientSearch(e.target.value); setPatientDropdownOpen(true); }}
                    onFocus={() => { setPatientDropdownOpen(true); setPatientSearch(""); }}
                    placeholder="Müşteri ara veya yeni ekle..."
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                  {patientDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                      {patients
                        .filter(p => !patientSearch || p.name.toLowerCase().includes(patientSearch.toLowerCase()))
                        .map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => { setForm({ ...form, patientId: p.id, contactName: p.name }); setPatientDropdownOpen(false); }}
                            className={`flex w-full px-3 py-2 text-xs hover:bg-[#EEF2FF] ${form.patientId === p.id ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-gray-700"}`}
                          >
                            {p.name}
                          </button>
                        ))}
                      {!showNewPatient ? (
                        <button
                          type="button"
                          onClick={() => { setShowNewPatient(true); setNewPatientName(patientSearch); }}
                          className="flex w-full items-center gap-1.5 border-t border-gray-100 px-3 py-2 text-xs text-[#4F46E5] hover:bg-[#EEF2FF] font-medium"
                        >
                          <Plus className="h-3 w-3" /> Yeni Müşteri Ekle {patientSearch && `"${patientSearch}"`}
                        </button>
                      ) : (
                        <div className="border-t border-gray-100 p-2 space-y-2">
                          <input
                            autoFocus
                            type="text"
                            value={newPatientName}
                            onChange={(e) => setNewPatientName(e.target.value)}
                            placeholder="Müşteri adı"
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPatient())}
                          />
                          <div className="flex gap-1.5">
                            <button type="button" onClick={handleAddPatient} disabled={newPatientSaving} className="rounded-lg bg-[#4F46E5] px-3 py-1 text-xs text-white">
                              {newPatientSaving ? "..." : "Ekle"}
                            </button>
                            <button type="button" onClick={() => setShowNewPatient(false)} className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-600">İptal</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input type="hidden" value={form.patientId} />
              </div>
              <div className="space-y-2">
                <Label>İşlem Adı</Label>
                <AutocompleteInput
                  value={form.name}
                  onChange={(val) => setForm({ ...form, name: val })}
                  fetchUrl="/api/clinic/service-names"
                  placeholder="Ürün satışı"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <AutocompleteInput
                  value={form.category}
                  onChange={(val) => setForm({ ...form, category: val })}
                  fetchUrl="/api/clinic/categories"
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

              <div className="space-y-3">
                {lineItems.map((line, idx) => {
                  const total = lineTotal(line);
                  const trLower = (s: string) => s.toLocaleLowerCase("tr-TR");
                  const searchWords = trLower(line.productSearch).split(/\s+/).filter(Boolean);
                  const filtered = searchWords.length > 0
                    ? products.filter((p) => {
                        const name = trLower(p.name);
                        const sku = trLower(p.sku || "");
                        const brand = trLower(p.brand || "");
                        return searchWords.every(w => name.includes(w) || sku.includes(w) || brand.includes(w));
                      })
                    : products;

                  return (
                    <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                      {/* Row 1: Product search — full width */}
                      <div className="relative" data-dropdown>
                        <div className="flex items-center gap-2">
                          {line.productId && (
                            <Package className="h-4 w-4 text-emerald-500 shrink-0" />
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
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                          />
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                            title="Satırı sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Dropdown — opens downward with generous height */}
                        {line.showDropdown && (
                          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                            {line.productId && (
                              <button
                                type="button"
                                onClick={() => updateLine(idx, { productId: null, costPrice: 0, showDropdown: false })}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                              >
                                Manuel giriş (stok bağlantısı kaldır)
                              </button>
                            )}
                            {filtered.slice(0, 30).map((p) => (
                              <button
                                type="button"
                                key={p.id}
                                onClick={() => selectProduct(idx, p)}
                                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-[#EEF2FF] ${
                                  line.productId === p.id ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-gray-700"
                                }`}
                              >
                                <span className="truncate font-medium">{p.name}</span>
                                <span className="shrink-0 ml-3 text-xs text-gray-400">
                                  {p.salePrice > 0 ? `${(p.salePrice / 100).toLocaleString("tr-TR")}₺` : ""} · Stok: {p.currentStock}
                                </span>
                              </button>
                            ))}
                            {filtered.length === 0 && (
                              <p className="px-4 py-3 text-sm text-gray-400">
                                {products.length === 0 ? "Stokta ürün yok" : "Sonuç bulunamadı"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Row 2: Adet, Fiyat, KDV, Toplam */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400 w-8">Adet</span>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400 w-8">Fiyat</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                            placeholder="0.00"
                            className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400">KDV</span>
                          <select
                            value={line.vatRate}
                            onChange={(e) => updateLine(idx, { vatRate: Number(e.target.value) })}
                            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                          >
                            <option value={0}>%0</option>
                            <option value={1}>%1</option>
                            <option value={10}>%10</option>
                            <option value={20}>%20</option>
                          </select>
                          <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={line.vatIncluded}
                              onChange={(e) => updateLine(idx, { vatIncluded: e.target.checked })}
                              className="h-3.5 w-3.5 rounded border-gray-300"
                            />
                            Dahil
                          </label>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                          {line.productId && line.costPrice > 0 && (
                            <span className="text-[11px] text-gray-400">
                              Maliyet: {formatCurrency(line.costPrice)}
                            </span>
                          )}
                          <span className="text-sm font-bold text-gray-800">
                            {total > 0 ? `${total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}₺` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals — separate section */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center">
                <p className="text-[11px] text-gray-400">Net Tutar</p>
                <p className="mt-1 text-sm font-bold text-gray-700">{formatCurrency(toKurus(totalNet))}</p>
              </div>
              <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                <p className="text-[11px] text-gray-400">KDV Toplamı</p>
                <p className="mt-1 text-sm font-bold text-orange-600">{formatCurrency(toKurus(totalVat))}</p>
              </div>
              <div className="rounded-xl bg-[#EEF2FF] border border-[#E0E7FF] p-3 text-center">
                <p className="text-[11px] text-gray-400">Genel Toplam</p>
                <p className="mt-1 text-sm font-bold text-[#4F46E5]">{formatCurrency(toKurus(grandTotal))}</p>
              </div>
              {totalCost > 0 ? (
                <div className={`rounded-xl p-3 text-center ${estimatedProfit >= 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                  <p className="text-[11px] text-gray-400">Tahmini Kar</p>
                  <p className={`mt-1 text-sm font-bold ${estimatedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(toKurus(estimatedProfit))}</p>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center">
                  <p className="text-[11px] text-gray-400">Tahmini Kar</p>
                  <p className="mt-1 text-sm font-bold text-gray-400">—</p>
                </div>
              )}
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
