"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  Image,
  Download,
  Check,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ImportedCustomer {
  name: string;
  phone: string;
  email: string;
  notes: string;
  source: string;
  selected: boolean;
}

interface UploadedFile {
  file: File;
  status: "pending" | "processing" | "done" | "error";
  result?: ImportedCustomer[];
  error?: string;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const FORMAT_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  "image/jpeg": { label: "JPG", icon: Image, color: "bg-green-100 text-green-800" },
  "image/png": { label: "PNG", icon: Image, color: "bg-green-100 text-green-800" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { label: "Excel", icon: FileSpreadsheet, color: "bg-emerald-100 text-emerald-800" },
  "application/vnd.ms-excel": { label: "Excel", icon: FileSpreadsheet, color: "bg-emerald-100 text-emerald-800" },
  "text/csv": { label: "CSV", icon: FileText, color: "bg-blue-100 text-blue-800" },
  "application/pdf": { label: "PDF", icon: FileText, color: "bg-red-100 text-red-800" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { label: "Word", icon: FileText, color: "bg-indigo-100 text-indigo-800" },
};

export default function CustomerImportPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [importedData, setImportedData] = useState<ImportedCustomer[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mappingDialog, setMappingDialog] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [saveResult, setSaveResult] = useState<{ success: number; failed: number } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  function addFiles(files: File[]) {
    const validFiles = files.filter((f) => ACCEPTED_TYPES.includes(f.type) || f.name.endsWith(".csv"));
    const newUploads: UploadedFile[] = validFiles.map((file) => ({
      file,
      status: "pending" as const,
    }));
    setUploadedFiles((prev) => [...prev, ...newUploads]);
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function processFiles() {
    setProcessing(true);
    const allCustomers: ImportedCustomer[] = [];
    const updated = [...uploadedFiles];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== "pending") continue;
      updated[i].status = "processing";
      setUploadedFiles([...updated]);

      try {
        const formData = new FormData();
        formData.append("file", updated[i].file);

        const isImage = updated[i].file.type.startsWith("image/");
        const endpoint = isImage ? "/api/customers/import/ocr" : "/api/customers/import";

        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("İşleme hatası");
        const data = await res.json();

        const customers: ImportedCustomer[] = (data.customers || []).map((c: any) => ({
          name: c.name || "",
          phone: c.phone || "",
          email: c.email || "",
          notes: c.notes || "",
          source: isImage ? "OCR" : updated[i].file.name,
          selected: true,
        }));

        updated[i].status = "done";
        updated[i].result = customers;
        allCustomers.push(...customers);
      } catch (err) {
        updated[i].status = "error";
        updated[i].error = err instanceof Error ? err.message : "Bilinmeyen hata";
      }
      setUploadedFiles([...updated]);
    }

    setImportedData((prev) => [...prev, ...allCustomers]);
    setProcessing(false);
    if (allCustomers.length > 0) {
      setStep("preview");
      setShowPreview(true);
    }
  }

