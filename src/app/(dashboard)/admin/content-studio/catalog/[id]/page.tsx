"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Sheet,
  Sparkles,
  Trash2,
  BookOpen,
  Settings as SettingsIcon,
  Palette,
  CheckCircle2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import StatusBadge from "@/components/catalog/StatusBadge";
import StatusTimeline from "@/components/catalog/StatusTimeline";
import ProductEditModal, {
  type CatalogProductLite,
  type PhotoOption,
} from "@/components/catalog/ProductEditModal";
import GenerationProgressModal from "@/components/catalog/GenerationProgressModal";
import { useProjectPolling } from "@/components/catalog/useProjectPolling";
import FileNoteCard, { type CatalogFileRow } from "@/components/catalog/FileNoteCard";

const FONT_OPTIONS = ["Inter", "Manrope", "Roboto", "Playfair Display"];

function formatBytes(b: number) {
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(0) + " KB";
  return b + " B";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data, error, refresh } = useProjectPolling(id, 3000);

  const [tab, setTab] = useState<"files" | "products" | "preview" | "settings">(
    "files"
  );
  const [products, setProducts] = useState<CatalogProductLite[]>([]);
  const [editing, setEditing] = useState<CatalogProductLite | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  // Generate form (hydrated from localStorage on mount if wizard set defaults)
  const [gen, setGen] = useState({
    templateSlug: "natural-stone-modern",
    title: "",
    subtitle: "",
    companyName: "",
    edition: "",
    year: new Date().getFullYear(),
    primary: "#1F2937",
    secondary: "#F9FAFB",
    accent: "#D4A574",
    fontFamily: "Inter",
    contact: { address: "", phone: "", email: "", website: "" },
  });

  // Canva state
  const [canva, setCanva] = useState<{
    configured: boolean;
    connected: boolean;
    display: string | null;
    linkedAt: string | null;
  } | null>(null);
  const [canvaBusy, setCanvaBusy] = useState(false);

  async function loadCanvaStatus() {
    try {
      const r = await fetch("/api/admin/catalog/canva/status", { cache: "no-store" });
      if (r.ok) setCanva(await r.json());
    } catch {}
  }
  useEffect(() => { loadCanvaStatus(); }, []);

  async function sendToCanva() {
    if (!canva?.configured) {
      toast({
        title: "Canva yapılandırılmamış",
        description: "Sunucu tarafında CANVA_CLIENT_ID ayarlanmalı.",
        variant: "destructive",
      });
      return;
    }
    if (!canva?.connected) {
      // Kick off OAuth
      window.location.href = "/api/admin/catalog/canva/auth";
      return;
    }
    setCanvaBusy(true);
    try {
      const res = await fetch(`/api/admin/catalog/projects/${id}/canva-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.status === 428 || data?.needsAuth) {
        // Canva bağlantısı kopmuş — yeniden auth gerek
        window.location.href = "/api/admin/catalog/canva/auth";
        return;
      }
      if (!res.ok) throw new Error(data.error || "Canva gönderim hatası");
      toast({
        title: "Canva'da açıldı",
        description: "Tasarım yeni sekmede açıldı.",
      });
      window.open(data.editUrl, "_blank", "noopener");
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setCanvaBusy(false);
    }
  }

  async function disconnectCanva() {
    if (!window.confirm("Canva bağlantısını kaldırmak istiyor musunuz?")) return;
    await fetch("/api/admin/catalog/canva/status", { method: "DELETE" });
    await loadCanvaStatus();
    toast({ title: "Canva bağlantısı kaldırıldı" });
  }

  // Hydrate defaults from wizard
  useEffect(() => {
    if (!id) return;
    try {
      const brandRaw = localStorage.getItem(`catalog-brand:${id}`);
      if (brandRaw) {
        const b = JSON.parse(brandRaw);
        setGen((g) => ({ ...g, ...b }));
      }
      const t = localStorage.getItem(`catalog-template:${id}`);
      if (t) setGen((g) => ({ ...g, templateSlug: t }));
    } catch {}
  }, [id]);

  // When project name loads, default the PDF title/company
  useEffect(() => {
    if (!data) return;
    setGen((g) => ({
      ...g,
      title: g.title || data.project.name,
    }));
  }, [data?.project.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch product list on demand (tab switch or after analyze completes)
  async function loadProducts() {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/catalog/projects/${id}/products`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Ürünler alınamadı");
      const mapped: CatalogProductLite[] = (body.products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        currency: p.currency,
        technicalSpecs: p.technicalSpecs,
        imageStoragePath: p.imageStoragePath,
        status: p.status,
      }));
      setProducts(mapped);
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  }

  useEffect(() => {
    if (tab === "products") loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, data?.project.status]);

  // Show progress modal while background work is running
  useEffect(() => {
    if (!data) return;
    const s = data.project.status;
    if (s === "ANALYZING" || s === "GENERATING") setShowProgress(true);
    // Leave user to close when it completes/fails
  }, [data?.project.status]);

  const photoOptions: PhotoOption[] = useMemo(() => {
    if (!data) return [];
    return data.project.sourceFiles
      .filter((f) => f.fileType === "PRODUCT_IMAGE")
      .map((f) => ({
        id: f.id,
        storagePath: f.storagePath,
        originalName: f.originalName,
        thumbUrl: `/api/admin/catalog/files/${f.id}/raw?thumb=1`,
      }));
  }, [data]);

  if (error && !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-xl bg-white border border-gray-100" />
        <div className="h-60 animate-pulse rounded-xl bg-white border border-gray-100" />
      </div>
    );
  }

  const project = data.project;
  const pdfs = project.sourceFiles.filter((f) => f.fileType === "REFERENCE_PDF");
  const photos = project.sourceFiles.filter((f) => f.fileType === "PRODUCT_IMAGE");
  const excel = project.sourceFiles.filter((f) => f.fileType === "EXCEL_DATA");

  async function reanalyze() {
    try {
      const res = await fetch(`/api/admin/catalog/projects/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Başlatılamadı");
      toast({ title: "Analiz başladı", description: "Durumu yukarıdan izleyin." });
      setShowProgress(true);
      refresh();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  }

  async function generate() {
    try {
      const body: any = {
        templateSlug: gen.templateSlug,
        brandKit: {
          primary: gen.primary,
          secondary: gen.secondary,
          accent: gen.accent,
          fontFamily: gen.fontFamily,
        },
        metadata: {
          title: gen.title || project.name,
          subtitle: gen.subtitle || undefined,
          companyName: gen.companyName || undefined,
          edition: gen.edition || undefined,
          year: gen.year || undefined,
          contactInfo: gen.contact,
        },
      };
      const res = await fetch(`/api/admin/catalog/projects/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data2 = await res.json();
      if (!res.ok) throw new Error(data2.error || "Üretim başlatılamadı");
      toast({ title: "Üretim başladı", description: "Birkaç dakika sürebilir." });
      setShowProgress(true);
      refresh();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  }

  async function removeProject() {
    if (
      !window.confirm(
        "Bu projeyi ve tüm dosyalarını silmek istediğinize emin misiniz?"
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/catalog/projects/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Silme hatası");
      toast({ title: "Silindi" });
      router.push("/admin/content-studio/catalog");
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  }

  async function removeFile(fileId: string) {
    if (!window.confirm("Bu dosyayı silmek istiyor musunuz?")) return;
    try {
      const res = await fetch(`/api/admin/catalog/files/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Silme hatası");
      toast({ title: "Dosya silindi" });
      refresh();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  }

  function shareWhatsApp() {
    const pdfUrl = `${location.origin}/api/admin/catalog/projects/${id}/download`;
    const text = `${project.name} — kataloğumuz: ${pdfUrl}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank", "noopener");
  }

  function downloadPdf() {
    window.location.href = `/api/admin/catalog/projects/${id}/download`;
  }

  const canGenerate =
    project._count.products > 0 &&
    project.status !== "ANALYZING" &&
    project.status !== "GENERATING";
  const canDownload = project.status === "COMPLETED";
  const canAnalyze =
    project.status !== "ANALYZING" && project.status !== "GENERATING";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/content-studio/catalog"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900">
              <BookOpen className="mr-1.5 inline h-4 w-4 text-indigo-500" />
              {project.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={project.status} />
              <span className="text-xs text-gray-400">
                {project._count.products} ürün · {project._count.sourceFiles} dosya ·{" "}
                {data.usedFormatted}/{data.quotaFormatted}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={reanalyze}
            disabled={!canAnalyze}
            title={!canAnalyze ? "Önceki işlem tamamlanmalı" : undefined}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Yeniden Analiz Et
          </Button>
          <Button size="sm" onClick={generate} disabled={!canGenerate}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Katalog Üret
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
            disabled={!canDownload}
            title={!canDownload ? "Önce katalog üretin" : undefined}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            PDF İndir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={shareWhatsApp}
            disabled={!canDownload}
            title={!canDownload ? "Önce katalog üretin" : undefined}
          >
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={sendToCanva}
            disabled={!canDownload || canvaBusy || canva?.configured === false}
            title={
              !canDownload
                ? "Önce katalog üretin"
                : canva?.configured === false
                ? "Canva sunucuda yapılandırılmamış"
                : canva?.connected
                ? `Canva (${canva.display || "bağlı"})`
                : "Canva'ya bağlan ve aç"
            }
          >
            {canvaBusy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Palette className="mr-1.5 h-3.5 w-3.5" />
            )}
            {canva?.connected ? "Canva'da Düzenle" : "Canva'ya Bağla"}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="py-4">
          <StatusTimeline status={project.status} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="files" className="text-xs">
            Dosyalar ({project._count.sourceFiles})
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs">
            Ürünler ({project._count.products})
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">
            Önizleme
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            Ayarlar
          </TabsTrigger>
        </TabsList>

        {/* ─── Files ─── */}
        <TabsContent value="files">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 text-xs text-indigo-700 mb-4">
            <Sparkles className="inline h-3.5 w-3.5 mr-1" />
            Her dosyaya yorum yazabilirsin. <b>AI ile Analiz Et</b> butonu
            dosyayı Claude&apos;a gönderir; çıkan özet ve kolon bilgileri sonraki
            analiz turunda ürün çıkartımına yön verir.
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <FileGroup
              title="Referans PDF"
              icon={<FileText className="h-4 w-4 text-indigo-500" />}
              count={pdfs.length}
            >
              {pdfs.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">—</p>
              ) : (
                pdfs.map((f) => (
                  <FileNoteCard
                    key={f.id}
                    file={f as unknown as CatalogFileRow}
                    onDelete={removeFile}
                    onChanged={refresh}
                  />
                ))
              )}
            </FileGroup>

            <FileGroup
              title="Ürün Fotoğrafları"
              icon={<ImageIcon className="h-4 w-4 text-emerald-500" />}
              count={photos.length}
            >
              {photos.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">—</p>
              ) : (
                photos.map((f) => (
                  <FileNoteCard
                    key={f.id}
                    file={f as unknown as CatalogFileRow}
                    onDelete={removeFile}
                    onChanged={refresh}
                  />
                ))
              )}
            </FileGroup>

            <FileGroup
              title="Excel / CSV"
              icon={<Sheet className="h-4 w-4 text-amber-500" />}
              count={excel.length}
            >
              {excel.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">—</p>
              ) : (
                excel.map((f) => (
                  <FileNoteCard
                    key={f.id}
                    file={f as unknown as CatalogFileRow}
                    onDelete={removeFile}
                    onChanged={refresh}
                  />
                ))
              )}
            </FileGroup>
          </div>
        </TabsContent>

        {/* ─── Products ─── */}
        <TabsContent value="products">
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">Henüz ürün çıkartılmadı</p>
                <p className="mt-1 text-xs text-gray-400">
                  Analiz tamamlanınca ürünler burada görünecek.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="w-20 px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Görsel
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Ürün
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Kategori
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Fiyat
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Durum
                      </th>
                      <th className="w-10 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map((p) => {
                      const photo = photoOptions.find(
                        (po) => po.storagePath === p.imageStoragePath
                      );
                      return (
                        <tr
                          key={p.id}
                          className="cursor-pointer hover:bg-gray-50/50"
                          onClick={() => setEditing(p)}
                        >
                          <td className="px-3 py-2">
                            <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                              {photo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={photo.thumbUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">
                              {p.name}
                            </div>
                            {p.description && (
                              <div className="truncate text-[11px] text-gray-400 max-w-xs">
                                {p.description}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {p.category || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {p.price != null
                              ? `${p.price} ${p.currency || "TRY"}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                p.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : p.status === "REVIEWED"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Pencil className="h-3.5 w-3.5 text-gray-400" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Preview ─── */}
        <TabsContent value="preview">
          {canDownload ? (
            <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
              <iframe
                src={`/api/admin/catalog/projects/${id}/download`}
                title="Katalog Önizleme"
                className="w-full"
                style={{ height: "calc(100vh - 260px)", minHeight: 600 }}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="py-14 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Henüz üretilmiş bir katalog yok
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Ürünler hazır olunca &quot;Katalog Üret&quot; butonuna basın.
                </p>
                <Button
                  size="sm"
                  onClick={generate}
                  disabled={!canGenerate}
                  className="mt-4"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Katalog Üret
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Settings ─── */}
        <TabsContent value="settings">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold">Marka Kiti</h3>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: "primary", l: "Birincil" },
                    { k: "secondary", l: "İkincil" },
                    { k: "accent", l: "Vurgu" },
                  ].map((c) => (
                    <div key={c.k}>
                      <Label className="text-xs">{c.l}</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={(gen as any)[c.k]}
                          onChange={(e) =>
                            setGen({ ...gen, [c.k]: e.target.value } as any)
                          }
                          className="h-9 w-10 cursor-pointer rounded-lg border border-gray-200"
                        />
                        <Input
                          value={(gen as any)[c.k]}
                          onChange={(e) =>
                            setGen({ ...gen, [c.k]: e.target.value } as any)
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-xs">Font</Label>
                  <select
                    value={gen.fontFamily}
                    onChange={(e) => setGen({ ...gen, fontFamily: e.target.value })}
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
                  <Label className="text-xs">Şablon</Label>
                  <select
                    value={gen.templateSlug}
                    onChange={(e) =>
                      setGen({ ...gen, templateSlug: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="natural-stone-modern">
                      Natural Stone — Modern & Minimal
                    </option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold">Katalog Bilgileri</h3>

                <div>
                  <Label className="text-xs">Başlık</Label>
                  <Input
                    className="mt-1"
                    value={gen.title}
                    onChange={(e) => setGen({ ...gen, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Alt Başlık</Label>
                  <Input
                    className="mt-1"
                    value={gen.subtitle}
                    onChange={(e) =>
                      setGen({ ...gen, subtitle: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Firma</Label>
                    <Input
                      className="mt-1"
                      value={gen.companyName}
                      onChange={(e) =>
                        setGen({ ...gen, companyName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Edisyon</Label>
                    <Input
                      className="mt-1"
                      value={gen.edition}
                      onChange={(e) =>
                        setGen({ ...gen, edition: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Yıl</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={gen.year}
                    onChange={(e) =>
                      setGen({ ...gen, year: Number(e.target.value) || new Date().getFullYear() })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Telefon</Label>
                    <Input
                      className="mt-1"
                      value={gen.contact.phone}
                      onChange={(e) =>
                        setGen({
                          ...gen,
                          contact: { ...gen.contact, phone: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">E-posta</Label>
                    <Input
                      className="mt-1"
                      value={gen.contact.email}
                      onChange={(e) =>
                        setGen({
                          ...gen,
                          contact: { ...gen.contact, email: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Adres</Label>
                  <Input
                    className="mt-1"
                    value={gen.contact.address}
                    onChange={(e) =>
                      setGen({
                        ...gen,
                        contact: { ...gen.contact, address: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Web</Label>
                  <Input
                    className="mt-1"
                    value={gen.contact.website}
                    onChange={(e) =>
                      setGen({
                        ...gen,
                        contact: { ...gen.contact, website: e.target.value },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Canva Connection */}
            <Card className="lg:col-span-2">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 rounded-xl bg-purple-50 p-2.5">
                      <Palette className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Canva Bağlantısı
                      </h3>
                      {canva?.configured === false ? (
                        <p className="mt-0.5 text-xs text-red-500">
                          Sunucuda CANVA_CLIENT_ID ayarlanmamış — yönetici kurulumu gerekli.
                        </p>
                      ) : canva?.connected ? (
                        <p className="mt-0.5 text-xs text-gray-500">
                          <CheckCircle2 className="inline h-3 w-3 text-emerald-500 mr-1" />
                          Bağlı {canva.display ? `· ${canva.display}` : ""}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-gray-500">
                          Kataloğu Canva&apos;ya gönderip orada düzenleyebilirsin.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canva?.connected ? (
                      <>
                        <Button size="sm" onClick={sendToCanva} disabled={canvaBusy || !canDownload}>
                          {canvaBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Palette className="mr-1.5 h-3.5 w-3.5" />}
                          Canva&apos;da Aç
                        </Button>
                        <Button variant="outline" size="sm" onClick={disconnectCanva} className="text-red-600 hover:bg-red-50">
                          <Unlink className="mr-1.5 h-3.5 w-3.5" />
                          Bağlantıyı Kaldır
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => (window.location.href = "/api/admin/catalog/canva/auth")}
                        disabled={canva?.configured === false}
                      >
                        <Palette className="mr-1.5 h-3.5 w-3.5" />
                        Canva Hesabı Bağla
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-red-100">
              <CardContent className="p-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-red-600">
                    Projeyi Sil
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Dosyalar, ürünler ve üretilmiş PDF&apos;ler kalıcı olarak silinir.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeProject}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Sil
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ProductEditModal
        open={!!editing}
        product={editing}
        photoOptions={photoOptions}
        onClose={() => setEditing(null)}
        onSaved={() => {
          loadProducts();
          refresh();
        }}
        onDeleted={() => {
          loadProducts();
          refresh();
        }}
      />

      <GenerationProgressModal
        open={showProgress}
        status={project.status}
        onClose={() => setShowProgress(false)}
      />
    </div>
  );
}

function FileGroup({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold text-gray-900">{title}</span>
          </div>
          <span className="text-xs text-gray-400">{count}</span>
        </div>
        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
