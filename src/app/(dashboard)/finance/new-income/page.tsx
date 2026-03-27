"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
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
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { toKurus } from "@/lib/utils";

interface Patient {
  id: string;
  name: string;
}

interface CustomField {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
}

function NewIncomeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";
  const editId = searchParams.get("edit") || "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEdit, setFetchingEdit] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patientId: preselectedPatientId,
    name: "",
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  // Fetch patients
  useEffect(() => {
    fetch("/api/patients")
      .then((r) => (r.ok ? r.json() : []))
      .then(setPatients)
      .catch(() => {});
  }, []);

  // Fetch custom fields
  useEffect(() => {
    fetch("/api/clinic/custom-fields")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomFields)
      .catch(() => {});
  }, []);

  // Fetch treatment for edit mode
  const fetchTreatment = useCallback(async () => {
    if (!editId) return;
    setFetchingEdit(true);
    try {
      const res = await fetch(`/api/treatments/${editId}`);
      if (res.ok) {
        const t = await res.json();
        setForm({
          patientId: t.patientId || "",
          name: t.name || "",
          category: t.category || "",
          description: t.description || "",
          amount: String(t.amount / 100),
          date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
        });
        // Load custom values
        if (t.customValues) {
          const cvMap: Record<string, string> = {};
          for (const cv of t.customValues) {
            cvMap[cv.fieldKey] = cv.value;
          }
          setCustomValues(cvMap);
        }
      }
    } catch {
      // ignore
    } finally {
      setFetchingEdit(false);
    }
  }, [editId]);

  useEffect(() => {
    fetchTreatment();
  }, [fetchTreatment]);

  useEffect(() => {
    if (preselectedPatientId && !editId) {
      setForm((prev) => ({ ...prev, patientId: preselectedPatientId }));
    }
  }, [preselectedPatientId, editId]);

  async function handleAddField() {
    if (!newFieldName.trim()) return;
    try {
      const res = await fetch("/api/clinic/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName: newFieldName.trim(), fieldType: newFieldType }),
      });
      if (res.ok) {
        const field = await res.json();
        setCustomFields((prev) => [...prev, field]);
        setNewFieldName("");
        setNewFieldType("text");
        setShowAddField(false);
      }
    } catch {
      // silent
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const amountTL = parseFloat(form.amount);
      if (isNaN(amountTL) || amountTL <= 0) {
        throw new Error("Geçerli bir tutar girin");
      }

      const payload: any = {
        patientId: form.patientId,
        name: form.name,
        category: form.category,
        description: form.description,
        amount: toKurus(amountTL),
        date: form.date,
      };

      // Include custom values if any
      const cvArray = Object.entries(customValues)
        .filter(([, v]) => v.trim())
        .map(([fieldKey, value]) => ({ fieldKey, value }));
      if (cvArray.length > 0) {
        payload.customValues = cvArray;
      }

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
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-gray-500">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {editId ? "Gelir Kaydını Düzenle" : "Yeni Gelir / Tedavi Kaydı"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Müşteri *</Label>
              <select
                id="patientId"
                value={form.patientId}
                onChange={(e) =>
                  setForm({ ...form, patientId: e.target.value })
                }
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Müşteri seçin...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">İşlem Adı *</Label>
              <AutocompleteInput
                id="name"
                value={form.name}
                onChange={(val) => setForm({ ...form, name: val })}
                fetchUrl="/api/clinic/service-names"
                required
                placeholder="Örnek: Botox uygulama"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
              <AutocompleteInput
                id="category"
                value={form.category}
                onChange={(val) => setForm({ ...form, category: val })}
                fetchUrl="/api/clinic/categories"
                required
                placeholder="Kategori yazın veya seçin..."
              />
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

            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-xs font-medium text-gray-500">Özel Alanlar</p>
                {customFields.map((field) => (
                  <div key={field.fieldKey} className="space-y-1">
                    <Label htmlFor={`cf_${field.fieldKey}`} className="text-sm">
                      {field.fieldName}
                    </Label>
                    <Input
                      id={`cf_${field.fieldKey}`}
                      type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
                      value={customValues[field.fieldKey] || ""}
                      onChange={(e) =>
                        setCustomValues((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                      }
                      placeholder={field.fieldName}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Add custom field */}
            {showAddField ? (
              <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Alan adı"
                    className="flex-1"
                  />
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                  >
                    <option value="text">Metin</option>
                    <option value="number">Sayı</option>
                    <option value="date">Tarih</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddField}>
                    Ekle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowAddField(false); setNewFieldName(""); }}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddField(true)}
                className="flex items-center gap-1 text-sm text-[#c75b12] hover:text-[#9e4a0f]"
              >
                <Plus className="h-3.5 w-3.5" />
                Alan Ekle
              </button>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Kaydediliyor..." : editId ? "Güncelle" : "Kaydet"}
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
