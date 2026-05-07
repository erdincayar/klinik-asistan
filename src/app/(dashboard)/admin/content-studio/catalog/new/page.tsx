"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
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
  Wand2,
  FileImage,
  Megaphone,
  ListOrdered,
  BookOpen,
  Layers,
  Table2,
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

const STEPS = ["Proje", "İstek", "Dosyalar", "Veri Eşleme", "Marka Kiti", "Şablon"] as const;

// Belge boyutu presetleri. Custom seçilirse kullanıcı px/mm girer.
type PageSize = { width: number; height: number; unit: "mm" | "px"; label?: string };
const PAGE_PRESETS: { id: string; label: string; size: PageSize }[] = [
  { id: "a4p", label: "A4 Dikey · 210×297mm", size: { width: 210, height: 297, unit: "mm", label: "A4 Dikey" } },
  { id: "a4l", label: "A4 Yatay · 297×210mm", size: { width: 297, height: 210, unit: "mm", label: "A4 Yatay" } },
  { id: "a5p", label: "A5 Dikey · 148×210mm", size: { width: 148, height: 210, unit: "mm", label: "A5 Dikey" } },
  { id: "a3p", label: "A3 Dikey · 297×420mm", size: { width: 297, height: 420, unit: "mm", label: "A3 Dikey" } },
  { id: "ig-square", label: "Instagram Kare · 1080×1080px", size: { width: 1080, height: 1080, unit: "px", label: "IG Kare" } },
  { id: "ig-story", label: "Story · 1080×1920px", size: { width: 1080, height: 1920, unit: "px", label: "Story" } },
  { id: "ig-landscape", label: "Yatay Post · 1920×1080px", size: { width: 1920, height: 1080, unit: "px", label: "Yatay Post" } },
  { id: "photo-4x6", label: "4×6 inç Fotoğraf · 102×152mm", size: { width: 102, height: 152, unit: "mm", label: "Fotoğraf" } },
];

// outputType başına default preset id
const DEFAULT_PRESET_BY_OUTPUT: Record<string, string> = {
  PDF_CATALOG: "a4p",
  PRICE_LIST: "a4p",
  BROCHURE: "a5p",
  SOCIAL_POST: "ig-square",
  CUSTOM: "a4p",
};

// Excel kolonu hangi standart alana karşılık geliyor? Boş = kullanma.
// "_extra" seçilirse kullanıcı kendi alan adını yazar — extra map'ine yazılır.
const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— Kullanma —" },
  { value: "name", label: "Ürün Adı *" },
  { value: "description", label: "Açıklama" },
  { value: "category", label: "Kategori" },
  { value: "brand", label: "Marka" },
  { value: "sku", label: "SKU / Kod" },
  { value: "price", label: "Fiyat" },
  { value: "currency", label: "Para Birimi" },
  { value: "imageUrl", label: "Görsel URL / Yol" },
  { value: "_extra", label: "Özel Alan (kendi adın)" },
];

type OutputType = "PDF_CATALOG" | "SOCIAL_POST" | "BROCHURE" | "PRICE_LIST" | "CUSTOM";

const OUTPUT_TYPES: {
  value: OutputType;
  label: string;
  description: string;
  Icon: typeof FileImage;
}[] = [
  {
    value: "PDF_CATALOG",
    label: "PDF Katalog",
    description: "A4 dikey, ürün başına detaylı sayfa",
    Icon: BookOpen,
  },
  {
    value: "PRICE_LIST",
    label: "Fiyat Listesi",
    description: "A4 tablo formatı, kompakt liste",
    Icon: ListOrdered,
  },
  {
    value: "BROCHURE",
    label: "Broşür",
    description: "A5 katlanır, öne çıkan ürünler",
    Icon: Layers,
  },
  {
    value: "SOCIAL_POST",
    label: "Sosyal Medya Postu",
    description: "1080×1080, ürün başına ayrı görsel",
    Icon: Megaphone,
  },
  {
    value: "CUSTOM",
    label: "Özel",
    description: "Sadece istek metnine göre — şablon yok",
    Icon: Wand2,
  },
];

