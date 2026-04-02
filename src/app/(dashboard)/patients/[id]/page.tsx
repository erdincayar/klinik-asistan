"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Plus,
  Phone,
  Mail,
  FileText,
  Calendar,
  Camera,
  Upload,
  X,
  Columns,
  Image as ImageIcon,
  Loader2,
  Trash2,
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  BellRing,
  Lock,
  ArrowRight,
  ArrowLeft,
  Settings2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSectorConfig } from "@/lib/hooks/useSectorConfig";

interface Treatment {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  treatments: Treatment[];
  customValues?: Array<{ columnKey: string; value: string | null }>;
  appointments?: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    treatmentType: string;
    status: string;
    notes: string | null;
    employee?: { name: string } | null;
  }>;
  debts?: Array<{
    id: string;
    direction: string;
    description: string | null;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: string | null;
    createdAt: string;
    payments: Array<{ amount: number; paidAt: string }>;
  }>;
}

interface PatientPhoto {
  id: string;
  fileName: string;
  fileUrl: string;
  category: string;
  notes: string | null;
  takenAt: string | null;
  uploadedAt: string;
}

interface CrmStats {
  totalVisits: number;
  totalRevenue: number;
  avgAmount: number;
  firstVisit: string | null;
  lastVisit: string | null;
  avgIntervalDays: number | null;
  averageVisitInterval: number | null;
  daysSinceLastVisit?: number;
  status: "new" | "active" | "warning" | "risk";
}

const DEFAULT_CATEGORIES = ["Genel"];

const treatmentLabels: Record<string, string> = {
  BOTOX: "Botoks",
  DOLGU: "Dolgu",
  DIS_TEDAVI: "Diş Tedavi",
  GENEL: "Genel",
};

const categoryColors: Record<string, string> = {
  BOTOX: "bg-purple-100 text-purple-700",
  DOLGU: "bg-pink-100 text-pink-700",
  DIS_TEDAVI: "bg-orange-100 text-orange-700",
  GENEL: "bg-gray-100 text-gray-700",
};

