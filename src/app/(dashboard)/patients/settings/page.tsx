"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Eye, EyeOff, List, FileText } from "lucide-react";
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

interface FieldConfig {
  key: string;
  name: string;
  type: string;
  isDefault: boolean;
  isRequired: boolean;
  showInList: boolean;
  showInDetail: boolean;
  customColumnId?: string;
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

const STORAGE_KEY = "poby-field-visibility";

function loadVisibility(): Record<string, { list: boolean; detail: boolean }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveVisibility(data: Record<string, { list: boolean; detail: boolean }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function PatientSettingsPage() {
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, { list: boolean; detail: boolean }>>(loadVisibility);

  // New field form
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");

  useEffect(() => { fetchColumns(); }, []);

  async function fetchColumns() {
    try {
      const res = await fetch("/api/clinic/custom-columns");
      if (res.ok) setColumns(await res.json());
    } catch {} finally { setLoading(false); }
  }

  // Build combined field list
  const defaultFields: FieldConfig[] = [
    { key: "name", name: "İsim", type: "text", isDefault: true, isRequired: true, showInList: true, showInDetail: true },
    { key: "phone", name: "Telefon", type: "phone", isDefault: true, isRequired: false, showInList: visibility.phone?.list !== false, showInDetail: visibility.phone?.detail !== false },
    { key: "email", name: "E-posta", type: "email", isDefault: true, isRequired: false, showInList: visibility.email?.list !== false, showInDetail: visibility.email?.detail !== false },
    { key: "notes", name: "Notlar", type: "textarea", isDefault: true, isRequired: false, showInList: false, showInDetail: visibility.notes?.detail !== false },
    { key: "dateOfBirth", name: "Doğum Tarihi", type: "date", isDefault: true, isRequired: false, showInList: false, showInDetail: visibility.dateOfBirth?.detail !== false },
  ];

  const customFields: FieldConfig[] = columns.map((col) => ({
    key: col.columnKey,
    name: col.columnName,
    type: col.fieldType,
    isDefault: false,
    isRequired: col.isRequired,
    showInList: visibility[col.columnKey]?.list !== false,
    showInDetail: visibility[col.columnKey]?.detail !== false,
    customColumnId: col.id,
  }));

  const allFields = [...defaultFields, ...customFields];

  function toggleVisibility(key: string, target: "list" | "detail") {
    setVisibility((prev) => {
      const current = prev[key] || { list: true, detail: true };
      const next = { ...prev, [key]: { ...current, [target]: !current[target] } };
      saveVisibility(next);
      return next;
    });
  }

  async function addColumn(name?: string, type?: string) {
    const fieldName = name || newFieldName.trim();
    const fieldType = type || newFieldType;
    if (!fieldName) return;
    setSaving(true);
    try {
      const body: any = { columnName: fieldName, fieldType };
      if (fieldType === "select" && newFieldOptions) {
        body.options = newFieldOptions.split(",").map((o: string) => o.trim()).filter(Boolean);
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
        setNewFieldOptions("");
      }
    } catch {} finally { setSaving(false); }
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
          <h1 className="text-xl font-bold text-gray-900">Müşteri Alanları</h1>
          <p className="text-sm text-gray-500">Alanları yönetin, nerede görüneceğini belirleyin</p>
        </div>
      </div>

      {/* All Fields — unified panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Alanlar</CardTitle>
            <div className="flex items-center gap-4 text-[10px] font-semibold uppercase text-gray-400">
              <span className="flex items-center gap-1"><List className="h-3 w-3" /> Liste</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Detay</span>
              <span className="w-7"></span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {allFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 hover:bg-gray-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-2 w-2 rounded-full shrink-0 ${field.isDefault ? "bg-[#6366F1]" : "bg-emerald-500"}`} />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-700">{field.name}</span>
                  <span className="ml-2 text-[10px] text-gray-400">
                    {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                    {field.isRequired && " · Zorunlu"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* List visibility toggle */}
                {field.key !== "name" && (
                  <button
                    onClick={() => toggleVisibility(field.key, "list")}
                    className={`rounded-lg p-1.5 transition-colors ${field.showInList ? "text-[#4F46E5] bg-[#EEF2FF]" : "text-gray-300 hover:text-gray-400"}`}
                    title={field.showInList ? "Listede görünür" : "Listede gizli"}
                  >
                    {field.showInList ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                )}
                {field.key === "name" && <div className="w-8" />}

                {/* Detail visibility toggle */}
                <button
                  onClick={() => field.key !== "name" ? toggleVisibility(field.key, "detail") : null}
                  className={`rounded-lg p-1.5 transition-colors ${field.key === "name" ? "text-[#4F46E5] bg-[#EEF2FF] cursor-default" : field.showInDetail ? "text-emerald-600 bg-emerald-50" : "text-gray-300 hover:text-gray-400"}`}
                  title={field.showInDetail ? "Detayda görünür" : "Detayda gizli"}
                  disabled={field.key === "name"}
                >
                  {field.showInDetail || field.key === "name" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>

                {/* Delete (all except name) */}
                {field.key !== "name" ? (
                  <button
                    onClick={() => {
                      if (field.isDefault) {
                        // Hide default field by toggling both list and detail off
                        const next = { ...visibility, [field.key]: { list: false, detail: false } };
                        setVisibility(next);
                        saveVisibility(next);
                      } else {
                        deleteColumn(field.key);
                      }
                    }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title={field.isDefault ? "Gizle" : "Sil"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : <div className="w-8" />}
              </div>
            </div>
          ))}
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

            <div className="mt-3 flex justify-end">
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
