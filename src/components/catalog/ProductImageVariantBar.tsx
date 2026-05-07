"use client";

import { useState } from "react";
import { Loader2, Wand2, Image as ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * PRODUCT_IMAGE için varyant kontrol barı.
 *   - Orijinal / İşlenmiş (BG yok) / Lifestyle  arasında geçiş
 *   - "Arka Planı Temizle" → fal.ai birefnet
 *   - "Lifestyle Uygula"   → 8 preset arasından seç → Sharp ile compose
 *
 * Aktif varyant render aşamasında ürün görseli olarak kullanılır.
 */

interface CatalogPhotoFile {
  id: string;
  storagePath: string;
  processedPath: string | null;
  lifestylePath: string | null;
  lifestylePreset: string | null;
  activeVariant: string | null;
}

interface Props {
  projectId: string;
  file: CatalogPhotoFile;
  onChanged: () => void;
}

const LIFESTYLE_PRESETS = [
  { id: "white", label: "Beyaz" },
  { id: "soft-gray", label: "Gri" },
  { id: "warm-cream", label: "Krem" },
  { id: "marble", label: "Mermer" },
  { id: "wood", label: "Ahşap" },
  { id: "sunset", label: "Gün Batımı" },
  { id: "studio-blue", label: "Stüdyo Mavi" },
  { id: "rose-gold", label: "Gül Altın" },
];

type Variant = "original" | "processed" | "lifestyle";

export default function ProductImageVariantBar({ projectId, file, onChanged }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "remove-bg" | "lifestyle" | "switch">(null);
  const [showPresets, setShowPresets] = useState(false);
  const active = (file.activeVariant || "original") as Variant;

  async function call(action: string, body: Record<string, any>) {
    setBusy(action === "set-active" ? "switch" : (action as any));
    try {
      const res = await fetch(
        `/api/admin/catalog/projects/${projectId}/files/${file.id}/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...body }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");
      onChanged();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
      setShowPresets(false);
    }
  }

  function thumbUrl(rel: string | null) {
    return rel ? `/api/admin/catalog/files/${file.id}/raw?variant=auto&p=${encodeURIComponent(rel)}` : null;
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/50 p-2">
      {/* Variant toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={busy !== null || active === "original"}
          onClick={() => call("set-active", { variant: "original" })}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${
            active === "original"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {active === "original" && <Check className="h-3 w-3" />}
          Orijinal
        </button>

        <button
          type="button"
          disabled={busy !== null || !file.processedPath || active === "processed"}
          onClick={() => call("set-active", { variant: "processed" })}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition disabled:opacity-40 ${
            active === "processed"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {active === "processed" && <Check className="h-3 w-3" />}
          Arka Plansız
        </button>

        <button
          type="button"
          disabled={busy !== null || !file.lifestylePath || active === "lifestyle"}
          onClick={() => call("set-active", { variant: "lifestyle" })}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition disabled:opacity-40 ${
            active === "lifestyle"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {active === "lifestyle" && <Check className="h-3 w-3" />}
          Lifestyle{file.lifestylePreset ? ` · ${file.lifestylePreset}` : ""}
        </button>

        <div className="ml-auto flex items-center gap-1">
          {!file.processedPath && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => call("remove-bg", {})}
              className="h-7 text-[11px]"
            >
              {busy === "remove-bg" ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="mr-1 h-3 w-3" />
              )}
              Arka planı temizle
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => setShowPresets((v) => !v)}
            className="h-7 text-[11px]"
          >
            <ImageIcon className="mr-1 h-3 w-3" />
            Lifestyle
          </Button>
        </div>
      </div>

      {/* Preset picker */}
      {showPresets && (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {LIFESTYLE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null}
              onClick={() => call("lifestyle", { preset: p.id })}
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[10px] text-gray-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
            >
              {busy === "lifestyle" ? (
                <Loader2 className="mx-auto h-3 w-3 animate-spin" />
              ) : (
                p.label
              )}
            </button>
          ))}
        </div>
      )}

      {/* Variant thumbs */}
      {(file.processedPath || file.lifestylePath) && (
        <div className="mt-2 flex items-center gap-2">
          {file.processedPath && (
            <div className="flex flex-col items-center text-[10px] text-gray-400">
              <div className="h-12 w-12 rounded-md border border-gray-200 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%,transparent_75%,#f8fafc_75%),linear-gradient(45deg,#f8fafc_25%,#fff_25%,#fff_75%,#f8fafc_75%)] [background-size:8px_8px] [background-position:0_0,4px_4px] overflow-hidden">
                <img
                  src={thumbUrl(file.processedPath) || ""}
                  alt="processed"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="mt-0.5">arkasız</span>
            </div>
          )}
          {file.lifestylePath && (
            <div className="flex flex-col items-center text-[10px] text-gray-400">
              <div className="h-12 w-12 overflow-hidden rounded-md border border-gray-200">
                <img
                  src={thumbUrl(file.lifestylePath) || ""}
                  alt="lifestyle"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="mt-0.5">{file.lifestylePreset || "lifestyle"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
