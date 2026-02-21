"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TREATMENT_CATEGORIES } from "@/lib/types";
import { toKurus } from "@/lib/utils";

interface Patient {
  id: string;
  name: string;
}

function NewIncomeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patientId: preselectedPatientId,
    name: "",
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch("/api/patients");
        if (res.ok) {
          const data = await res.json();
          setPatients(data);
        }
      } catch {
        // Patients will be empty
      }
    }
    fetchPatients();
  }, []);

  useEffect(() => {
    if (preselectedPatientId) {
      setForm((prev) => ({ ...prev, patientId: preselectedPatientId }));
    }
  }, [preselectedPatientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const amountTL = parseFloat(form.amount);
      if (isNaN(amountTL) || amountTL <= 0) {
        throw new Error("Geçerli bir tutar girin");
      }

      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: form.patientId,
          name: form.name,
          category: form.category,
          description: form.description,
          amount: toKurus(amountTL),
          date: form.date,
        }),
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

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Gelir / Tedavi Kaydı</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Hasta *</Label>
              <select
                id="patientId"
                value={form.patientId}
                onChange={(e) =>
                  setForm({ ...form, patientId: e.target.value })
                }
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Hasta seçin...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">İşlem Adı *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Örnek: Botox uygulama"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
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
                {TREATMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="İşlem açıklaması..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Tutar (TL) *</Label>
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
              <Label htmlFor="date">Tarih *</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
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

export default function NewIncomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Yükleniyor...</div>}>
      <NewIncomeForm />
    </Suspense>
  );
}