  async function handleConfirmImport() {
    const selected = importedData.filter((c) => c.selected && c.name.trim());
    if (selected.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/customers/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: selected }),
      });

      if (!res.ok) throw new Error("Kaydetme hatası");
      const result = await res.json();
      setSaveResult({ success: result.created || selected.length, failed: result.failed || 0 });
      setStep("done");
    } catch {
      setSaveResult({ success: 0, failed: selected.length });
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/customers/export");
      if (!res.ok) throw new Error("Dışa aktarma hatası");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `musteriler-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // silently handle
    } finally {
      setExporting(false);
    }
  }

  function toggleCustomer(index: number) {
    setImportedData((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  }

  function updateCustomer(index: number, field: keyof ImportedCustomer, value: string) {
    setImportedData((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function resetAll() {
    setUploadedFiles([]);
    setImportedData([]);
    setStep("upload");
    setSaveResult(null);
    setShowPreview(false);
  }

  const selectedCount = importedData.filter((c) => c.selected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Veri Aktarımı</h1>
          <p className="text-sm text-gray-500">
            Müşteri verilerinizi içe veya dışa aktarın
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "İndiriliyor..." : "Dışa Aktar (Excel)"}
          </Button>
        </div>
      </div>

      {step === "done" && saveResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-800">
                İçe aktarma tamamlandı
              </p>
              <p className="text-sm text-green-600">
                {saveResult.success} müşteri başarıyla eklendi
                {saveResult.failed > 0 && `, ${saveResult.failed} kayıt eklenemedi`}
              </p>
            </div>
            <Button variant="outline" onClick={resetAll}>
              Yeni İçe Aktarma
            </Button>
          </CardContent>
        </Card>
      )}

      {step !== "done" && (
        <>
          {/* Upload Area */}
          <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
            <CardContent className="p-8">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl py-12 transition-colors ${
                  isDragging ? "bg-blue-50 border-blue-400" : "bg-gray-50"
                }`}
              >
                <div className="rounded-full bg-blue-100 p-4 mb-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-lg font-semibold text-gray-700 mb-1">
                  Dosyaları sürükleyip bırakın
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  veya dosya seçmek için tıklayın
                </p>
                <label>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.xlsx,.xls,.csv,.pdf,.docx"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4" />
                    Dosya Seç
                  </span>
                </label>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {[
                    { label: "Resim (JPG/PNG)", color: "bg-green-100 text-green-700" },
                    { label: "Excel", color: "bg-emerald-100 text-emerald-700" },
                    { label: "CSV", color: "bg-blue-100 text-blue-700" },
                    { label: "PDF", color: "bg-red-100 text-red-700" },
                    { label: "Word", color: "bg-indigo-100 text-indigo-700" },
                  ].map((fmt) => (
                    <Badge key={fmt.label} className={fmt.color}>
                      {fmt.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Yüklenen Dosyalar</CardTitle>
                <CardDescription>
                  {uploadedFiles.length} dosya yüklendi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uploadedFiles.map((uf, index) => {
                    const fmt = FORMAT_LABELS[uf.file.type] || {
                      label: "Dosya",
                      icon: FileText,
                      color: "bg-gray-100 text-gray-800",
                    };
                    const Icon = fmt.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${fmt.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{uf.file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(uf.file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {uf.status === "pending" && (
                            <Badge className="bg-gray-100 text-gray-700">Bekliyor</Badge>
                          )}
                          {uf.status === "processing" && (
                            <Badge className="bg-blue-100 text-blue-700">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              İşleniyor
                            </Badge>
                          )}
                          {uf.status === "done" && (
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="mr-1 h-3 w-3" />
                              {uf.result?.length || 0} kayıt
                            </Badge>
                          )}
                          {uf.status === "error" && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Hata
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={uf.status === "processing"}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={processFiles}
                    disabled={processing || uploadedFiles.every((f) => f.status !== "pending")}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Dosyaları İşle
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Table */}
          {showPreview && importedData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Önizleme</CardTitle>
                    <CardDescription>
                      {selectedCount} / {importedData.length} müşteri seçili
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleConfirmImport}
                    disabled={saving || selectedCount === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {selectedCount} Müşteriyi Kaydet
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Seç</TableHead>
                        <TableHead>Ad Soyad</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden lg:table-cell">Notlar</TableHead>
                        <TableHead>Kaynak</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importedData.map((customer, index) => (
                        <TableRow key={index} className={!customer.selected ? "opacity-50" : ""}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={customer.selected}
                              onChange={() => toggleCustomer(index)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={customer.name}
                              onChange={(e) => updateCustomer(index, "name", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Ad Soyad"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={customer.phone}
                              onChange={(e) => updateCustomer(index, "phone", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Telefon"
                            />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Input
                              value={customer.email}
                              onChange={(e) => updateCustomer(index, "email", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Email"
                            />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Input
                              value={customer.notes}
                              onChange={(e) => updateCustomer(index, "notes", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Notlar"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {customer.source}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {uploadedFiles.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileSpreadsheet className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-700">
                  Henüz dosya yüklenmedi
                </p>
                <p className="text-sm text-gray-500 mt-1 max-w-md">
                  Eski defter fotoğrafları, Excel dosyaları veya CSV dosyalarınızı
                  yükleyerek müşteri verilerinizi otomatik olarak içe aktarabilirsiniz.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