const statusConfig = {
  new: { label: "Yeni", color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
  active: { label: "Aktif", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  warning: { label: "Dikkat", color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  risk: { label: "Kayıp Riski", color: "bg-red-50 text-red-700", dot: "bg-red-500" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const labels = useSectorConfig();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, { list: boolean; detail: boolean }>>({});
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [cellEditValue, setCellEditValue] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("poby-field-visibility");
      if (saved) setFieldVisibility(JSON.parse(saved));
    } catch {}
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "" });

  // CRM stats
  const [crmStats, setCrmStats] = useState<CrmStats | null>(null);

  // Alarms module access flag (şimdilik herkese açık, ileride modül sistemiyle kilitlenecek)
  const [isAlarmsModuleActive] = useState(true);

  // Photo states
  const [photoFilter, setPhotoFilter] = useState("ALL");
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Genel");
  const [uploadNotes, setUploadNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PatientPhoto | null>(null);

  // Custom columns for detail display
  const [customColumns, setCustomColumns] = useState<Array<{ columnKey: string; columnName: string; fieldType: string }>>([]);
  useEffect(() => {
    fetch("/api/clinic/custom-columns").then(r => r.ok ? r.json() : []).then(setCustomColumns).catch(() => {});
  }, []);

  // Dynamic categories
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/photo-categories");
      if (res.ok) {
        const data = await res.json();
        if (data.categories?.length > 0) {
          setCategories(data.categories);
        }
      }
    } catch {
      // Use defaults
    }
  }, []);

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name || categories.includes(name)) return;
    setSavingCategory(true);
    try {
      const updated = [...categories, name];
      const res = await fetch("/api/settings/photo-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updated }),
      });
      if (res.ok) {
        setCategories(updated);
        setNewCategoryName("");
        setShowAddCategory(false);
      }
    } catch {
      // Handle error
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/patients/${params.id}/photos?photoId=${photoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPhotos(photos.filter((p) => p.id !== photoId));
        if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
      }
    } catch {
      // Handle error
    }
  }

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${params.id}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch {
      // Silently fail
    }
  }, [params.id]);

  const fetchCrmStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${params.id}/crm-stats`);
      if (res.ok) {
        const data = await res.json();
        setCrmStats(data);
      }
    } catch {
      // silent
    }
  }, [params.id]);

  const fetchPatient = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${params.id}`);
      if (!res.ok) throw new Error("Müşteri bulunamadı");
      const data = await res.json();
      setPatient(data);
      setEditForm({
        name: data.name,
        phone: data.phone || "",
        email: data.email || "",
        notes: data.notes || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchPatient();
    fetchPhotos();
    fetchCategories();
    fetchCrmStats();
  }, [params.id, fetchPhotos, fetchCategories, fetchCrmStats]);

  async function handleDeletePatient() {
    if (!confirm(`"${patient?.name}" kaydını silmek istediğinize emin misiniz? Tüm ${labels.treatmentSingular.toLowerCase()} kayıtları da silinecektir.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/patients");
      } else {
        setError("Müşteri silinemedi");
      }
    } catch {
      setError("Müşteri silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Müşteri güncellenemedi");
      const updated = await res.json();
      setPatient({ ...patient!, ...updated });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTreatment(treatmentId: string) {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/treatments/${treatmentId}`, { method: "DELETE" });
      if (res.ok && patient) {
        setPatient({
          ...patient,
          treatments: patient.treatments.filter((t) => t.id !== treatmentId),
        });
        fetchCrmStats();
      }
    } catch {
      // silent
    }
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);
      if (uploadNotes) formData.append("notes", uploadNotes);
      try {
        await fetch(`/api/patients/${params.id}/photos`, {
          method: "POST",
          body: formData,
        });
      } catch {
        // Handle error
      }
    }
    await fetchPhotos();
    setUploading(false);
    setUploadNotes("");
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handlePhotoUpload(e.dataTransfer.files);
  };

  const filteredPhotos = photoFilter === "ALL" ? photos : photos.filter((p) => p.category === photoFilter);
  const beforePhotos = photos.filter((p) => p.category === "{labels.treatmentSingular} Öncesi" || p.category === "BEFORE");
  const afterPhotos = photos.filter((p) => p.category === "{labels.treatmentSingular} Sonrası" || p.category === "AFTER");

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-red-500">{error || "Müşteri bulunamadı"}</p>
      </div>
    );
  }

  const sc = crmStats ? statusConfig[crmStats.status] : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/patients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4F46E5] transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Müşteri Listesine Dön
      </Link>

      {/* Patient Info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-xl border border-gray-100 bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E1E2D] text-sm font-semibold text-white">
              {patient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{patient.name}</h2>
              {sc && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sc.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/patients/settings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Alanları Yönet
            </Link>
            <button
              onClick={handleDeletePatient}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Siliniyor..." : "Sil"}
            </button>
            <Link
              href={`/finance/new-income?patientId=${patient.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E2D] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2A2A3C]"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni İşlem
            </Link>
          </div>
        </div>

        <div className="p-6">
          {(() => {
            // Inline editable field helper
            const InlineField = ({ label, field, value, icon: Icon }: { label: string; field: string; value: string; icon?: any }) => (
              <div className="flex items-center gap-2 text-sm">
                {Icon && <Icon className="h-4 w-4 text-gray-400 shrink-0" />}
                {!Icon && <span className="text-gray-400 text-xs font-medium shrink-0">{label}:</span>}
                {editingCell?.field === field ? (
                  <input
                    autoFocus
                    value={cellEditValue}
                    onChange={(e) => setCellEditValue(e.target.value)}
                    onBlur={async () => {
                      if (field === "name" || field === "phone" || field === "email" || field === "notes") {
                        await fetch(`/api/patients/${patient.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...editForm, [field]: cellEditValue }),
                        });
                      } else if (field.startsWith("cv_")) {
                        await fetch(`/api/customers/${patient.id}/custom-value`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ columnKey: field.replace("cv_", ""), value: cellEditValue }),
                        });
                      }
                      fetchPatient();
                      setEditingCell(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingCell(null); }}
                    className="flex-1 rounded-lg border border-[#4F46E5] px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  />
                ) : (
                  <span
                    className="cursor-pointer text-gray-600 hover:text-[#4F46E5] rounded px-1 py-0.5 hover:bg-[#EEF2FF] transition-colors"
                    onClick={() => { setEditingCell({ id: patient.id, field }); setCellEditValue(value); }}
                  >
                    {value || <span className="text-gray-300 italic">Ekle...</span>}
                  </span>
                )}
              </div>
            );

            const fv = fieldVisibility as any;
            return (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fv.phone?.deleted !== true && fv.phone?.detail !== false && (
                  <InlineField label="Telefon" field="phone" value={patient.phone || ""} icon={Phone} />
                )}
                {fv.email?.deleted !== true && fv.email?.detail !== false && (
                  <InlineField label="Email" field="email" value={patient.email || ""} icon={Mail} />
                )}
                {fv.createdAt?.deleted !== true && fv.createdAt?.detail !== false && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    Kayıt: {formatDate(patient.createdAt)}
                  </div>
                )}
                {fv.notes?.deleted !== true && fv.notes?.detail !== false && (
                  <InlineField label="Notlar" field="notes" value={patient.notes || ""} icon={FileText} />
                )}
                {/* Custom fields */}
                {customColumns
                  .filter(col => fv[col.columnKey]?.detail !== false && fv[col.columnKey]?.deleted !== true)
                  .map(col => {
                    const cv = patient.customValues?.find(v => v.columnKey === col.columnKey);
                    return <InlineField key={col.columnKey} label={col.columnName} field={`cv_${col.columnKey}`} value={cv?.value || ""} />;
                  })}
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Mini Stats — compact cards */}
      {(crmStats || (patient.debts && patient.debts.length > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.03 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {crmStats && crmStats.totalVisits > 0 && (
            <Link href="/appointments" className="rounded-xl border border-gray-100 bg-white p-3 hover:bg-gray-50 transition-colors">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Görüşme</p>
              <p className="text-lg font-bold text-[#4F46E5]">{crmStats.totalVisits}</p>
            </Link>
          )}
          {crmStats && crmStats.totalRevenue > 0 && (
            <Link href="/finance" className="rounded-xl border border-gray-100 bg-white p-3 hover:bg-gray-50 transition-colors">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Ciro</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(crmStats.totalRevenue)}</p>
            </Link>
          )}
          {(() => {
            const totalDebt = patient.debts?.reduce((s, d) => s + d.totalAmount, 0) || 0;
            const totalPaid = patient.debts?.reduce((s, d) => s + d.paidAmount, 0) || 0;
            const remaining = totalDebt - totalPaid;
            if (totalDebt === 0) return null;
            return (
              <Link href="/finance?tab=debts" className="rounded-xl border border-gray-100 bg-white p-3 hover:bg-gray-50 transition-colors">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Cari Bakiye</p>
                <p className={`text-lg font-bold ${remaining > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                  {formatCurrency(remaining)}
                </p>
              </Link>
            );
          })()}
          {crmStats && crmStats.lastVisit && (
            <div className="rounded-xl border border-gray-100 bg-white p-3">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Son Ziyaret</p>
              <p className="text-sm font-bold text-gray-700">{formatDate(crmStats.lastVisit)}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* CRM Stats Panel — detailed (only if exists, collapsible) */}
      {crmStats && crmStats.totalVisits > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.03 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#6366F1]" />
              <h2 className="text-sm font-semibold text-gray-900">CRM Özeti</h2>
            </div>
            {crmStats.totalVisits < 3 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                Yeni Müşteri
              </span>
            ) : crmStats.status === "risk" && crmStats.daysSinceLastVisit != null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" />
                {crmStats.daysSinceLastVisit} gündür gelmedi
              </span>
            ) : crmStats.status === "warning" && crmStats.daysSinceLastVisit != null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-700">
                <AlertTriangle className="h-3 w-3" />
                {crmStats.daysSinceLastVisit} gündür gelmedi
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-400">Toplam Ziyaret</p>
              <p className="text-lg font-bold text-gray-900">{crmStats.totalVisits}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-400">Toplam Ciro</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(crmStats.totalRevenue)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-400">Ort. İşlem Tutarı</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(crmStats.avgAmount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-400">İlk Ziyaret</p>
              <p className="text-sm font-semibold text-gray-700">
                {crmStats.firstVisit ? formatDate(crmStats.firstVisit) : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-400">Son Ziyaret</p>
              <p className="text-sm font-semibold text-gray-700">
                {crmStats.lastVisit ? formatDate(crmStats.lastVisit) : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-400">Ort. Ziyaret Aralığı</p>
              {crmStats.avgIntervalDays != null ? (
                <p className="text-lg font-bold text-gray-900">{crmStats.avgIntervalDays} gün</p>
              ) : (
                <p className="text-lg font-bold text-gray-300" title="En az 3 ziyaret gerekli">—</p>
              )}
            </div>
          </div>

          {/* Risk Durumu detay */}
          {crmStats.daysSinceLastVisit != null && (
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Son ziyaretten bu yana</p>
                  <p className="text-lg font-bold text-gray-900">{crmStats.daysSinceLastVisit} gün</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-medium text-gray-500">Beklenen aralık</p>
                  {crmStats.avgIntervalDays != null ? (
                    <p className="text-sm font-semibold text-gray-600">{crmStats.avgIntervalDays} gün</p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-300" title="En az 3 ziyaret gerekli">—</p>
                  )}
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-medium text-gray-500">Durum</p>
                  {crmStats.totalVisits < 3 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700">
                      ⚪ Yeni Müşteri
                    </span>
                  ) : sc && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${sc.color}`}>
                      {crmStats.status === "active" && "🟢"}
                      {crmStats.status === "warning" && "🟡"}
                      {crmStats.status === "risk" && "🔴"}
                      {(crmStats.status === "warning" || crmStats.status === "risk") && crmStats.daysSinceLastVisit != null
                        ? `${crmStats.daysSinceLastVisit} gündür gelmedi`
                        : sc.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Alarmlar Modülü */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.04 }}
        className="overflow-hidden rounded-xl border border-gray-100 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <BellRing className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-900">Alarmlar</h2>
        </div>
        <div className="p-6">
          {isAlarmsModuleActive ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Bu müşteri için ziyaret alarmı oluşturarak takip edin.
              </p>
              <Link
                href={`/alarmlar?newAlarm=customer_visit&customerId=${patient.id}&customerName=${encodeURIComponent(patient.name)}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E2D] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2A2A3C]"
              >
                Alarm Oluştur
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Alarmlar Modülü</p>
                  <p className="text-xs text-gray-400">Müşterileriniz için özel alarmlar oluşturun</p>
                </div>
              </div>
              <button
                disabled
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-400 cursor-not-allowed opacity-60"
              >
                <Lock className="h-3 w-3" />
                Modülü Aktif Et
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Photos Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        style={{ display: fieldVisibility.photos?.detail === false ? "none" : undefined }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#6366F1]" />
            <h2 className="text-sm font-semibold text-gray-900">Fotoğraflar</h2>
            {photos.length > 0 && (
              <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#4F46E5]">
                {photos.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {beforePhotos.length > 0 && afterPhotos.length > 0 && (
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  compareMode ? "bg-[#1E1E2D] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Columns className="h-3.5 w-3.5" />
                Karşılaştır
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Upload area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              dragOver ? "border-[#6366F1] bg-[#EEF2FF]" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#6366F1]" />
                <span className="text-sm text-gray-600">Yükleniyor...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <div className="flex items-center gap-3">
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 focus:border-[#6366F1] focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="Not (opsiyonel)"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E2D] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2A2A3C]">
                  <Upload className="h-3.5 w-3.5" />
                  Fotoğraf Yükle
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Compare Mode */}
          {compareMode && beforePhotos.length > 0 && afterPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{labels.treatmentSingular} Öncesi</p>
                <div className="space-y-3">
                  {beforePhotos.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-xl border border-gray-100">
                      <img src={photo.fileUrl} alt={photo.fileName} className="h-48 w-full object-cover" />
                      {photo.notes && (
                        <p className="px-3 py-2 text-xs text-gray-500">{photo.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{labels.treatmentSingular} Sonrası</p>
                <div className="space-y-3">
                  {afterPhotos.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-xl border border-gray-100">
                      <img src={photo.fileUrl} alt={photo.fileName} className="h-48 w-full object-cover" />
                      {photo.notes && (
                        <p className="px-3 py-2 text-xs text-gray-500">{photo.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Filter */}
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap items-center">
                  {["ALL", ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPhotoFilter(cat)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        photoFilter === cat
                          ? "bg-[#1E1E2D] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat === "ALL" ? "Tümü" : cat}
                    </button>
                  ))}
                  {showAddCategory ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                        placeholder="Kategori adı"
                        autoFocus
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#6366F1] focus:outline-none"
                      />
                      <button
                        onClick={handleAddCategory}
                        disabled={savingCategory || !newCategoryName.trim()}
                        className="rounded-lg bg-[#1E1E2D] px-2 py-1 text-xs font-medium text-white hover:bg-[#2A2A3C] disabled:opacity-50"
                      >
                        {savingCategory ? "..." : "Ekle"}
                      </button>
                      <button
                        onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }}
                        className="rounded-lg px-1.5 py-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddCategory(true)}
                      className="rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-400 hover:border-gray-400 hover:text-gray-500"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Gallery */}
              {filteredPhotos.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-xs text-gray-500">
                      {photos.length === 0 ? "Henüz fotoğraf yüklenmemiş" : "Bu kategoride fotoğraf yok"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredPhotos.map((photo, i) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      onClick={() => setSelectedPhoto(photo)}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-md"
                    >
                      <div className="relative aspect-square">
                        <img
                          src={photo.fileUrl}
                          alt={photo.fileName}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                          className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                          {photo.category}
                        </span>
                      </div>
                      {photo.notes && (
                        <p className="truncate px-2.5 py-1.5 text-[11px] text-gray-500">{photo.notes}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                className="rounded-full bg-white/20 p-2 text-white hover:bg-red-600"
                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(selectedPhoto.id); }}
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={selectedPhoto.fileUrl}
              alt={selectedPhoto.fileName}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {selectedPhoto.notes && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-black/60 px-4 py-2 text-sm text-white">
                {selectedPhoto.notes}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Treatment History */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="overflow-hidden rounded-xl border border-gray-100 bg-white"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">{labels.treatmentPlural} Geçmişi</h2>
        </div>

        {patient.treatments.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center p-6">
            <p className="text-sm text-gray-500">Henüz {labels.treatmentSingular.toLowerCase()} kaydı yok</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {patient.treatments
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((treatment, i) => (
                <motion.div
                  key={treatment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{treatment.name}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${categoryColors[treatment.category] || categoryColors.GENEL}`}>
                        {treatmentLabels[treatment.category] || treatment.category}
                      </span>
                    </div>
                    {treatment.description && (
                      <p className="text-xs text-gray-500">{treatment.description}</p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(treatment.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(treatment.amount)}
                    </span>
                    <Link
                      href={`/finance/new-income?edit=${treatment.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#EEF2FF] hover:text-[#6366F1]"
                      title="Düzenle"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteTreatment(treatment.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
          </div>
        )}
      </motion.div>

      {/* Görüşme / Randevu Geçmişi */}
      {patient.appointments && patient.appointments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#6366F1]" />
              <h2 className="text-sm font-semibold text-gray-900">Görüşme Geçmişi</h2>
              <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#4F46E5]">{patient.appointments.length}</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {patient.appointments.map((appt) => {
              const statusColors: Record<string, string> = {
                SCHEDULED: "bg-blue-50 text-blue-700",
                COMPLETED: "bg-emerald-50 text-emerald-700",
                CANCELLED: "bg-red-50 text-red-600",
                NO_SHOW: "bg-orange-50 text-orange-700",
              };
              const statusLabels: Record<string, string> = {
                SCHEDULED: "Planlandı",
                COMPLETED: "Tamamlandı",
                CANCELLED: "İptal",
                NO_SHOW: "Gelmedi",
              };
              return (
                <div key={appt.id} className="flex items-center justify-between px-6 py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusColors[appt.status] || "bg-gray-100 text-gray-600"}`}>
                        {statusLabels[appt.status] || appt.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{appt.treatmentType || "Görüşme"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{formatDate(appt.date)}</span>
                      <span>{appt.startTime} - {appt.endTime}</span>
                      {appt.employee?.name && <span>· {appt.employee.name}</span>}
                    </div>
                    {appt.notes && <p className="text-xs text-gray-500 mt-0.5">{appt.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Cari Hesap / Sipariş Geçmişi */}
      {patient.debts && patient.debts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Cari Hesap / Sipariş Geçmişi</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {patient.debts.map((debt: any) => {
              const remaining = debt.totalAmount - debt.paidAmount;
              const isPaid = debt.status === "PAID";
              return (
                <div key={debt.id} className="flex items-center justify-between px-6 py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        debt.direction === "RECEIVABLE" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                      }`}>
                        {debt.direction === "RECEIVABLE" ? "Alacak" : "Borç"}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{debt.description || "—"}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDate(debt.createdAt)}
                      {debt.dueDate && ` · Vade: ${formatDate(debt.dueDate)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(debt.totalAmount)}</p>
                    {isPaid ? (
                      <p className="text-[11px] text-emerald-600 font-medium">Ödendi</p>
                    ) : remaining > 0 ? (
                      <p className="text-[11px] text-orange-600 font-medium">Kalan: {formatCurrency(remaining)}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
