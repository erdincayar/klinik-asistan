"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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

const categoryLabels: Record<string, string> = {
  GENERAL: "Genel",
  BEFORE: "Tedavi Öncesi",
  AFTER: "Tedavi Sonrası",
  XRAY: "Röntgen",
  OTHER: "Diğer",
};

const treatmentLabels: Record<string, string> = {
  BOTOX: "Botoks",
  DOLGU: "Dolgu",
  DIS_TEDAVI: "Diş Tedavi",
  GENEL: "Genel",
};

const categoryColors: Record<string, string> = {
  BOTOX: "bg-purple-100 text-purple-700",
  DOLGU: "bg-pink-100 text-pink-700",
  DIS_TEDAVI: "bg-amber-100 text-amber-700",
  GENEL: "bg-gray-100 text-gray-700",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

export default function PatientDetailPage() {
  const params = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "" });

  // Photo states
  const [photoFilter, setPhotoFilter] = useState("ALL");
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("GENERAL");
  const [uploadNotes, setUploadNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PatientPhoto | null>(null);

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

  useEffect(() => {
    async function fetchPatient() {
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
    }
    fetchPatient();
    fetchPhotos();
  }, [params.id, fetchPhotos]);

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
  const beforePhotos = photos.filter((p) => p.category === "BEFORE");
  const afterPhotos = photos.filter((p) => p.category === "AFTER");

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

  return (
    <div className="space-y-6">
      {/* Patient Info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {patient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{patient.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editing ? "İptal" : "Düzenle"}
            </button>
            <Link
              href={`/finance/new-income?patientId=${patient.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni İşlem
            </Link>
          </div>
        </div>

        <div className="p-6">
          {editing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Ad Soyad</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Telefon</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Email</label>
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Notlar</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                {patient.phone || "Telefon girilmemiş"}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                {patient.email || "Email girilmemiş"}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                Kayıt: {formatDate(patient.createdAt)}
              </div>
              {patient.notes && (
                <div className="flex items-start gap-2 text-sm text-gray-600 sm:col-span-2">
                  <FileText className="mt-0.5 h-4 w-4 text-gray-400" />
                  {patient.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Photos Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Fotoğraflar</h2>
            {photos.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {photos.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {beforePhotos.length > 0 && afterPhotos.length > 0 && (
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  compareMode ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
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
              dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Yükleniyor...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <div className="flex items-center gap-3">
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
                  >
                    {Object.entries(categoryLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <input
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="Not (opsiyonel)"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700">
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Tedavi Öncesi</p>
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Tedavi Sonrası</p>
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
                <div className="flex gap-2 flex-wrap">
                  {["ALL", ...Object.keys(categoryLabels)].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPhotoFilter(cat)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        photoFilter === cat
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat === "ALL" ? "Tümü" : categoryLabels[cat]}
                    </button>
                  ))}
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
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                          {categoryLabels[photo.category]}
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
            <button
              className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-5 w-5" />
            </button>
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
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Tedavi Geçmişi</h2>
        </div>

        {patient.treatments.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center p-6">
            <p className="text-sm text-gray-500">Henüz tedavi kaydı yok</p>
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
                  <span className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(treatment.amount)}
                  </span>
                </motion.div>
              ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
