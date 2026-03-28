"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  UserPlus,
  UserMinus,
  Download,
  Loader2,
  Eye,
  ChevronRight,
  Plus,
  Upload,
  Trash2,
  Printer,
  Sparkles,
  FolderOpen,
  File,
  ClipboardCheck,
  Send,
  Link2,
  Copy,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/* ──────────────────────── TYPES ──────────────────────── */

interface DocumentDef {
  type: string;
  label: string;
  description: string;
}

interface Category {
  id: string;
  label: string;
  icon: typeof UserPlus;
  documents: DocumentDef[];
}

interface HrDocument {
  id: string;
  name: string;
  category: string;
  source: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  phone?: string;
  salaryGross?: number;
  salaryNet?: number;
}

/* ──────────────────────── DATA ──────────────────────── */

const categories: Category[] = [
  {
    id: "hire",
    label: "İşe Alış",
    icon: UserPlus,
    documents: [
      { type: "is_sozlesmesi", label: "İş Sözleşmesi", description: "4857 sayılı İş Kanunu'na uygun belirsiz süreli iş sözleşmesi" },
      { type: "ise_baslama_bildirimi", label: "İşe Başlama Bildirimi", description: "SGK işe giriş bildirimi formu" },
      { type: "ozluk_formu", label: "Özlük Dosyası Formu", description: "Çalışan özlük bilgileri formu" },
      { type: "gizlilik_sozlesmesi", label: "Gizlilik Sözleşmesi", description: "Ticari sır ve gizlilik taahhütnamesi" },
    ],
  },
  {
    id: "terminate",
    label: "İşten Çıkarma",
    icon: UserMinus,
    documents: [
      { type: "istifa_dilekçesi", label: "İstifa Dilekçesi", description: "Çalışan istifa beyan dilekçesi" },
      { type: "fesih_bildirimi", label: "Fesih Bildirimi", description: "İşveren tarafından fesih bildirimi" },
      { type: "kidem_ihbar_formu", label: "Kıdem/İhbar Tazminatı Formu", description: "Kıdem ve ihbar tazminatı hesap formu" },
      { type: "ibraname", label: "İbraname", description: "İş ilişkisi sona erme ibranamesi" },
    ],
  },
];

const categoryLabels: Record<string, string> = {
  hire: "İşe Alış",
  terminate: "İşten Çıkarma",
  other: "Diğer",
};

/* ──────────────────────── PAGE ──────────────────────── */

