"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, FileText as FileIcon } from "lucide-react";

export interface FileUploadZoneProps {
  label: string;
  description?: string;
  accept: string;                 // e.g. "application/pdf" or "image/*"
  multiple?: boolean;
  required?: boolean;
  /**
   * Upload handler. Implementations normally POST to
   * /api/admin/catalog/projects/[id]/upload with the appropriate
   * fileType. The zone only cares about reporting per-file progress.
   */
  onUpload: (files: File[], onProgress: (pct: number) => void) => Promise<void>;
  /** Optional: caller-owned staged list (e.g. before the project exists yet). */
  stagedFiles?: File[];
  onStagedChange?: (files: File[]) => void;
  /** Extra info for the user (uploaded counts, quota, etc.) */
  meta?: string;
  maxBytes?: number;
}

export default function FileUploadZone({
  label,
  description,
  accept,
  multiple = false,
  required = false,
  onUpload,
  stagedFiles,
  onStagedChange,
  meta,
  maxBytes,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (files: File[]) => {
      setError(null);
      if (files.length === 0) return;

      if (maxBytes) {
        const tooBig = files.find((f) => f.size > maxBytes);
        if (tooBig) {
          setError(
            `"${tooBig.name}" çok büyük (${(tooBig.size / 1024 / 1024).toFixed(1)}MB)`
          );
          return;
        }
      }

      if (onStagedChange) {
        // staged mode — collect without uploading yet
        onStagedChange([...(stagedFiles || []), ...files]);
        return;
      }

      setUploading(true);
      setProgress(0);
      try {
        await onUpload(files, (pct) => setProgress(pct));
      } catch (e: any) {
        setError(e?.message || "Yükleme hatası");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onUpload, stagedFiles, onStagedChange, maxBytes]
  );

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        submit(multiple ? files : files.slice(0, 1));
      }}
      className={`rounded-2xl border-2 border-dashed transition-all ${
        dragging
          ? "border-indigo-400 bg-indigo-50/50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) submit(files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full p-6 text-left disabled:cursor-not-allowed"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-indigo-50 p-3">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <Upload className="h-5 w-5 text-indigo-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </p>
            {description && (
              <p className="mt-0.5 text-xs text-gray-500">{description}</p>
            )}
            <p className="mt-2 text-[11px] text-gray-400">
              {uploading
                ? `Yükleniyor %${progress}`
                : "Dosyayı buraya sürükle veya tıklayarak seç"}
            </p>
            {meta && <p className="mt-1 text-[11px] text-gray-400">{meta}</p>}
          </div>
        </div>

        {uploading && (
          <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </button>

      {stagedFiles && stagedFiles.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <ul className="space-y-1.5">
            {stagedFiles.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-gray-400 shrink-0">
                    {(f.size / 1024 / 1024).toFixed(2)}MB
                  </span>
                </div>
                {onStagedChange && (
                  <button
                    type="button"
                    onClick={() =>
                      onStagedChange(stagedFiles.filter((_, j) => j !== i))
                    }
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="border-t border-red-100 bg-red-50/50 px-4 py-2 text-[11px] text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
