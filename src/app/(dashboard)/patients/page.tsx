"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search, Users, ArrowRight, Phone, Upload, Download, ChevronRight, X, Settings2, Pencil } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CustomValue {
  columnKey: string;
  value: string;
}

interface CustomColumn {
  id: string;
  columnName: string;
  columnKey: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  _count?: { treatments: number };
  customValues?: CustomValue[];
  createdAt: string;
  riskStatus?: "new" | "active" | "warning" | "risk";
  daysSinceLastVisit?: number | null;
}

function getRiskBadge(status?: string, daysSince?: number | null): { label: string; color: string; emoji: string } | null {
  if (!status) return null;
  if (status === "warning") {
    const days = daysSince != null ? `${daysSince} gündür gelmedi` : "Dikkat";
    return { label: days, color: "bg-yellow-50 text-yellow-700 border-yellow-200", emoji: "🟡" };
  }
  if (status === "risk") {
    const days = daysSince != null ? `${daysSince} gündür gelmedi` : "Kayıp Riski";
    return { label: days, color: "bg-red-50 text-red-700 border-red-200", emoji: "🔴" };
  }
  return null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.05, ease: "easeOut" as const },
  }),
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-100", className)} />;
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [columnEditMode, setColumnEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Edit modal
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });
  const [editCustomValues, setEditCustomValues] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Risk filter
  const [riskFilter, setRiskFilter] = useState<"all" | "active" | "warning" | "risk">("all");

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportColumns, setExportColumns] = useState<Record<string, boolean>>({
    phone: true,
    email: true,
    date: true,
    treatments: true,
    count: false,
    revenue: false,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true);
        const params = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`/api/patients${params}`);
        if (!res.ok) throw new Error("Müşteriler alınamadı");
        const data = await res.json();
        setPatients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetch("/api/clinic/custom-columns")
      .then((r) => r.ok ? r.json() : [])
      .then(setCustomColumns)
      .catch(() => {});
  }, []);

  async function handleAddColumn() {
    if (!newColumnName.trim()) return;
    try {
      const res = await fetch("/api/clinic/custom-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnName: newColumnName.trim() }),
      });
      if (res.ok) {
        const col = await res.json();
        setCustomColumns((prev) => [...prev, col]);
        setNewColumnName("");
        setShowAddColumn(false);
      }
    } catch {
      // silent
    }
  }

  async function handleDeleteColumn(columnKey: string) {
    try {
      const res = await fetch("/api/clinic/custom-columns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnKey }),
      });
      if (res.ok) {
        setCustomColumns((prev) => prev.filter((c) => c.columnKey !== columnKey));
        setDeleteConfirm(null);
      }
    } catch {
      // silent
    }
  }

  async function handleCustomValueSave(patientId: string, columnKey: string, value: string) {
    try {
      await fetch(`/api/customers/${patientId}/custom-value`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnKey, value }),
      });
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          const cvs = [...(p.customValues || [])];
          const idx = cvs.findIndex((v) => v.columnKey === columnKey);
          if (idx >= 0) cvs[idx] = { ...cvs[idx], value };
          else cvs.push({ columnKey, value });
          return { ...p, customValues: cvs };
        }),
      );
    } catch {
      // silent
    }
    setEditingCell(null);
  }

  async function handleInlineSave(patientId: string, field: string, value: string) {
    try {
      const res = await fetch(`/api/customers/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? { ...p, [field]: value || null } : p)),
        );
      }
    } catch {
      // silent fail
    }
    setEditingCell(null);
  }

  function startEdit(patientId: string, field: string, currentValue: string | null) {
    if (columnEditMode) return;
    setEditingCell({ id: patientId, field });
    setEditValue(currentValue || "");
  }

  async function handleExport() {
    setExporting(true);
    try {
      const selected = Object.entries(exportColumns)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const res = await fetch("/api/customers/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: selected }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `musteriler-${new Date().toISOString().split("T")[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportModal(false);
      }
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  }

  function openEditModal(patient: Patient) {
    setEditPatient(patient);
    setEditForm({
      name: patient.name,
      phone: patient.phone || "",
      email: patient.email || "",
    });
    const cvMap: Record<string, string> = {};
    for (const cv of patient.customValues || []) {
      cvMap[cv.columnKey] = cv.value;
    }
    setEditCustomValues(cvMap);
  }

  async function handleEditSave() {
    if (!editPatient) return;
    setEditSaving(true);
    try {
      // Save basic fields if changed
      const basicChanged =
        editForm.name !== editPatient.name ||
        editForm.phone !== (editPatient.phone || "") ||
        editForm.email !== (editPatient.email || "");

      if (basicChanged) {
        const res = await fetch(`/api/customers/${editPatient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Güncelleme başarısız");
        }
      }

      // Save changed custom values
      const oldCvMap: Record<string, string> = {};
      for (const cv of editPatient.customValues || []) {
        oldCvMap[cv.columnKey] = cv.value;
      }

      const changedCustom = Object.entries(editCustomValues).filter(
        ([key, val]) => val !== (oldCvMap[key] || ""),
      );

      await Promise.all(
        changedCustom.map(([columnKey, value]) =>
          fetch(`/api/customers/${editPatient.id}/custom-value`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ columnKey, value }),
          }),
        ),
      );

      // Update local state
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== editPatient.id) return p;
          const updatedCustomValues = [...(p.customValues || [])];
          for (const [key, val] of changedCustom) {
            const idx = updatedCustomValues.findIndex((v) => v.columnKey === key);
            if (idx >= 0) updatedCustomValues[idx] = { ...updatedCustomValues[idx], value: val };
            else updatedCustomValues.push({ columnKey: key, value: val });
          }
          return {
            ...p,
            name: editForm.name,
            phone: editForm.phone || null,
            email: editForm.email || null,
            customValues: updatedCustomValues,
          };
        }),
      );

      setEditPatient(null);
    } catch {
      // silent
    } finally {
      setEditSaving(false);
    }
  }

  const filteredPatients = riskFilter === "all"
    ? patients
    : patients.filter((p) => p.riskStatus === riskFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3 max-w-xl flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Müşteri ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
            />
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 pr-8 text-sm text-gray-700 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
          >
            <option value="all">Tümü</option>
            <option value="active">Aktif</option>
            <option value="warning">Dikkat</option>
            <option value="risk">Kayıp Riski</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Link href="/customers/import">
            <Button variant="outline" size="sm" className="gap-1">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">İçe Aktar</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowExportModal(true)}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Dışa Aktar</span>
          </Button>
        </div>
      </motion.div>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dışa Aktarılacak Verileri Seçin</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <input type="checkbox" checked disabled className="rounded" />
              Müşteri Adı (zorunlu)
            </label>
            {[
              { key: "phone", label: "Telefon" },
              { key: "email", label: "Email" },
              { key: "date", label: "Kayıt Tarihi" },
              { key: "treatments", label: "Tedavi Geçmişi (işlem adı, kategori, tutar, tarih)" },
              { key: "count", label: "İşlem Sayısı" },
              { key: "revenue", label: "Toplam Ciro" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportColumns[key] ?? false}
                  onChange={(e) => setExportColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="rounded"
                />
                {label}
              </label>
            ))}
            {customColumns.map((col) => (
              <label key={col.columnKey} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportColumns[`custom_${col.columnKey}`] ?? false}
                  onChange={(e) =>
                    setExportColumns((prev) => ({ ...prev, [`custom_${col.columnKey}`]: e.target.checked }))
                  }
                  className="rounded"
                />
                {col.columnName}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              İptal
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? "İndiriliyor..." : "Excel İndir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete column confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sütunu Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bu sütunu ve tüm verileri silmek istediğinize emin misiniz?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteColumn(deleteConfirm)}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={!!editPatient} onOpenChange={(open) => !open && setEditPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müşteri Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Ad Soyad</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefon</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            {customColumns.length > 0 && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-sm font-medium text-gray-700">Özel Alanlar</p>
                {customColumns.map((col) => (
                  <div key={col.columnKey} className="space-y-2">
                    <Label htmlFor={`edit-custom-${col.columnKey}`}>{col.columnName}</Label>
                    <Input
                      id={`edit-custom-${col.columnKey}`}
                      value={editCustomValues[col.columnKey] || ""}
                      onChange={(e) =>
                        setEditCustomValues((prev) => ({
                          ...prev,
                          [col.columnKey]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPatient(null)}>
              İptal
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Müşteri list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#6366F1]" />
                <CardTitle>Müşteri Listesi</CardTitle>
                {!loading && filteredPatients.length > 0 && (
                  <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#4F46E5]">
                    {filteredPatients.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href="/patients/settings">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" />
                    Alanları Düzenle
                  </Button>
                </Link>
                <Link href="/patients/new">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Yeni Müşteri
                  </Button>
                </Link>
                {customColumns.length > 0 && (
                  <button
                    onClick={() => setColumnEditMode(!columnEditMode)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      columnEditMode
                        ? "bg-[#1E1E2D] text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    {columnEditMode ? "Tamam" : "Düzenle"}
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <div className="flex min-h-[300px] items-center justify-center p-6">
                <div className="text-center">
                  <p className="text-sm text-red-500">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm font-medium text-[#6366F1] hover:underline"
                  >
                    Tekrar dene
                  </button>
                </div>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center p-6">
                <div className="text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">
                    {search ? "Arama sonucu bulunamadı" : "Henüz müşteri kaydı yok"}
                  </p>
                  {!search && (
                    <Link
                      href="/patients/new"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#6366F1] hover:text-[#4F46E5]"
                    >
                      İlk müşterinizi ekleyin
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="space-y-2 md:hidden">
                  {filteredPatients.map((patient, i) => (
                    <motion.div key={patient.id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                      <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-sm font-semibold text-[#4F46E5]">
                          {patient.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="min-w-0 flex-1 transition-colors hover:bg-gray-50 active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium text-gray-900">{patient.name}</p>
                            {(() => {
                              const badge = getRiskBadge(patient.riskStatus, patient.daysSinceLastVisit);
                              return badge ? (
                                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                                  {badge.emoji} {badge.label}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {patient.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </span>
                            )}
                            <span>{patient._count?.treatments ?? 0} işlem</span>
                          </div>
                        </Link>
                        <button
                          onClick={() => openEditModal(patient)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-[#6366F1]"
                          title="Düzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <Link href={`/patients/${patient.id}`}>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>İşlem Sayısı</TableHead>
                        <TableHead>Kayıt Tarihi</TableHead>
                        {customColumns.map((col) => (
                          <TableHead key={col.columnKey}>
                            <div className="flex items-center gap-1">
                              {col.columnName}
                              {columnEditMode && (
                                <button
                                  onClick={() => setDeleteConfirm(col.columnKey)}
                                  className="ml-1 rounded-full p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  title="Sütunu sil"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </TableHead>
                        ))}
                        <TableHead>
                          {showAddColumn ? (
                            <div className="flex items-center gap-1">
                              <Input
                                autoFocus
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddColumn();
                                  if (e.key === "Escape") { setShowAddColumn(false); setNewColumnName(""); }
                                }}
                                placeholder="Sütun adı"
                                className="h-7 w-28 text-xs"
                              />
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleAddColumn}>
                                Ekle
                              </Button>
                              <button
                                onClick={() => { setShowAddColumn(false); setNewColumnName(""); }}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                title="İptal"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowAddColumn(true)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-[#EEF2FF] hover:text-[#6366F1]"
                              title="Özel sütun ekle"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.map((patient, i) => (
                        <motion.tr key={patient.id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-sm font-semibold text-[#4F46E5]">
                                {patient.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {patient.name}
                              </span>
                              {(() => {
                                const badge = getRiskBadge(patient.riskStatus, patient.daysSinceLastVisit);
                                return badge ? (
                                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                                    {badge.emoji} {badge.label}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {editingCell?.id === patient.id && editingCell.field === "phone" ? (
                              <Input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleInlineSave(patient.id, "phone", editValue)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleInlineSave(patient.id, "phone", editValue);
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                className="h-8 w-36 text-sm"
                              />
                            ) : (
                              <span
                                className="cursor-pointer rounded px-1 py-0.5 text-sm text-gray-600 hover:bg-[#EEF2FF]"
                                onClick={() => startEdit(patient.id, "phone", patient.phone)}
                              >
                                {patient.phone || <span className="text-gray-300">&mdash;</span>}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingCell?.id === patient.id && editingCell.field === "email" ? (
                              <Input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleInlineSave(patient.id, "email", editValue)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleInlineSave(patient.id, "email", editValue);
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                className="h-8 w-44 text-sm"
                              />
                            ) : (
                              <span
                                className="cursor-pointer truncate rounded px-1 py-0.5 text-sm text-gray-600 hover:bg-[#EEF2FF]"
                                onClick={() => startEdit(patient.id, "email", patient.email)}
                              >
                                {patient.email || <span className="text-gray-300">&mdash;</span>}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{patient._count?.treatments ?? 0}</TableCell>
                          <TableCell>{formatDate(patient.createdAt)}</TableCell>
                          {customColumns.map((col) => {
                            const cv = patient.customValues?.find((v) => v.columnKey === col.columnKey);
                            const cellKey = `custom_${col.columnKey}`;
                            return (
                              <TableCell key={col.columnKey}>
                                {editingCell?.id === patient.id && editingCell.field === cellKey ? (
                                  <Input
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleCustomValueSave(patient.id, col.columnKey, editValue)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleCustomValueSave(patient.id, col.columnKey, editValue);
                                      if (e.key === "Escape") setEditingCell(null);
                                    }}
                                    className="h-8 w-32 text-sm"
                                  />
                                ) : (
                                  <span
                                    className="cursor-pointer rounded px-1 py-0.5 text-sm text-gray-600 hover:bg-[#EEF2FF]"
                                    onClick={() => startEdit(patient.id, cellKey, cv?.value || "")}
                                  >
                                    {cv?.value || <span className="text-gray-300">&mdash;</span>}
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditModal(patient)}
                                title="Düzenle"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Link href={`/patients/${patient.id}`}>
                                <Button variant="outline" size="sm">
                                  Detay
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