function HRDocumentsTab() {
  // Selection state
  const [activeCategory, setActiveCategory] = useState("hire");
  const [selectedDoc, setSelectedDoc] = useState<DocumentDef | null>(null);
  const [selectedDbDoc, setSelectedDbDoc] = useState<HrDocument | null>(null);
  const [activeTab, setActiveTab] = useState("ai");

  // Documents from DB
  const [aiDocs, setAiDocs] = useState<HrDocument[]>([]);
  const [uploadDocs, setUploadDocs] = useState<HrDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  // Form state
  const [employeeName, setEmployeeName] = useState("");
  const [tcNo, setTcNo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedLabel, setGeneratedLabel] = useState("");

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Create dialog form
  const [newDocName, setNewDocName] = useState("");
  const [newDocCategory, setNewDocCategory] = useState("other");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Upload dialog form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploading, setUploading] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Data loading ───
  const fetchDocuments = useCallback(async () => {
    try {
      setDocsLoading(true);
      const [aiRes, uploadRes] = await Promise.all([
        fetch("/api/hr/documents?source=AI"),
        fetch("/api/hr/documents?source=UPLOAD"),
      ]);
      if (aiRes.ok) setAiDocs(await aiRes.json());
      if (uploadRes.ok) setUploadDocs(await uploadRes.json());
    } catch {
      // silent
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : data.employees || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchEmployees();
  }, [fetchDocuments, fetchEmployees]);

  // ─── Employee selection auto-fill ───
  useEffect(() => {
    if (!selectedEmployeeId) return;
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (emp) {
      setEmployeeName(emp.name);
      setPosition(emp.role || "");
      if (emp.salaryGross) {
        setSalary(String(Math.round(emp.salaryGross / 100)));
      }
    }
  }, [selectedEmployeeId, employees]);

  // ─── Select a built-in document type ───
  const handleSelectBuiltinDoc = (doc: DocumentDef) => {
    setSelectedDoc(doc);
    setSelectedDbDoc(null);
    setGeneratedContent("");
    setError("");
  };

  // ─── Select a DB document ───
  const handleSelectDbDoc = (doc: HrDocument) => {
    setSelectedDbDoc(doc);
    setSelectedDoc(null);
    setGeneratedContent("");
    setError("");
  };

  // ─── Generate document (built-in types) ───
  const handleGenerate = async () => {
    if (!selectedDoc) return;
    if (!employeeName || !tcNo || !startDate || !position || !salary) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }
    if (tcNo.length !== 11 || !/^\d+$/.test(tcNo)) {
      setError("TC Kimlik No 11 haneli rakamlardan oluşmalıdır.");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedContent("");

    try {
      const res = await fetch("/api/hr/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: selectedDoc.type,
          employeeName,
          tcNo,
          startDate,
          position,
          salary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Belge oluşturulamadı.");
        return;
      }

      setGeneratedContent(data.content);
      setGeneratedLabel(data.documentLabel);
      fetchDocuments();
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Fill document (DB documents) ───
  const handleFillDocument = async () => {
    if (!selectedDbDoc) return;
    if (!employeeName) {
      setError("Lütfen en az çalışan adını girin.");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedContent("");

    try {
      const res = await fetch("/api/hr/fill-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDbDoc.id,
          employeeName,
          tcNo: tcNo || undefined,
          startDate: startDate || undefined,
          position: position || undefined,
          salary: salary || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Belge doldurulamadı.");
        return;
      }

      setGeneratedContent(data.content);
      setGeneratedLabel(data.documentName);
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Create new AI document ───
  const handleCreateDocument = async () => {
    if (!newDocName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/hr/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "custom",
          customName: newDocName,
          customDescription: newDocDescription,
          category: newDocCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Belge oluşturulamadı.");
        return;
      }

      setCreateDialogOpen(false);
      setNewDocName("");
      setNewDocCategory("other");
      setNewDocDescription("");
      fetchDocuments();
    } catch {
      setError("Bir hata oluştu.");
    } finally {
      setCreating(false);
    }
  };

  // ─── Upload document ───
  const handleUploadDocument = async () => {
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName);
      formData.append("category", uploadCategory);

      const res = await fetch("/api/hr/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Dosya yüklenemedi.");
        return;
      }

      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadName("");
      setUploadCategory("other");
      fetchDocuments();
    } catch {
      setError("Bir hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete document ───
  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch("/api/hr/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });

      if (res.ok) {
        if (selectedDbDoc?.id === id) {
          setSelectedDbDoc(null);
          setGeneratedContent("");
        }
        fetchDocuments();
      }
    } catch {
      // silent
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // ─── Print ───
  const handlePrint = () => {
    if (!previewRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${generatedLabel}</title>
          <style>
            @page { margin: 2cm; }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
            }
            h1, h2, h3 { font-weight: bold; }
            h1 { font-size: 16pt; text-align: center; margin-bottom: 24pt; }
            h2 { font-size: 14pt; margin-top: 18pt; }
            h3 { font-size: 12pt; margin-top: 12pt; }
            p { margin: 6pt 0; text-align: justify; }
            ul, ol { margin: 6pt 0 6pt 20pt; }
            table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
            th, td { border: 1px solid #000; padding: 6pt 8pt; text-align: left; font-size: 11pt; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .signature-area { margin-top: 48pt; display: flex; justify-content: space-between; }
            .signature-box { width: 45%; text-align: center; }
            .signature-line { border-top: 1px solid #000; margin-top: 48pt; padding-top: 6pt; }
            hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }
            strong { font-weight: bold; }
          </style>
        </head>
        <body>
          ${formatContentToHTML(generatedContent)}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const isAnythingSelected = selectedDoc || selectedDbDoc;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ──── SOL PANEL ──── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4 xl:col-span-3 space-y-4"
        >
          {/* Kategoriler */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold transition-colors ${
                      isActive
                        ? "bg-orange-50 text-orange-700 border-l-4 border-orange-600"
                        : "text-gray-700 hover:bg-gray-50 border-l-4 border-transparent"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {cat.label}
                  </button>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="border-t border-gray-100"
                    >
                      {cat.documents.map((doc) => {
                        const isSelected = selectedDoc?.type === doc.type;
                        return (
                          <button
                            key={doc.type}
                            onClick={() => handleSelectBuiltinDoc(doc)}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 pl-8 text-sm text-left transition-colors ${
                              isSelected
                                ? "bg-orange-100 text-orange-800 font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1">{doc.label}</span>
                            {isSelected && <ChevronRight className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Belge Şablonları */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Belge Şablonları</h3>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-3 pt-3">
                <TabsList className="w-full bg-gray-100">
                  <TabsTrigger value="ai" className="flex-1 text-xs gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Belgeleri
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex-1 text-xs gap-1">
                    <FolderOpen className="w-3 h-3" />
                    Yüklenen
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="ai" className="px-1 pb-2">
                {docsLoading ? (
                  <div className="flex items-center justify-center py-6 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Yükleniyor...</span>
                  </div>
                ) : aiDocs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Henüz AI belgesi yok
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {aiDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer group transition-colors ${
                          selectedDbDoc?.id === doc.id
                            ? "bg-orange-100 text-orange-800"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                        onClick={() => handleSelectDbDoc(doc)}
                      >
                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-orange-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <span className="text-xs text-gray-400">{categoryLabels[doc.category] || doc.category}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(doc.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upload" className="px-1 pb-2">
                {docsLoading ? (
                  <div className="flex items-center justify-center py-6 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Yükleniyor...</span>
                  </div>
                ) : uploadDocs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Henüz belge yüklenmemiş
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {uploadDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer group transition-colors ${
                          selectedDbDoc?.id === doc.id
                            ? "bg-orange-100 text-orange-800"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                        onClick={() => handleSelectDbDoc(doc)}
                      >
                        <File className="w-3.5 h-3.5 flex-shrink-0 text-[#6366F1]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <span className="text-xs text-gray-400">
                            {doc.fileName || categoryLabels[doc.category]}
                            {doc.fileSize ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB` : ""}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(doc.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="px-3 pb-3 flex gap-2">
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
              >
                <Plus className="w-3.5 h-3.5" />
                AI ile Oluştur
              </button>
              <button
                onClick={() => setUploadDialogOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] rounded-lg hover:bg-[#E0E7FF] transition-colors border border-[#E0E7FF]"
              >
                <Upload className="w-3.5 h-3.5" />
                Belge Yükle
              </button>
            </div>
          </div>

          {/* Token bilgisi */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-800">
              <strong>Token Kullanımı:</strong> Her belge oluşturma/doldurma işlemi 3.000 token harcar.
            </p>
          </div>
        </motion.div>

        {/* ──── SAĞ PANEL ──── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-8 xl:col-span-9 space-y-6"
        >
          {!isAnythingSelected ? (
            /* Boş durum */
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Belge Seçilmedi
              </h3>
              <p className="text-gray-500 text-sm max-w-md">
                Soldaki listeden bir belge türü veya şablon seçin. Varsayılan belge türleriyle hızlıca oluşturabilir veya kayıtlı şablonlarınızı çalışan bilgileriyle doldurabilirsiniz.
              </p>
            </div>
          ) : (
            <>
              {/* Form */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {selectedDoc?.label || selectedDbDoc?.name || "Belge Bilgileri"}
                </h2>
                {selectedDoc && (
                  <p className="text-sm text-gray-500 mb-4">{selectedDoc.description}</p>
                )}
                {selectedDbDoc && (
                  <p className="text-sm text-gray-500 mb-4">
                    {selectedDbDoc.source === "AI" ? "AI ile oluşturulmuş şablon" : `Yüklenen belge: ${selectedDbDoc.fileName || ""}`}
                    {" · "}
                    {categoryLabels[selectedDbDoc.category] || selectedDbDoc.category}
                  </p>
                )}

                {/* Çalışan Seç */}
                {employees.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Çalışan Seç
                    </label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm bg-white"
                    >
                      <option value="">-- Manuel giriş --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ad Soyad *
                    </label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="Çalışanın adı soyadı"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TC Kimlik No {selectedDoc ? "*" : ""}
                    </label>
                    <input
                      type="text"
                      value={tcNo}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setTcNo(val);
                      }}
                      placeholder="11 haneli TC Kimlik No"
                      maxLength={11}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İşe Başlama Tarihi {selectedDoc ? "*" : ""}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pozisyon {selectedDoc ? "*" : ""}
                    </label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Örn: Yazılım Geliştirici"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aylık Brüt Maaş (TL) {selectedDoc ? "*" : ""}
                    </label>
                    <input
                      type="text"
                      value={salary}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d.,]/g, "");
                        setSalary(val);
                      }}
                      placeholder="Örn: 35000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  {selectedDoc && (
                    <button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Belge Oluştur
                        </>
                      )}
                    </button>
                  )}
                  {selectedDbDoc && (
                    <button
                      onClick={handleFillDocument}
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Dolduruluyor...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          AI ile Doldur
                        </>
                      )}
                    </button>
                  )}
                  {selectedDbDoc?.source === "UPLOAD" && selectedDbDoc.fileUrl && (
                    <a
                      href={selectedDbDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#1E1E2D] text-white rounded-lg hover:bg-[#2A2A3C] transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Orijinali Görüntüle
                    </a>
                  )}
                </div>
              </div>

              {/* Önizleme */}
              {generatedContent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">
                        {generatedLabel} — Önizleme
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        PDF İndir
                      </button>
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                      >
                        <Printer className="w-4 h-4" />
                        Yazdır
                      </button>
                    </div>
                  </div>
                  <div
                    ref={previewRef}
                    className="p-6 md:p-10 prose prose-sm max-w-none"
                    style={{ fontFamily: "'Times New Roman', serif" }}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatContentToHTML(generatedContent),
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* ──── AI ile Oluştur Dialog ──── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI ile Belge Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Belge Adı *
              </label>
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Örn: Zimmet Tutanağı"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <select
                value={newDocCategory}
                onChange={(e) => setNewDocCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm bg-white"
              >
                <option value="hire">İşe Alış</option>
                <option value="terminate">İşten Çıkarma</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama / Yönerge (opsiyonel)
              </label>
              <textarea
                value={newDocDescription}
                onChange={(e) => setNewDocDescription(e.target.value)}
                placeholder="AI'ya ne tür bir belge istediğinizi anlatın..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setCreateDialogOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleCreateDocument}
              disabled={creating || !newDocName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Oluştur
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Belge Yükle Dialog ──── */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Belge Yükle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dosya Seç *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setUploadFile(file);
                  if (file && !uploadName) {
                    setUploadName(file.name.replace(/\.[^.]+$/, ""));
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              <p className="text-xs text-gray-400 mt-1">
                PDF, DOCX, DOC, JPG, PNG — Maks. 10 MB
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Belge Adı *
              </label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Örn: Şirket İş Sözleşmesi"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm bg-white"
              >
                <option value="hire">İşe Alış</option>
                <option value="terminate">İşten Çıkarma</option>
                <option value="other">Diğer</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadFile(null);
                setUploadName("");
              }}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleUploadDocument}
              disabled={uploading || !uploadFile || !uploadName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E1E2D] text-white rounded-lg hover:bg-[#2A2A3C] disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Yükle
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Silme Onay Dialog ──── */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Belgeyi Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bu belge kalıcı olarak silinecek. Devam etmek istiyor musunuz?
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => deleteConfirmId && handleDeleteDocument(deleteConfirmId)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Sil
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────────────────── HELPERS ──────────────────────── */

function formatContentToHTML(markdown: string): string {
  let html = markdown
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, "<hr />")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  html = html.replace(
    /(<li>.*?<\/li>)(?:<br \/>)?/g,
    "$1"
  );
  html = html.replace(
    /((?:<li>.*?<\/li>)+)/g,
    "<ul>$1</ul>"
  );

  return `<p>${html}</p>`;
}

/* ══════════════════════════════════════════════════════════════ */
/*  ONAM FORMLARI TAB                                           */
/* ══════════════════════════════════════════════════════════════ */

interface ConsentFormItem {
  id: string;
  title: string;
  description: string | null;
  content: string;
  fields: any;
  isActive: boolean;
  createdAt: string;
  _count: { responses: number };
}

function ConsentFormsTab() {
  const [forms, setForms] = useState<ConsentFormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<ConsentFormItem | null>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [extraFields, setExtraFields] = useState<{ label: string; type: string; required: boolean }[]>([]);

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/consent-forms");
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const resetFormFields = () => {
    setTitle("");
    setDescription("");
    setContent("");
    setExtraFields([]);
  };

  const openCreate = () => {
    resetFormFields();
    setEditingForm(null);
    setShowCreateDialog(true);
  };

  const openEdit = (form: ConsentFormItem) => {
    setTitle(form.title);
    setDescription(form.description || "");
    setContent(form.content);
    setExtraFields(Array.isArray(form.fields) ? form.fields : []);
    setEditingForm(form);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        content: content.trim(),
        fields: extraFields.length > 0 ? extraFields : null,
      };

      const url = editingForm ? `/api/consent-forms/${editingForm.id}` : "/api/consent-forms";
      const method = editingForm ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreateDialog(false);
        resetFormFields();
        setEditingForm(null);
        fetchForms();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (form: ConsentFormItem) => {
    try {
      await fetch(`/api/consent-forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !form.isActive }),
      });
      fetchForms();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu onam formunu silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/consent-forms/${id}`, { method: "DELETE" });
      if (selectedForm?.id === id) setSelectedForm(null);
      fetchForms();
    } catch {
      // silent
    }
  };

  const handleViewResponses = async (form: ConsentFormItem) => {
    try {
      const res = await fetch(`/api/consent-forms/${form.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedForm(data.form);
      }
    } catch {
      // silent
    }
  };

  const copyLink = (formId: string) => {
    const url = `${window.location.origin}/onam/${formId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(formId);
    setTimeout(() => setCopiedId(""), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Müşterilerinize dijital onam formu gönderin, imzalatın ve yönetin
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#6366F1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni Onam Formu
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Form Listesi */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Yükleniyor...
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-4">
                <ClipboardCheck className="h-8 w-8 text-[#6366F1]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz onam formu yok</h3>
              <p className="text-sm text-gray-500 mb-4">
                Müşterilerinize göndermek için ilk onam formunuzu oluşturun
              </p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5]"
              >
                <Plus className="h-4 w-4" />
                Onam Formu Oluştur
              </button>
            </div>
          ) : (
            forms.map((form) => (
              <div
                key={form.id}
                className={`rounded-xl border bg-white p-4 transition-colors ${
                  selectedForm?.id === form.id ? "border-[#6366F1] ring-1 ring-[#6366F1]/20" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{form.title}</h3>
                      <Badge variant={form.isActive ? "success" : "default"}>
                        {form.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    {form.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{form.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(form)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                      title={form.isActive ? "Pasife Al" : "Aktif Et"}
                    >
                      {form.isActive ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(form)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                      title="Düzenle"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(form.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => copyLink(form.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {copiedId === form.id ? <Copy className="h-3.5 w-3.5 text-green-600" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copiedId === form.id ? "Kopyalandı!" : "Link Kopyala"}
                  </button>
                  <button
                    onClick={() => handleViewResponses(form)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Yanıtlar ({form._count.responses})
                  </button>
                  <a
                    href={`/onam/${form.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-[#E0E7FF] bg-[#EEF2FF] px-3 py-1.5 text-xs font-medium text-[#4F46E5] hover:bg-[#E0E7FF] transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Önizle
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Yanıt Detayları */}
        <div>
          {selectedForm ? (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="font-semibold text-gray-900 text-sm">{selectedForm.title} — Yanıtlar</h3>
                <p className="text-xs text-gray-500">{selectedForm.responses?.length || 0} yanıt</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
                {(selectedForm.responses || []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Henüz yanıt yok</p>
                ) : (
                  selectedForm.responses.map((resp: any) => (
                    <div key={resp.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{resp.patientName}</p>
                        <span className="text-[11px] text-gray-400">
                          {new Date(resp.signedAt).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      {resp.patientTc && (
                        <p className="text-xs text-gray-500 mt-0.5">TC: {resp.patientTc}</p>
                      )}
                      {resp.signature && (
                        <Badge variant="success" className="mt-1">İmzalandı</Badge>
                      )}
                      {resp.patient && (
                        <p className="text-xs text-[#6366F1] mt-1">
                          Kayıtlı müşteri: {resp.patient.name}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <ClipboardCheck className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Yanıtları görmek için bir form seçin</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? "Onam Formunu Düzenle" : "Yeni Onam Formu"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Form Başlığı *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ör: Botox Onam Formu"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Açıklama</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Form hakkında kısa açıklama"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Form İçeriği *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="Onam formunun tam metnini buraya yazın..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none resize-y"
              />
            </div>

            {/* Extra Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Ek Alanlar</label>
                <button
                  type="button"
                  onClick={() => setExtraFields([...extraFields, { label: "", type: "text", required: false }])}
                  className="text-xs font-medium text-[#6366F1] hover:underline"
                >
                  + Alan Ekle
                </button>
              </div>
              {extraFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => {
                      const fields = [...extraFields];
                      fields[idx] = { ...fields[idx], label: e.target.value };
                      setExtraFields(fields);
                    }}
                    placeholder="Alan adı"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#6366F1] outline-none"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => {
                      const fields = [...extraFields];
                      fields[idx] = { ...fields[idx], type: e.target.value };
                      setExtraFields(fields);
                    }}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <option value="text">Metin</option>
                    <option value="number">Sayı</option>
                    <option value="date">Tarih</option>
                    <option value="checkbox">Onay Kutusu</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        const fields = [...extraFields];
                        fields[idx] = { ...fields[idx], required: e.target.checked };
                        setExtraFields(fields);
                      }}
                      className="rounded"
                    />
                    Zorunlu
                  </label>
                  <button
                    onClick={() => setExtraFields(extraFields.filter((_, i) => i !== idx))}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowCreateDialog(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : editingForm ? "Güncelle" : "Oluştur"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  ANA SAYFA WRAPPER                                           */
/* ══════════════════════════════════════════════════════════════ */

export default function DocumentsPage() {
  const [activeMainTab, setActiveMainTab] = useState("hr");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">Belgeler</h1>
        <p className="text-gray-500 mt-1">
          İK belgeleri, onam formları ve özel belgelerinizi tek yerden yönetin
        </p>
      </motion.div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="hr" className="gap-1.5">
            <FileText className="h-4 w-4" />
            İK Belgeleri
          </TabsTrigger>
          <TabsTrigger value="consent" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            Onam Formları
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hr">
          <HRDocumentsTab />
        </TabsContent>

        <TabsContent value="consent">
          <ConsentFormsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
