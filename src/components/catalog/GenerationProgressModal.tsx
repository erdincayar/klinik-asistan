"use client";

import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  status: string;
  title?: string;
  description?: string;
  onClose?: () => void;
}

/**
 * Read-only modal shown while the project is ANALYZING or GENERATING.
 * Client-side polling outside this component updates `status`; once it
 * transitions out, the caller typically closes the modal.
 */
export default function GenerationProgressModal({
  open,
  status,
  title,
  description,
  onClose,
}: Props) {
  if (!open) return null;

  const running = status === "ANALYZING" || status === "GENERATING";
  const failed = status === "FAILED";
  const completed = status === "READY_TO_GENERATE" || status === "COMPLETED";

  let label = "Bekleniyor";
  if (status === "ANALYZING") label = "PDF analiz ediliyor ve ürünler çıkartılıyor";
  else if (status === "GENERATING") label = "Katalog PDF'i üretiliyor";
  else if (status === "READY_TO_GENERATE") label = "Analiz tamamlandı — üretime hazır";
  else if (status === "COMPLETED") label = "Katalog hazır";
  else if (status === "FAILED") label = "İşlem başarısız oldu";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              failed
                ? "bg-red-50"
                : completed
                ? "bg-emerald-50"
                : "bg-indigo-50"
            }`}
          >
            {running ? (
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            ) : failed ? (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {title || (running ? "Lütfen bekleyin" : failed ? "Hata" : "Tamamlandı")}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{description || label}</p>

            {running && (
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full w-1/3 animate-pulse bg-indigo-500" />
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  Bu işlem birkaç dakika sürebilir. Sayfadan ayrılabilirsiniz —
                  işlem arka planda devam eder.
                </p>
              </div>
            )}
          </div>
        </div>

        {!running && onClose && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={onClose}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                failed
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
