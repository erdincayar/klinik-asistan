"use client";

import { Clock, Loader2, CheckCircle2, AlertTriangle, FileText, Sparkles } from "lucide-react";

export type CatalogStatus =
  | "DRAFT"
  | "ANALYZING"
  | "READY_TO_GENERATE"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED";

const CONFIG: Record<
  CatalogStatus,
  { label: string; color: string; Icon: typeof Clock; pulse?: boolean }
> = {
  DRAFT:              { label: "Taslak",       color: "bg-gray-100 text-gray-700 ring-gray-200",       Icon: FileText },
  ANALYZING:          { label: "Analiz",       color: "bg-indigo-50 text-indigo-700 ring-indigo-200", Icon: Loader2, pulse: true },
  READY_TO_GENERATE:  { label: "Hazır",        color: "bg-amber-50 text-amber-700 ring-amber-200",    Icon: Sparkles },
  GENERATING:         { label: "Üretiliyor",   color: "bg-blue-50 text-blue-700 ring-blue-200",       Icon: Loader2, pulse: true },
  COMPLETED:          { label: "Tamamlandı",   color: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircle2 },
  FAILED:             { label: "Hata",         color: "bg-red-50 text-red-700 ring-red-200",          Icon: AlertTriangle },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as CatalogStatus] ?? CONFIG.DRAFT;
  const { label, color, Icon, pulse } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${color}`}
    >
      <Icon className={`h-3 w-3 ${pulse ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}
