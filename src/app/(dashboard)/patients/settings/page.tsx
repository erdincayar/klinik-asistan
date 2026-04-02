"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

type VisItem = { list: boolean; detail: boolean; order?: number };
type VisMap = Record<string, VisItem>;

function loadVis(): VisMap { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
function saveVis(d: VisMap) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

// Sortable row
function SortableField({
  field, vis, onToggle, onDelete, onRename,
}: {
  field: FieldConfig;
  vis: VisItem;
  onToggle: (target: "list" | "detail") => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(field.name);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5 hover:bg-gray-50/50">
      {/* Drag handle */}
      {field.key !== "name" ? (
        <button {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
      ) : <div className="w-4" />}

      {/* Color dot + Name */}
      <div className={`h-2 w-2 rounded-full shrink-0 ${field.isDefault ? "bg-[#6366F1]" : "bg-emerald-500"}`} />
      <div className="flex-1 min-w-0">
        {!field.isDefault && editing ? (
          <input
            autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
            onBlur={() => { onRename(editName); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(editName); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            className="rounded border border-[#4F46E5] px-2 py-0.5 text-sm focus:outline-none"
          />
        ) : (
          <span
            className={`text-sm font-medium text-gray-700 ${!field.isDefault ? "cursor-pointer hover:text-[#4F46E5]" : ""}`}
            onClick={() => { if (!field.isDefault) { setEditing(true); setEditName(field.name); } }}
          >
            {field.name}
          </span>
        )}
        <span className="ml-2 text-[10px] text-gray-400">
          {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
          {field.isRequired && " · Zorunlu"}
        </span>
      </div>

      {/* List toggle */}
      {field.key !== "name" && (
        <button onClick={() => onToggle("list")} className={`rounded-lg p-1.5 transition-colors ${vis.list !== false ? "text-[#4F46E5] bg-[#EEF2FF]" : "text-gray-300 hover:text-gray-400"}`} title="Listede görünsün">
          {vis.list !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      )}
      {field.key === "name" && <div className="w-8" />}

      {/* Detail toggle */}
      <button
        onClick={() => field.key !== "name" ? onToggle("detail") : null}
        disabled={field.key === "name"}
        className={`rounded-lg p-1.5 transition-colors ${field.key === "name" ? "text-emerald-500 bg-emerald-50 cursor-default" : vis.detail !== false ? "text-emerald-600 bg-emerald-50" : "text-gray-300 hover:text-gray-400"}`}
        title="Detayda görünsün"
      >
        {vis.detail !== false || field.key === "name" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>

      {/* Delete */}
      {field.key !== "name" ? (
        <button onClick={onDelete} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Sil/Gizle">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : <div className="w-8" />}
    </div>
  );
}

export default function PatientSettingsPage() {
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vis, setVis] = useState<VisMap>(loadVis);
  const [fieldOrder, setFieldOrder] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => { fetchColumns(); }, []);

  async function fetchColumns() {
    try {
      const res = await fetch("/api/clinic/custom-columns");
      if (res.ok) setColumns(await res.json());
    } catch {} finally { setLoading(false); }
  }

  // Build field list
  const defaultFields: FieldConfig[] = [
    { key: "name", name: "İsim", type: "text", isDefault: true, isRequired: true },
    { key: "phone", name: "Telefon", type: "phone", isDefault: true, isRequired: false },
    { key: "email", name: "E-posta", type: "email", isDefault: true, isRequired: false },
    { key: "notes", name: "Notlar", type: "textarea", isDefault: true, isRequired: false },
    { key: "dateOfBirth", name: "Doğum Tarihi", type: "date", isDefault: true, isRequired: false },
    { key: "treatmentCount", name: "İşlem Sayısı", type: "number", isDefault: true, isRequired: false },
    { key: "createdAt", name: "Kayıt Tarihi", type: "date", isDefault: true, isRequired: false },
    { key: "photos", name: "Fotoğraflar", type: "text", isDefault: true, isRequired: false },
  ];

  const customFields: FieldConfig[] = columns.map((col) => ({
    key: col.columnKey, name: col.columnName, type: col.fieldType, isDefault: false, isRequired: col.isRequired,
  }));

  const allFieldKeys = [...defaultFields, ...customFields].map(f => f.key);
  const allFieldMap = new Map([...defaultFields, ...customFields].map(f => [f.key, f]));

  // Maintain ordered list
  useEffect(() => {
    const savedOrder = Object.entries(vis).filter(([, v]) => v.order !== undefined).sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0)).map(([k]) => k);
    if (savedOrder.length > 0) {
      const remaining = allFieldKeys.filter(k => !savedOrder.includes(k));
      setFieldOrder([...savedOrder.filter(k => allFieldMap.has(k)), ...remaining]);
    } else {
      setFieldOrder(allFieldKeys);
    }
  }, [columns]);

  const orderedFields = fieldOrder.map(k => allFieldMap.get(k)).filter(Boolean) as FieldConfig[];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fieldOrder.indexOf(active.id as string);
    const newIndex = fieldOrder.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    // Don't allow moving before "name"
    if (newIndex === 0 && fieldOrder[0] === "name") return;

    const newOrder = arrayMove(fieldOrder, oldIndex, newIndex);
    setFieldOrder(newOrder);

    // Save order to visibility
    const newVis = { ...vis };
    newOrder.forEach((key, idx) => {
      newVis[key] = { ...(newVis[key] || { list: true, detail: true }), order: idx };
    });
    setVis(newVis);
    saveVis(newVis);
  }

  function toggleField(key: string, target: "list" | "detail") {
    const current = vis[key] || { list: true, detail: true };
    const next = { ...vis, [key]: { ...current, [target]: !current[target] } };
    setVis(next);
    saveVis(next);
  }

  function deleteField(field: FieldConfig) {
    if (field.isDefault) {
      const next = { ...vis, [field.key]: { list: false, detail: false, order: vis[field.key]?.order } };
      setVis(next);
      saveVis(next);
    } else {
      if (!confirm("Bu alanı silmek istediğinize emin misiniz?")) return;
      fetch("/api/clinic/custom-columns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnKey: field.key }),
      }).then(() => fetchColumns());
    }
  }

  async function renameField(key: string, newName: string) {
    if (!newName.trim()) return;
    await fetch("/api/clinic/custom-columns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnKey: key, columnName: newName.trim() }),
    });
    fetchColumns();
  }

  async function addColumn(name?: string, type?: string) {
    const fieldName = name || newFieldName.trim();
    const fieldType = type || newFieldType;
    if (!fieldName) return;
    setSaving(true);
    try {
      const body: any = { columnName: fieldName, fieldType };
      if (fieldType === "select" && newFieldOptions) body.options = newFieldOptions.split(",").map((o: string) => o.trim()).filter(Boolean);
      const res = await fetch("/api/clinic/custom-columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { await fetchColumns(); setNewFieldName(""); setNewFieldType("text"); setNewFieldOptions(""); }
    } catch {} finally { setSaving(false); }
  }

  // Preview: visible list columns
  const previewListCols = orderedFields.filter(f => {
    if (f.key === "name") return true;
    const v = vis[f.key];
    return v?.list !== false;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/patients" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Müşteri Alanları</h1>
          <p className="text-sm text-gray-500">Sürükleyerek sıralayın, toggle ile gösterim ayarlayın</p>
        </div>
      </div>

      {/* Preview — full width, single row */}
      <div className="rounded-xl border border-[#E0E7FF] bg-[#EEF2FF]/30 p-4">
        <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Ön İzleme — Liste Görünümü</p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-gray-400 w-8">#</th>
                {previewListCols.map((f) => (
                  <th key={f.key} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-gray-400 whitespace-nowrap">{f.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="px-3 py-2 text-xs text-gray-400">1</td>
                {previewListCols.map((f, j) => (
                  <td key={f.key} className="px-3 py-2 whitespace-nowrap">
                    {j === 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[9px] font-bold text-[#4F46E5]">AY</div>
                        <span className="text-xs font-medium text-gray-700">Ahmet Yılmaz</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {f.type === "phone" ? "0532 XXX XX XX" : f.type === "email" ? "ahmet@mail.com" : f.key === "treatmentCount" ? "5" : f.key === "createdAt" ? "15.01.2026" : "Örnek veri"}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        {/* Fields panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Alanlar</CardTitle>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase text-gray-400">
                <span>Liste</span>
                <span>Detay</span>
                <span className="w-7"></span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fieldOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {orderedFields.map((field) => (
                    <SortableField
                      key={field.key}
                      field={field}
                      vis={vis[field.key] || { list: true, detail: true }}
                      onToggle={(t) => toggleField(field.key, t)}
                      onDelete={() => deleteField(field)}
                      onRename={(n) => renameField(field.key, n)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {loading && <p className="text-sm text-gray-400 py-4 text-center">Yükleniyor...</p>}
          </CardContent>
        </Card>

        {/* Add new field */}
        <Card>
          <CardHeader><CardTitle className="text-base">Yeni Alan Ekle</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Hızlı Ekle</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_FIELDS.filter(p => !columns.some(c => c.columnName === p.name)).map((preset) => (
                  <button key={preset.name} onClick={() => addColumn(preset.name, preset.type)} disabled={saving}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-[#EEF2FF] hover:text-[#4F46E5] hover:border-[#E0E7FF] transition-colors disabled:opacity-50">
                    <Plus className="inline h-3 w-3 mr-1" />{preset.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Alan Adı</Label>
                  <Input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="Örn: Vergi No" onKeyDown={(e) => e.key === "Enter" && addColumn()} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alan Tipi</Label>
                  <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                    {FIELD_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                  </select>
                </div>
              </div>
              {newFieldType === "select" && (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Seçenekler (virgülle)</Label>
                  <Input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="İstanbul, Ankara, İzmir" />
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
    </div>
  );
}
