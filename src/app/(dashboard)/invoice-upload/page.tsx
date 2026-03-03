"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  Link2,
  Check,
  ChevronDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface UploadedInvoice {
  id: string;
  fileName: string;
  fileUrl: string;
  status: string;
  invoiceType: string;
  vendor: string | null;
  amount: number | null;
  category: string | null;
  invoiceDate: string | null;
  ocrData: Record<string, unknown> | null;
  approved: boolean;
  createdAt: string;
}

interface MatchedProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  score: number;
}

interface StockMapping {
  description: string;
  productId: string | null;
  productName: string | null;
  quantity: number;
  unitPrice: number;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
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
  const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [selectedInvoice, setSelectedInvoice] = useState<UploadedInvoice | null>(null);

  // Stock matching state
  const [stockMappings, setStockMappings] = useState<StockMapping[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [approveSuccess, setApproveSuccess] = useState("");
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

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

  const filteredInvoices = invoices.filter((inv) => inv.invoiceType === activeTab);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

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
        formData.append("invoiceType", activeTab);
        try {
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
      setUploading(false);
    }

    if (successCount > 0) {
      setUploadSuccess(`${successCount} fatura başarıyla işlendi.`);
      setTimeout(() => setUploadSuccess(""), 5000);
    }
    if (failCount > 0) {
      setUploadError(`${failCount} fatura işlenemedi. Lütfen tekrar deneyin.`);
      setTimeout(() => setUploadError(""), 8000);
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const openDetail = useCallback(async (inv: UploadedInvoice) => {
    setSelectedInvoice(inv);
    setApproveError("");
    setApproveSuccess("");
    setStockMappings([]);
    setAllProducts([]);
    setOpenDropdown(null);

    if (inv.ocrData && (inv.ocrData as any).items && !inv.approved) {
      setMatchLoading(true);
      try {
        const res = await fetch("/api/invoices/ocr/match-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: (inv.ocrData as any).items }),
        });
        if (res.ok) {
          const data = await res.json();
          setAllProducts(data.products || []);
          setStockMappings(
            data.matches.map((m: { description: string; quantity: number; unitPrice: number; matchedProduct: MatchedProduct | null }) => ({
              description: m.description,
              productId: m.matchedProduct?.id || null,
              productName: m.matchedProduct?.name || null,
              quantity: m.quantity || 1,
              unitPrice: m.unitPrice || 0,
            }))
          );
        }
      } catch {
        // Silently fail
      } finally {
        setMatchLoading(false);
      }
    }
  }, []);

  async function handleApprove() {
    if (!selectedInvoice) return;
    setApproving(true);
    setApproveError("");
    setApproveSuccess("");

    try {
      const res = await fetch(`/api/invoices/ocr/${selectedInvoice.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockMappings }),
      });
      const data = await res.json();
      if (res.ok) {
        setApproveSuccess("Fatura onaylandı ve kayıtlar oluşturuldu.");
        await fetchInvoices();
        setTimeout(() => {
          setSelectedInvoice(null);
          setApproveSuccess("");
        }, 2000);
      } else {
        setApproveError(data.error || "Onaylama hatası");
      }
    } catch {
      setApproveError("Bir hata oluştu");
    } finally {
      setApproving(false);
    }
  }

  function updateMapping(index: number, productId: string | null, productName: string | null) {
    setStockMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, productId, productName } : m))
    );
    setOpenDropdown(null);
  }

  function updateMappingQuantity(index: number, quantity: number) {
    setStockMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, quantity } : m))
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("EXPENSE")}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "EXPENSE"
              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          <ArrowDownCircle className="h-4 w-4" />
          Gider Faturaları
        </button>
        <button
          onClick={() => setActiveTab("INCOME")}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "INCOME"
              ? "bg-green-50 text-green-700 ring-1 ring-green-200"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          <ArrowUpCircle className="h-4 w-4" />
          Gelir Faturaları
        </button>
      </div>

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
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                activeTab === "EXPENSE" ? "bg-red-50" : "bg-green-50"
              }`}>
                <Upload className={`h-6 w-6 ${activeTab === "EXPENSE" ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {activeTab === "EXPENSE" ? "Gider faturası" : "Gelir faturası"} yüklemek için sürükleyin
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  veya dosya seçmek için tıklayın (PDF, JPG, PNG)
                </p>
              </div>
              <label className={`cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-colors ${
                activeTab === "EXPENSE"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}>
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
            <FileText className={`h-4 w-4 ${activeTab === "EXPENSE" ? "text-red-600" : "text-green-600"}`} />
            <h2 className="text-sm font-semibold text-gray-900">
              {activeTab === "EXPENSE" ? "Gider" : "Gelir"} Faturaları
            </h2>
            {!loading && filteredInvoices.length > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                activeTab === "EXPENSE" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
              }`}>
                {filteredInvoices.length}
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
        ) : filteredInvoices.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center p-6">
            <div className="text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">
                Henüz {activeTab === "EXPENSE" ? "gider" : "gelir"} faturası yüklenmemiş
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredInvoices.map((inv, i) => {
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
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      inv.invoiceType === "EXPENSE" ? "bg-red-50" : "bg-green-50"
                    }`}>
                      {inv.invoiceType === "EXPENSE" ? (
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.fileName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {inv.vendor && (
                          <span className="text-xs text-gray-500">{inv.vendor}</span>
                        )}
                        {inv.amount != null && inv.amount > 0 && (
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
                    {inv.approved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        <Check className="h-3 w-3" />
                        Onaylı
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.color}`}>
                      <StatusIcon className={`h-3 w-3 ${inv.status === "PROCESSING" ? "animate-spin" : ""}`} />
                      {status.label}
                    </span>
                    {inv.status === "COMPLETED" && (
                      <button
                        onClick={() => openDetail(inv)}
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

      {/* Detail + Stock Matching Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => { setSelectedInvoice(null); setOpenDropdown(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Fatura Detayı</h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  selectedInvoice.invoiceType === "EXPENSE"
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}>
                  {selectedInvoice.invoiceType === "EXPENSE" ? (
                    <><ArrowDownCircle className="h-3 w-3" /> Gider</>
                  ) : (
                    <><ArrowUpCircle className="h-3 w-3" /> Gelir</>
                  )}
                </span>
              </div>

              <div className="space-y-4">
                {/* Invoice info */}
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

                {/* Stock Matching Section */}
                {selectedInvoice.ocrData && (selectedInvoice.ocrData as any).items && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Kalemler & Stok Eşleştirme
                      </p>
                    </div>

                    {matchLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-sm text-gray-500">Ürünler eşleştiriliyor...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {stockMappings.map((mapping, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-gray-100 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {mapping.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {mapping.unitPrice > 0
                                    ? `${mapping.unitPrice.toLocaleString("tr-TR")} TL x ${mapping.quantity}`
                                    : `${mapping.quantity} adet`}
                                </p>
                              </div>

                              {!selectedInvoice.approved && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={1}
                                    value={mapping.quantity}
                                    onChange={(e) => updateMappingQuantity(idx, Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-center"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Product match */}
                            <div className="mt-2">
                              {selectedInvoice.approved ? (
                                mapping.productId ? (
                                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                                    <Link2 className="h-3 w-3" />
                                    <span className="font-medium">{mapping.productName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">Eşleşme yok</span>
                                )
                              ) : (
                                <div className="relative">
                                  <button
                                    onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
                                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${
                                      mapping.productId
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      {mapping.productId ? (
                                        <>
                                          <Link2 className="h-3 w-3 shrink-0" />
                                          {mapping.productName}
                                        </>
                                      ) : (
                                        <>
                                          <Package className="h-3 w-3 shrink-0" />
                                          Ürün eşleştir...
                                        </>
                                      )}
                                    </span>
                                    <ChevronDown className="h-3 w-3 shrink-0" />
                                  </button>

                                  {openDropdown === idx && (
                                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                                      <button
                                        onClick={() => updateMapping(idx, null, null)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
                                      >
                                        <XCircle className="h-3 w-3" />
                                        Eşleştirme kaldır
                                      </button>
                                      {allProducts.map((product) => (
                                        <button
                                          key={product.id}
                                          onClick={() => updateMapping(idx, product.id, product.name)}
                                          className={`flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-blue-50 ${
                                            mapping.productId === product.id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                                          }`}
                                        >
                                          <span className="truncate">{product.name}</span>
                                          <span className="shrink-0 ml-2 text-gray-400">
                                            Stok: {product.currentStock} {product.unit}
                                          </span>
                                        </button>
                                      ))}
                                      {allProducts.length === 0 && (
                                        <p className="px-3 py-2 text-xs text-gray-400">Envanterde ürün bulunamadı</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {stockMappings.length === 0 && !matchLoading && (
                          <p className="text-xs text-gray-400 text-center py-4">
                            Faturada kalem bilgisi bulunamadı
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Approve section */}
                {!selectedInvoice.approved && selectedInvoice.status === "COMPLETED" && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Onay
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {selectedInvoice.invoiceType === "EXPENSE"
                        ? "Onaylandığında gider kaydı oluşturulacak ve eşleştirilen ürünlerin stoku artırılacaktır."
                        : "Onaylandığında eşleştirilen ürünlerin stoku düşürülecektir."}
                    </p>

                    {approveError && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                        <XCircle className="h-3.5 w-3.5" />
                        {approveError}
                      </div>
                    )}
                    {approveSuccess && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {approveSuccess}
                      </div>
                    )}

                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {approving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Onaylanıyor...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Onayla ve Kaydet
                        </>
                      )}
                    </button>
                  </div>
                )}

                {selectedInvoice.approved && (
                  <div className="rounded-xl bg-emerald-50 p-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-700">Bu fatura onaylanmış</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setSelectedInvoice(null); setOpenDropdown(null); }}
                className="mt-4 w-full rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Kapat
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
