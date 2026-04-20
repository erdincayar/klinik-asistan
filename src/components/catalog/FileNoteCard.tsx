"use client";

import { useEffect, useState } from "react";
import {
  FileText as FileIcon,
  Image as ImageIcon,
  Sheet,
  Trash2,
  Loader2,
  Sparkles,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Card per source file — shows metadata, lets the admin write a
 * per-file note and trigger an AI analysis. Both go into the
 * extract-products prompt during the next analyze run.
 */

export interface CatalogFileRow {
  id: string;
  fileType: "REFERENCE_PDF" | "PRODUCT_IMAGE" | "EXCEL_DATA" | string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  userNote: string | null;
  aiNote: any | null;
  aiAnalyzedAt: string | null;
  uploadedAt: string;
}

interface Props {
  file: CatalogFileRow;
  onDelete: (id: string) => void;
  onChanged: () => void; // parent refresh hook
}

function formatBytes(b: number) {
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(0) + " KB";
  return b + " B";
}

function TypeIcon({ type }: { type: string }) {
  if (type === "PRODUCT_IMAGE") return <ImageIcon className="h-4 w-4 text-emerald-500" />;
  if (type === "EXCEL_DATA") return <Sheet className="h-4 w-4 text-amber-500" />;
  return <FileIcon className="h-4 w-4 text-indigo-500" />;
}

export default function FileNoteCard({ file, onDelete, onChanged }: Props) {
  const [note, setNote] = useState(file.userNote ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!!file.userNote || !!file.aiNote);

  // Keep local note in sync when the row is refetched externally
  useEffect(() => {
    setNote(file.userNote ?? "");
  }, [file.userNote]);

  async function saveNote() {
    if (savingNote) return;
    setSavingNote(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalog/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNote: note.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kaydetme hatası");
      }
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingNote(false);
    }
  }

  async function runAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      // First save any pending note so the AI sees it.
      if ((note.trim() || null) !== file.userNote) {
        await fetch(`/api/admin/catalog/files/${file.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userNote: note.trim() || null }),
        });
      }
      const res = await fetch(`/api/admin/catalog/files/${file.id}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Analiz hatası");
      }
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const ai = file.aiNote as any;
  const hasAi = !!ai;
  const canShowThumb = file.fileType === "PRODUCT_IMAGE";

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-50 px-3 py-2">
        {canShowThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/admin/catalog/files/${file.id}/raw?thumb=1`}
            alt=""
            className="h-8 w-8 shrink-0 rounded bg-gray-100 object-cover"
          />
        ) : (
          <TypeIcon type={file.fileType} />
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-medium text-gray-800">
            {file.originalName}
          </p>
          <p className="text-[10px] text-gray-400">
            {formatBytes(file.fileSize)}
            {hasAi && file.aiAnalyzedAt && (
              <span className="ml-2 text-emerald-600">
                · AI analiz edildi
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded p-1 text-[10px] text-gray-500 hover:bg-gray-100"
          title={expanded ? "Gizle" : "Yorum/analiz"}
        >
          {expanded ? "–" : "+"}
        </button>
        <button
          onClick={() => onDelete(file.id)}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* User note */}
          <div>
            <label className="text-[11px] font-medium text-gray-600">
              Yorum (AI&apos;ya ipucu)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                file.fileType === "EXCEL_DATA"
                  ? "örn: Son kolon kampanyalı ürünleri gösterir, iskontolu listedir"
                  : file.fileType === "REFERENCE_PDF"
                  ? "örn: İlk 3 sayfa giriş, sayfa 4'ten itibaren ürünler başlar"
                  : "örn: Dosya adları ürün kodları ile eşleşir (URN-001 = Urun kodu)"
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
              maxLength={4000}
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={saveNote}
                disabled={savingNote || (note.trim() || null) === (file.userNote ?? null)}
              >
                {savingNote ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : noteSaved ? (
                  <Check className="mr-1 h-3 w-3 text-emerald-500" />
                ) : null}
                {savingNote ? "Kaydediliyor…" : noteSaved ? "Kaydedildi" : "Yorumu kaydet"}
              </Button>

              <Button
                size="sm"
                onClick={runAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                {analyzing ? "Analiz…" : hasAi ? "Yeniden Analiz" : "AI ile Analiz Et"}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-1.5 rounded-lg border border-red-100 bg-red-50/60 p-2 text-[11px] text-red-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI summary */}
          {hasAi && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-2.5 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1 font-semibold text-indigo-700">
                <Sparkles className="h-3 w-3" />
                AI Analiz
              </div>
              {ai.summary && (
                <p className="text-gray-700 leading-relaxed">{ai.summary}</p>
              )}
              {Array.isArray(ai.detectedColumns) && ai.detectedColumns.length > 0 && (
                <p className="text-gray-600">
                  <span className="font-medium">Kolonlar:</span>{" "}
                  {ai.detectedColumns.join(", ")}
                </p>
              )}
              {typeof ai.rowCount === "number" && (
                <p className="text-gray-600">
                  <span className="font-medium">Satır sayısı:</span> {ai.rowCount}
                </p>
              )}
              {Array.isArray(ai.issues) && ai.issues.length > 0 && (
                <div>
                  <p className="font-medium text-amber-700">Sorunlar:</p>
                  <ul className="list-disc pl-4 text-amber-700">
                    {ai.issues.map((x: string, i: number) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(ai.suggestions) && ai.suggestions.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700">Öneriler:</p>
                  <ul className="list-disc pl-4 text-gray-700">
                    {ai.suggestions.map((x: string, i: number) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ai.usableForExtraction === false && (
                <p className="text-red-600 font-medium">
                  ⚠ AI bu dosyayı extraction için yeterli bulmadı.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
