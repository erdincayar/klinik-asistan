"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, GripVertical, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomColumn {
  id: string;
  columnName: string;
  columnKey: string;
  fieldType: string;
  options: string | null;
  isRequired: boolean;
  sortOrder: number;
}

const FIELD_TYPES = [
  { value: "text", label: "Metin" },
  { value: "number", label: "Sayı" },
  { value: "phone", label: "Telefon" },
  { value: "email", label: "E-posta" },
  { value: "date", label: "Tarih" },
  { value: "textarea", label: "Uzun Metin" },
  { value: "select", label: "Seçenekli" },
];

const PRESET_FIELDS = [
  { name: "TC Kimlik No", type: "text" },
  { name: "Firma Adı", type: "text" },
  { name: "Vergi No", type: "text" },
  { name: "Vergi Dairesi", type: "text" },
  { name: "İl", type: "text" },
  { name: "İlçe", type: "text" },
  { name: "Adres", type: "textarea" },
  { name: "İletişim Kişisi", type: "text" },
  { name: "Referans", type: "text" },
  { name: "Sektör", type: "text" },
  { name: "Ödeme Vadesi (Gün)", type: "number" },
  { name: "İndirim Oranı (%)", type: "number" },
];

export default function PatientSettingsPage() {
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New field form
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [showNewField, setShowNewField] = useState(false);

  useEffect(() => {
    fetchColumns();
  }, []);

  async function fetchColumns() {
    try {
      const res = await fetch("/api/clinic/custom-columns");
      if (res.ok) setColumns(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }

  async function addColumn(name?: string, type?: string) {
    const fieldName = name || newFieldName.trim();
    const fieldType = type || newFieldType;
    if (!fieldName) return;
    setSaving(true);
    try {
      const body: any = { columnName: fieldName, fieldType };
      if (newFieldRequired) body.isRequired = true;
      if (fieldType === "select" && newFieldOptions) {
        body.options = newFieldOptions.split(",").map(o => o.trim()).filter(Boolean);
      }
      const res = await fetch("/api/clinic/custom-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchColumns();
        setNewFieldName("");
        setNewFieldType("text");
        setNewFieldRequired(false);
        setNewFieldOptions("");
        setShowNewField(false);
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  async function deleteColumn(columnKey: string) {
    if (!confirm("Bu alanı silmek istediğinize emin misiniz? Tüm müşteri verileri de silinecektir.")) return;
    try {
      await fetch("/api/clinic/custom-columns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnKey }),
      });
      await fetchColumns();
    } catch {}
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/patients" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Müşteri Alanlarını Düzenle</h1>
          <p className="text-sm text-gray-500">Müşteri kartlarında görünecek alanları belirleyin</p>
        </div>
      </div>

      {/* Current fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Mevcut Alanlar</CardTitle>
            <span className="text-xs text-gray-400">{columns.length} alan</span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Default fields - always present */}
          <div className="mb-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase text-gray-400">Varsayılan Alanlar</p>
            {["İsim", "Telefon", "E-posta", "Notlar", "Doğum Tarihi"].map((f) => (
              <div key={f} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#6366F1]" />
                  <span className="text-sm font-medium text-gray-700">{f}</span>
                </div>
                <span className="text-[11px] text-gray-400">Sabit alan</span>
              </div>
            ))}
          </div>

          {/* Custom fields */}
          {columns.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-gray-400">Özel Alanlar</p>
              {columns.map((col) => (
                <div key={col.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{col.columnName}</span>
                      <span className="ml-2 text-[10px] text-gray-400">
                        {FIELD_TYPES.find(t => t.value === col.fieldType)?.label || col.fieldType}
                        {col.isRequired && " · Zorunlu"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteColumn(col.columnKey)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading && <p className="text-sm text-gray-400 py-4 text-center">Yükleniyor...</p>}
        </CardContent>
      </Card>

      {/* Add new field */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yeni Alan Ekle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset shortcuts */}
          <div>
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Hızlı Ekle</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_FIELDS
                .filter(p => !columns.some(c => c.columnName === p.name))
                .map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => addColumn(preset.name, preset.type)}
                    disabled={saving}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-[#EEF2FF] hover:text-[#4F46E5] hover:border-[#E0E7FF] transition-colors disabled:opacity-50"
                  >
                    <Plus className="inline h-3 w-3 mr-1" />
                    {preset.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Custom field form */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-3">Özel Alan</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Alan Adı</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Örn: Vergi No, Referans"
                  onKeyDown={(e) => e.key === "Enter" && addColumn()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alan Tipi</Label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {newFieldType === "select" && (
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs">Seçenekler (virgülle ayırın)</Label>
                <Input
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                  placeholder="Örn: İstanbul, Ankara, İzmir"
                />
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#6366F1]"
                />
                <span className="text-sm text-gray-600">Zorunlu alan</span>
              </label>
              <Button onClick={() => addColumn()} disabled={saving || !newFieldName.trim()}>
                {saving ? "Ekleniyor..." : "Alan Ekle"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
