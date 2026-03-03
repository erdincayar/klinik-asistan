"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface UploadedInvoice {
  id: string;
  fileName: string;
  fileUrl: string;
  status: string;
  vendor: string | null;
  amount: number | null;
  category: string | null;
  invoiceDate: string | null;
  ocrData: Record<string, unknown> | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Bekliyor", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  PROCESSING: { label: "İşleniyor", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  COMPLETED: { label: "Tamamlandı", color: "bg-green-100 text-green-700", icon: CheckCircle },
  FAILED: { label: "Hata", color: "bg-red-100 text-red-700", icon: XCircle },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

export default function InvoiceUploadPage() {
  const [invoices, setInvoices] = useState<UploadedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<UploadedInvoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch("/api/invoices/ocr");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    // Validate file types
    const validExts = [".pdf", ".jpg", ".jpeg", ".png"];
    const invalidFiles = Array.from(files).filter(
      (f) => !validExts.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (invalidFiles.length > 0) {
      setUploadError("Desteklenmeyen format. Sadece PDF, JPG, PNG yüklenebilir.");
      setTimeout(() => setUploadError(""), 8000);
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          // 2 minute safety timeout per file
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 120000);

          const res = await fetch("/api/invoices/ocr", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const data = await res.json();
          if (res.ok && data.status !== "FAILED") {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      await fetchInvoices();
    } finally {
      // ALWAYS reset uploading state
      setUploading(false);
    }

    if (successCount > 0) {
      setUploadSuccess(`${successCount} fatura başarıyla işlendi.`);
      setTimeout(() => setUploadSuccess(""), 5000);
    }
    if (failCount > 0) {
      setUploadError(
        `${failCount} fatura işlenemedi. Lütfen tekrar deneyin.`
      );
      setTimeout(() => setUploadError(""), 8000);
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-gray-600">Fatura işleniyor...</p>
              <p className="text-xs text-gray-400">AI ile fatura okunuyor</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Fatura yüklemek için sürükleyin
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  veya dosya seçmek için tıklayın (PDF, JPG, PNG)
                </p>
              </div>
              <label className="cursor-pointer rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                Dosya Seç
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={(e) => handleUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            <XCircle className="h-4 w-4 shrink-0" />
            {uploadError}
          </motion.div>
        )}
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600"
          >
            <CheckCircle className="h-4 w-4 shrink-0" />
            {uploadSuccess}
          </motion.div>
        )}
      </motion.div>

      {/* Invoice List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Yüklenen Faturalar</h2>
            {!loading && invoices.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {invoices.length}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center p-6">
            <div className="text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Henüz fatura yüklenmemiş</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map((inv, i) => {
              const status = statusConfig[inv.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;
              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50/70"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                      <FileText className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.fileName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {inv.vendor && (
                          <span className="text-xs text-gray-500">{inv.vendor}</span>
                        )}
                        {inv.amount && (
                          <span className="text-xs font-semibold text-gray-700">
                            {formatCurrency(Math.round(inv.amount * 100))}
                          </span>
                        )}
                        {inv.invoiceDate && (
                          <span className="text-xs text-gray-400">
                            {new Date(inv.invoiceDate).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.color}`}>
                      <StatusIcon className={`h-3 w-3 ${inv.status === "PROCESSING" ? "animate-spin" : ""}`} />
                      {status.label}
                    </span>
                    {inv.ocrData && (
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* OCR Detail Modal */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedInvoice(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Fatura Detayı</h3>
            <div className="space-y-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Satıcı</p>
                    <p className="font-medium text-gray-800">{selectedInvoice.vendor || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Tarih</p>
                    <p className="font-medium text-gray-800">
                      {selectedInvoice.invoiceDate
                        ? new Date(selectedInvoice.invoiceDate).toLocaleDateString("tr-TR")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Tutar</p>
                    <p className="font-medium text-gray-800">
                      {selectedInvoice.amount
                        ? formatCurrency(Math.round(selectedInvoice.amount * 100))
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kategori</p>
                    <p className="font-medium text-gray-800">{selectedInvoice.category || "—"}</p>
                  </div>
                </div>
              </div>
              {selectedInvoice.ocrData && (selectedInvoice.ocrData as any).items && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Kalemler
                  </p>
                  <div className="space-y-2">
                    {((selectedInvoice.ocrData as any).items as Array<{ description: string; quantity: number; unitPrice: number; total: number }>).map(
                      (item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm"
                        >
                          <span className="text-gray-700">{item.description}</span>
                          <span className="font-medium text-gray-900">
                            {item.total?.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="mt-4 w-full rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
            >
              Kapat
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
