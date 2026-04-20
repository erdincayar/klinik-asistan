"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Sheet,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import FileUploadZone from "@/components/catalog/FileUploadZone";

const FONT_OPTIONS = ["Inter", "Manrope", "Roboto", "Playfair Display"];

const TEMPLATES = [
  {
    slug: "natural-stone-modern",
    name: "Natural Stone — Modern & Minimal",
    sector: "Doğal Taş",
    description: "Sol görsel, sağ detay. Minimalist tipografi.",
    accent: "#B8956A",
  },
] as const;

const STEPS = ["Proje", "Dosyalar", "Marka Kiti", "Şablon"] as const;

export default function NewCatalogWizardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);

  // Step 1
  const [form, setForm] = useState({
    name: "",
    description: "",
    sourceLanguage: "tr",
    targetLanguage: "tr",
  });

  // Step 2 — files staged until project exists
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [excelFiles, setExcelFiles] = useState<File[]>([]);

  // Step 3 — brand kit
  const [brand, setBrand] = useState({
    primary: "#1F2937",
    secondary: "#F9FAFB",
    accent: "#D4A574",
    fontFamily: "Inter",
    logoFile: null as File | null,
  });

  // Step 4 — template
  const [templateSlug, setTemplateSlug] = useState(TEMPLATES[0].slug);

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.name.trim()) return "Proje adı gerekli";
      if (form.name.length > 200) return "Proje adı 200 karakterden uzun olamaz";
    }
    if (step === 1) {
      if (photoFiles.length === 0)
        return "En az bir ürün fotoğrafı yüklemelisiniz";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      toast({ title: "Eksik", description: err, variant: "destructive" });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function uploadGroup(
    projectId: string,
    fileType: "REFERENCE_PDF" | "PRODUCT_IMAGE" | "EXCEL_DATA",
    files: File[]
  ) {
    if (files.length === 0) return;
    const fd = new FormData();
    fd.append("fileType", fileType);
    for (const f of files) fd.append("files", f);
    const res = await fetch(
      `/api/admin/catalog/projects/${projectId}/upload`,
      { method: "POST", body: fd }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Yükleme hatası");
    if (data.failed?.length) {
      console.warn("Kısmi yükleme:", data.failed);
    }
  }

  async function submit() {
    const err = validateStep();
    if (err) {
      toast({ title: "Eksik", description: err, variant: "destructive" });
      return;
    }

    setCreating(true);
    let projectId: string | null = null;
    try {
      // 1) Create project
      const res = await fetch("/api/admin/catalog/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description || null,
          sourceLanguage: form.sourceLanguage,
          targetLanguage: form.targetLanguage,
          templateId: null, // set via generate step later
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Proje oluşturulamadı");
      projectId = data.project.id;

      // 2) Upload files
      setCreating(false);
      setUploading(true);
      await uploadGroup(projectId!, "REFERENCE_PDF", pdfFiles);
      await uploadGroup(projectId!, "PRODUCT_IMAGE", photoFiles);
      await uploadGroup(projectId!, "EXCEL_DATA", excelFiles);

      // 3) Persist brand kit + template into localStorage for the detail
      //    page's generate form defaults. (A small, zero-risk bridge; we
      //    don't yet have a per-project settings table — generate route
      //    picks these up from the generate-call payload later.)
      try {
        localStorage.setItem(
          `catalog-brand:${projectId}`,
          JSON.stringify({
            primary: brand.primary,
            secondary: brand.secondary,
            accent: brand.accent,
            fontFamily: brand.fontFamily,
          })
        );
        localStorage.setItem(`catalog-template:${projectId}`, templateSlug);
      } catch {}

      // 4) Kick off analyze
      setUploading(false);
      setStarting(true);
      const analyzeRes = await fetch(
        `/api/admin/catalog/projects/${projectId}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sector: templateSlug.includes("natural-stone")
              ? "NATURAL_STONE"
              : undefined,
          }),
        }
      );
      if (!analyzeRes.ok) {
        const d = await analyzeRes.json().catch(() => ({}));
        throw new Error(d.error || "Analiz başlatılamadı");
      }

      toast({
        title: "Analiz başladı",
        description: "Birkaç dakika içinde ürünler çıkartılacak.",
      });

      router.push(`/admin/content-studio/catalog/${projectId}`);
    } catch (e: any) {
      toast({
        title: "Hata",
        description: e.message,
        variant: "destructive",
      });
      setCreating(false);
      setUploading(false);
      setStarting(false);
    }
  }

  const busy = creating || uploading || starting;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/content-studio/catalog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Projelere dön
        </Link>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                  done
                    ? "bg-emerald-500 text-white ring-emerald-500"
                    : active
                    ? "bg-indigo-500 text-white ring-indigo-500"
                    : "bg-white text-gray-400 ring-gray-200"
                }`}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-xs ${
                  active || done
                    ? "font-semibold text-gray-900"
                    : "text-gray-400"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-px flex-1 ${
                    done ? "bg-emerald-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-6 space-y-5">
          {step === 0 && (
            <>
              <div>
                <Label className="text-xs">Proje Adı *</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  maxLength={200}
                  placeholder="örn: Karstone 2026 Koleksiyonu"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Açıklama</Label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Kısa not / iç kullanım için açıklama"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Kaynak Dil</Label>
                  <select
                    value={form.sourceLanguage}
                    onChange={(e) =>
                      setForm({ ...form, sourceLanguage: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                    <option value="de">Almanca</option>
                    <option value="fr">Fransızca</option>
                    <option value="ar">Arapça</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Hedef Dil</Label>
                  <select
                    value={form.targetLanguage}
                    onChange={(e) =>
                      setForm({ ...form, targetLanguage: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                    <option value="de">Almanca</option>
                    <option value="fr">Fransızca</option>
                    <option value="ar">Arapça</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
                <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Dosyalar, projeyi oluşturduğunuzda tek seferde yüklenir.
              </div>

              <FileUploadZone
                label="Referans PDF"
                description="Rakip katalog, örnek şablon veya kendi eski kataloğunuz"
                accept="application/pdf"
                multiple
                onUpload={async () => {}}
                stagedFiles={pdfFiles}
                onStagedChange={setPdfFiles}
                maxBytes={50 * 1024 * 1024}
                meta="PDF, max 50MB"
              />
              <FileUploadZone
                label="Ürün Fotoğrafları"
                description="Kaliteli ürün görselleri — isim/kod bazlı eşleşme için dosya adı önemli"
                accept="image/jpeg,image/png,image/webp"
                multiple
                required
                onUpload={async () => {}}
                stagedFiles={photoFiles}
                onStagedChange={setPhotoFiles}
                maxBytes={10 * 1024 * 1024}
                meta="JPG/PNG/WebP, her biri max 10MB"
              />
              <FileUploadZone
                label="Excel / CSV Veri"
                description="Ürün listesi, fiyat tablosu (opsiyonel)"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                multiple
                onUpload={async () => {}}
                stagedFiles={excelFiles}
                onStagedChange={setExcelFiles}
                maxBytes={10 * 1024 * 1024}
                meta="XLSX/XLS/CSV, max 10MB"
              />

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-500">
                <div className="rounded-lg bg-gray-50 p-2">
                  <FileText className="mx-auto mb-1 h-3.5 w-3.5 text-gray-400" />
                  {pdfFiles.length} PDF
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <ImageIcon className="mx-auto mb-1 h-3.5 w-3.5 text-gray-400" />
                  {photoFiles.length} Foto
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <Sheet className="mx-auto mb-1 h-3.5 w-3.5 text-gray-400" />
                  {excelFiles.length} Veri
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-amber-50/60 px-3 py-2 text-xs text-amber-700">
                <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Marka kiti PDF üretim aşamasında kullanılır — şimdi sonra
                değiştirebilirsiniz.
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Birincil Renk</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={brand.primary}
                      onChange={(e) =>
                        setBrand({ ...brand, primary: e.target.value })
                      }
                      className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200"
                    />
                    <Input
                      value={brand.primary}
                      onChange={(e) =>
                        setBrand({ ...brand, primary: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">İkincil Renk</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={brand.secondary}
                      onChange={(e) =>
                        setBrand({ ...brand, secondary: e.target.value })
                      }
                      className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200"
                    />
                    <Input
                      value={brand.secondary}
                      onChange={(e) =>
                        setBrand({ ...brand, secondary: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Vurgu Rengi</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={brand.accent}
                      onChange={(e) =>
                        setBrand({ ...brand, accent: e.target.value })
                      }
                      className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200"
                    />
                    <Input
                      value={brand.accent}
                      onChange={(e) =>
                        setBrand({ ...brand, accent: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Font</Label>
                <select
                  value={brand.fontFamily}
                  onChange={(e) =>
                    setBrand({ ...brand, fontFamily: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Logo (opsiyonel)</Label>
                <input
                  type="file"
                  accept="image/*,.svg"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setBrand({ ...brand, logoFile: f });
                  }}
                  className="mt-1 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Logo yükleme sonraki sürümde aktifleşecek (TODO). Şimdilik
                  sadece renk ve font kullanılacak.
                </p>
              </div>

              {/* Preview */}
              <div
                className="rounded-xl border border-gray-200 p-5"
                style={{ background: brand.secondary }}
              >
                <div
                  className="mb-2 text-[11px] tracking-widest uppercase"
                  style={{ color: brand.accent }}
                >
                  Önizleme
                </div>
                <div
                  className="text-2xl font-light"
                  style={{ color: brand.primary, fontFamily: brand.fontFamily }}
                >
                  Katalog Başlığı Örneği
                </div>
                <div
                  className="mt-2 h-0.5 w-16"
                  style={{ background: brand.accent }}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Şu an sadece 1 şablon var. Yakında sektöre özel daha fazla
                seçenek eklenecek.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {TEMPLATES.map((t) => {
                  const selected = t.slug === templateSlug;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => setTemplateSlug(t.slug)}
                      className={`text-left rounded-2xl border-2 p-4 transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-50/30"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="mb-3 aspect-[210/297] rounded-xl overflow-hidden flex flex-col justify-between p-3"
                        style={{ background: "#1F2937", color: "#fff" }}
                      >
                        <div className="text-[9px] tracking-widest opacity-70 uppercase">
                          KATALOG
                        </div>
                        <div className="text-lg font-light leading-tight">
                          {t.name.split("—")[0]}
                        </div>
                        <div
                          className="h-0.5 w-8"
                          style={{ background: t.accent }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {t.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {t.sector}
                          </div>
                        </div>
                        {selected && (
                          <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                        )}
                      </div>
                      <div className="mt-2 text-[11px] text-gray-500">
                        {t.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Footer buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={back}
          disabled={step === 0 || busy}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Geri
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={next} disabled={busy}>
            İleri
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {creating
              ? "Proje oluşturuluyor..."
              : uploading
              ? "Dosyalar yükleniyor..."
              : starting
              ? "Analiz başlatılıyor..."
              : "Analizi Başlat"}
          </Button>
        )}
      </div>
    </div>
  );
}