// Kullanıcının "Ne istiyorsun?" alanını boş bırakmaması için hızlı örnekler.
// Her preset bir output type'a denk gelir + sample prompt sunar.
const PROMPT_PRESETS: { label: string; outputType: OutputType; prompt: string }[] = [
  {
    label: "Klasik ürün katalogu",
    outputType: "PDF_CATALOG",
    prompt:
      "Yüklediğim verilerden modern bir ürün kataloğu hazırla. Her sayfada bir ürün olsun: ürün adı büyük, kısa açıklama, teknik özellikler ve fiyat. Fiyatları KDV dahil göster.",
  },
  {
    label: "Sade fiyat listesi",
    outputType: "PRICE_LIST",
    prompt:
      "Ürünleri tablo halinde A4 dikey fiyat listesine dök. Sütunlar: ürün adı, birim, KDV hariç fiyat, KDV dahil fiyat. Kategoriye göre grupla.",
  },
  {
    label: "Sosyal medya kampanya",
    outputType: "SOCIAL_POST",
    prompt:
      "Her ürün için 1080×1080 kare bir Instagram postu üret. Ürün görselini büyük göster, üstte marka logosu, altta ürün adı + fiyat + kısa bir slogan.",
  },
  {
    label: "Tanıtım broşürü",
    outputType: "BROCHURE",
    prompt:
      "Sadece öne çıkan ürünleri (ilk 6) seçerek A5 katlanır broşür yap. Görsel ağırlıklı, kısa açıklama, marka hikayesi için 1 sayfa giriş bırak.",
  },
];

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

  // Step 2 — user prompt + output type + page size
  const [userPrompt, setUserPrompt] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("PDF_CATALOG");
  const [pageSizePreset, setPageSizePreset] = useState<string>("a4p");
  const [customSize, setCustomSize] = useState<{ width: string; height: string; unit: "mm" | "px" }>({
    width: "",
    height: "",
    unit: "mm",
  });

  // outputType değiştiğinde uygun default preset'e atla — kullanıcı önce
  // farklı bir şey seçmediyse.
  function handleOutputTypeChange(next: OutputType) {
    setOutputType(next);
    if (pageSizePreset === DEFAULT_PRESET_BY_OUTPUT[outputType]) {
      setPageSizePreset(DEFAULT_PRESET_BY_OUTPUT[next] || "a4p");
    }
  }

  // Step 2 — files staged until project exists
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [excelFiles, setExcelFiles] = useState<File[]>([]);

  // Step 3 — column mapping (only meaningful if Excel uploaded)
  // Browser-side parse of staged Excel — sheet → columns + sample rows.
  const [excelPreview, setExcelPreview] = useState<{
    fileName: string;
    columns: string[];
    rows: Record<string, any>[];
  } | null>(null);
  // columnName → field key from FIELD_OPTIONS, or "" to skip
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  // For "_extra" mappings: columnName → user-supplied custom field name
  const [extraNames, setExtraNames] = useState<Record<string, string>>({});

  // Step 4 — brand kit
  const [brand, setBrand] = useState({
    primary: "#1F2937",
    secondary: "#F9FAFB",
    accent: "#D4A574",
    fontFamily: "Inter",
    logoFile: null as File | null,
  });

  // Step 5 — template
  const [templateSlug, setTemplateSlug] = useState(TEMPLATES[0].slug);

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.name.trim()) return "Proje adı gerekli";
      if (form.name.length > 200) return "Proje adı 200 karakterden uzun olamaz";
    }
    if (step === 1) {
      if (!userPrompt.trim()) return "Ne yapmak istediğinizi kısaca yazın";
      if (userPrompt.length > 5000) return "İstek metni 5000 karakterden uzun olamaz";
      if (pageSizePreset === "custom") {
        const w = parseFloat(customSize.width);
        const h = parseFloat(customSize.height);
        if (!w || !h || w < 50 || h < 50 || w > 5000 || h > 5000) {
          return "Özel boyut: 50–5000 arasında geçerli genişlik/yükseklik girin";
        }
      }
    }
    if (step === 2) {
      // CUSTOM dışında ürün fotoğrafı zorunlu — Excel-only flow için bile.
      // (Görseller ürün-görsel eşleştirmeye girer; tamamen veri-odaklı bir
      // PRICE_LIST'te zorunluluk gevşeyebilir.)
      if (
        outputType !== "CUSTOM" &&
        outputType !== "PRICE_LIST" &&
        photoFiles.length === 0
      )
        return "En az bir ürün fotoğrafı yüklemelisiniz";
    }
    if (step === 3) {
      // Excel yüklenmiş + step görünür → en az "name" haritalanmalı
      if (excelPreview) {
        const usedKeys = Object.values(columnMappings).filter((v) => v && v !== "_extra");
        if (!usedKeys.includes("name"))
          return "En az 'Ürün Adı' kolonunu eşlemelisiniz";
        // _extra seçilen kolonlarda isim boş bırakılamaz
        for (const [col, key] of Object.entries(columnMappings)) {
          if (key === "_extra" && !(extraNames[col] || "").trim()) {
            return `'${col}' için özel alan adı girmelisiniz`;
          }
        }
      }
    }
    return null;
  }

  // Browser-side Excel parse: ilk sheet → kolonlar + ilk 5 satır.
  // Boş kolonları toplamak için ilk 50 satırı tarar (XLSX bazı satırlarda
  // boş hücreleri atladığı için sadece 1. satıra bakmak yetersiz).
  async function parseStagedExcel(file: File): Promise<{
    columns: string[];
    rows: Record<string, any>[];
  } | null> {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) return null;
      const ws = wb.Sheets[sheetName];
      const all: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, {
        defval: null,
      });
      const colSet = new Set<string>();
      for (const r of all.slice(0, 50)) for (const k of Object.keys(r)) colSet.add(k);
      return { columns: Array.from(colSet), rows: all.slice(0, 5) };
    } catch (e) {
      console.error("excel parse error", e);
      return null;
    }
  }

  // Adım 2'den 3'e geçişte Excel'i parse et; yoksa eşleme adımını atla.
  async function next() {
    const err = validateStep();
    if (err) {
      toast({ title: "Eksik", description: err, variant: "destructive" });
      return;
    }

    if (step === 2) {
      if (excelFiles.length === 0) {
        // Eşleme yok — direkt marka kitine atla
        setExcelPreview(null);
        setColumnMappings({});
        setExtraNames({});
        setStep(4);
        return;
      }
      const file = excelFiles[0];
      const parsed = await parseStagedExcel(file);
      if (!parsed || parsed.columns.length === 0) {
        toast({
          title: "Excel okunamadı",
          description: "Dosya bozuk olabilir — eşleme adımı atlanıyor.",
          variant: "destructive",
        });
        setExcelPreview(null);
        setStep(4);
        return;
      }
      setExcelPreview({ fileName: file.name, columns: parsed.columns, rows: parsed.rows });
      // Heuristik: yaygın kolon adları için varsayılan eşleme
      const initialMap: Record<string, string> = {};
      for (const col of parsed.columns) {
        const lc = col.toLowerCase();
        if (!initialMap[col]) {
          if (/(ürün ?adı|name|isim|ürün)/i.test(lc)) initialMap[col] = "name";
          else if (/(açıklama|description|detay)/i.test(lc)) initialMap[col] = "description";
          else if (/(kategori|category|grup)/i.test(lc)) initialMap[col] = "category";
          else if (/(marka|brand)/i.test(lc)) initialMap[col] = "brand";
          else if (/(sku|kod|code|stok kod)/i.test(lc)) initialMap[col] = "sku";
          else if (/(fiyat|price|tutar|ücret)/i.test(lc)) initialMap[col] = "price";
          else if (/(birim|currency|para)/i.test(lc)) initialMap[col] = "currency";
          else if (/(görsel|image|resim|foto)/i.test(lc)) initialMap[col] = "imageUrl";
        }
      }
      // Aynı key birden fazla kolona atanmışsa sadece ilkini bırak
      const seen = new Set<string>();
      for (const k of Object.keys(initialMap)) {
        if (seen.has(initialMap[k])) initialMap[k] = "";
        else seen.add(initialMap[k]);
      }
      setColumnMappings(initialMap);
      setStep(3);
      return;
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    // Veri Eşleme görünmediyse 4. adımdan 2. adıma direkt geç
    if (step === 4 && !excelPreview) {
      setStep(2);
      return;
    }
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
      // pageSize'i preset veya custom'tan oluştur
      const pageSize: PageSize | null =
        pageSizePreset === "custom"
          ? {
              width: parseFloat(customSize.width),
              height: parseFloat(customSize.height),
              unit: customSize.unit,
              label: "Özel",
            }
          : PAGE_PRESETS.find((p) => p.id === pageSizePreset)?.size || null;

      // Eşleme yapıldıysa dataSchema oluştur (server-side pipeline bunu okur).
      const dataSchema = excelPreview
        ? {
            excel: {
              fileName: excelPreview.fileName,
              mappings: Object.entries(columnMappings)
                .filter(([, key]) => !!key)
                .map(([column, key]) => ({
                  column,
                  // _extra ise key formatı: "_extra:<isim>" — pipeline parse eder
                  key:
                    key === "_extra"
                      ? `_extra:${(extraNames[column] || column).trim()}`
                      : key,
                })),
            },
          }
        : undefined;

      const res = await fetch("/api/admin/catalog/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description || null,
          sourceLanguage: form.sourceLanguage,
          targetLanguage: form.targetLanguage,
          templateId: null, // set via generate step later
          userPrompt: userPrompt.trim() || null,
          outputType,
          pageSize,
          dataSchema,
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
              <div className="flex items-start gap-2 rounded-lg bg-violet-50/60 px-3 py-2 text-xs text-violet-700">
                <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Yüklediğin verilerle ne yapmak istediğini kendi cümlelerinle yaz.
                İstersen aşağıdaki örneklerden birini seçip üzerinde değişiklik
                yapabilirsin.
              </div>

              <div>
                <Label className="text-xs">Çıktı Tipi</Label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {OUTPUT_TYPES.map((ot) => {
                    const selected = ot.value === outputType;
                    const Icon = ot.Icon;
                    return (
                      <button
                        key={ot.value}
                        type="button"
                        onClick={() => handleOutputTypeChange(ot.value)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                          selected
                            ? "border-violet-500 bg-violet-50/40 ring-1 ring-violet-200"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            selected ? "text-violet-600" : "text-gray-400"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900">
                            {ot.label}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {ot.description}
                          </div>
                        </div>
                        {selected && (
                          <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-violet-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">İstek (Prompt) *</Label>
                  <span className="text-[11px] text-gray-400">
                    {userPrompt.length} / 5000
                  </span>
                </div>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  rows={6}
                  value={userPrompt}
                  maxLength={5000}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Örn: Yüklediğim Excel'den ürünlerin adını + fiyatını al, A4 dikey katalog yap. Kategoriye göre grupla. KDV dahil fiyatları büyük yaz, KDV hariç altında küçük göster."
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Net yazarsan AI daha doğru çalışır: hangi alanları kullansın,
                  hangileri es geçsin, neye göre sıralasın, hangi dilde yazsın?
                </p>
              </div>

              <div>
                <Label className="text-xs">Hızlı Örnekler</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PROMPT_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setUserPrompt(p.prompt);
                        handleOutputTypeChange(p.outputType);
                      }}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-700 hover:border-violet-300 hover:bg-violet-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Belge Boyutu</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAGE_PRESETS.map((p) => {
                    const selected = pageSizePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPageSizePreset(p.id)}
                        className={`rounded-lg border px-3 py-2 text-left text-[11px] transition-all ${
                          selected
                            ? "border-violet-500 bg-violet-50/40 ring-1 ring-violet-200"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {p.size.label}
                        </div>
                        <div className="text-gray-400">
                          {p.size.width}×{p.size.height} {p.size.unit}
                        </div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setPageSizePreset("custom")}
                    className={`rounded-lg border px-3 py-2 text-left text-[11px] transition-all ${
                      pageSizePreset === "custom"
                        ? "border-violet-500 bg-violet-50/40 ring-1 ring-violet-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-gray-900">Özel</div>
                    <div className="text-gray-400">px / mm</div>
                  </button>
                </div>

                {pageSizePreset === "custom" && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[11px] text-gray-500">Genişlik</Label>
                      <Input
                        type="number"
                        min={50}
                        max={5000}
                        className="mt-1"
                        value={customSize.width}
                        onChange={(e) =>
                          setCustomSize({ ...customSize, width: e.target.value })
                        }
                        placeholder="ör: 1200"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-500">Yükseklik</Label>
                      <Input
                        type="number"
                        min={50}
                        max={5000}
                        className="mt-1"
                        value={customSize.height}
                        onChange={(e) =>
                          setCustomSize({ ...customSize, height: e.target.value })
                        }
                        placeholder="ör: 1500"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-500">Birim</Label>
                      <select
                        value={customSize.unit}
                        onChange={(e) =>
                          setCustomSize({
                            ...customSize,
                            unit: e.target.value as "mm" | "px",
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="mm">mm</option>
                        <option value="px">px</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
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

          {step === 3 && excelPreview && (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-violet-50/60 px-3 py-2 text-xs text-violet-700">
                <Table2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <span className="font-semibold">{excelPreview.fileName}</span>{" "}
                  içindeki kolonların hangi alanları temsil ettiğini seç.
                  Standart bir karşılığı yoksa <em>Özel Alan</em> seç ve kendi
                  adını ver — render aşamasında bu alanlar da kullanılabilir.
                </div>
              </div>

              <div className="space-y-2">
                {excelPreview.columns.map((col) => {
                  const mapped = columnMappings[col] ?? "";
                  const sampleVals = excelPreview.rows
                    .map((r) => r[col])
                    .filter((v) => v !== null && v !== undefined && v !== "")
                    .slice(0, 2)
                    .map((v) => String(v));
                  return (
                    <div
                      key={col}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {col}
                          </div>
                          {sampleVals.length > 0 && (
                            <div className="mt-0.5 text-[11px] text-gray-400 truncate">
                              ör: {sampleVals.join(" · ")}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                          <select
                            value={mapped}
                            onChange={(e) =>
                              setColumnMappings({
                                ...columnMappings,
                                [col]: e.target.value,
                              })
                            }
                            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                          >
                            {FIELD_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {mapped === "_extra" && (
                        <div className="mt-2">
                          <Input
                            placeholder="Alan adı (örn: kalori, metrekare, paket)"
                            value={extraNames[col] || ""}
                            onChange={(e) =>
                              setExtraNames({
                                ...extraNames,
                                [col]: e.target.value,
                              })
                            }
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-gray-400">
                {excelPreview.columns.length} kolon —{" "}
                {
                  Object.values(columnMappings).filter((v) => !!v).length
                }{" "}
                eşlendi
              </div>
            </>
          )}

          {step === 4 && (
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

          {step === 5 && (
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
