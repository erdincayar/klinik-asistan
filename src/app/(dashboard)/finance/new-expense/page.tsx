"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { toKurus, formatCurrency } from "@/lib/utils";

const VAT_RATES = [
  { value: 0, label: "%0" },
  { value: 1, label: "%1" },
  { value: 10, label: "%10" },
  { value: 20, label: "%20" },
];

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    vatRate: 20,
    vatIncluded: true,
    addToDebt: false,
    contactName: "",
    dueDate: "",
  });

  const amountNum = parseFloat(form.amount) || 0;
  const vatAmount = form.vatIncluded
    ? amountNum - amountNum / (1 + form.vatRate / 100)
    : amountNum * (form.vatRate / 100);
  const netAmount = form.vatIncluded
    ? amountNum - vatAmount
    : amountNum;
  const totalAmount = form.vatIncluded
    ? amountNum
    : amountNum + vatAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Geçerli bir tutar girin");
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          category: form.category,
          amount: toKurus(totalAmount),
          date: form.date,
          vatRate: form.vatRate,
          vatIncluded: form.vatIncluded,
          addToDebt: form.addToDebt,
          contactName: form.contactName || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gider kaydedilemedi");
      }

      router.push("/finance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Gider Kaydı</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama <span className="text-red-500">*</span></Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
                placeholder="Örnek: Tedarikçi ödemesi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori <span className="text-red-500">*</span></Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Kategori seçin...</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Tutar (TL) <span className="text-red-500">*</span></Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Tarih <span className="text-red-500">*</span></Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* KDV */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">KDV Ayarları</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.vatIncluded}
                    onChange={(e) => setForm({ ...form, vatIncluded: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#6366F1]"
                  />
                  <span className="text-sm text-gray-600">KDV Dahil</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs text-gray-500 shrink-0">KDV Oranı</Label>
                <div className="flex gap-1.5">
                  {VAT_RATES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, vatRate: r.value })}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        form.vatRate === r.value
                          ? "bg-[#1E1E2D] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {amountNum > 0 && form.vatRate > 0 && (
                <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
                  <span>Net: <strong className="text-gray-700">{formatCurrency(Math.round(netAmount * 100))}</strong></span>
                  <span>KDV: <strong className="text-gray-700">{formatCurrency(Math.round(vatAmount * 100))}</strong></span>
                  <span>Toplam: <strong className="text-gray-700">{formatCurrency(Math.round(totalAmount * 100))}</strong></span>
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
                <div className="space-y-3 pt-1">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Firma / Kişi Adı <span className="text-red-500">*</span></Label>
                    <Input
                      id="contactName"
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      placeholder="Tedarikçi veya firma adı"
                      required={form.addToDebt}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Vade Tarihi</Label>
                    <Input
                      id="dueDate"
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
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Link href="/finance">
                <Button type="button" variant="outline">
                  İptal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
