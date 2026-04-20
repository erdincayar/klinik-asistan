"use client";

import { Check, Loader2 } from "lucide-react";

const STEPS = [
  { key: "upload",   label: "Yüklendi" },
  { key: "analyze",  label: "Analiz" },
  { key: "ready",    label: "Hazır" },
  { key: "generate", label: "Üretildi" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function statusToActiveStep(status: string): { current: StepKey; inProgress: boolean } {
  switch (status) {
    case "DRAFT":             return { current: "upload",   inProgress: false };
    case "ANALYZING":         return { current: "analyze",  inProgress: true };
    case "READY_TO_GENERATE": return { current: "ready",    inProgress: false };
    case "GENERATING":        return { current: "generate", inProgress: true };
    case "COMPLETED":         return { current: "generate", inProgress: false };
    case "FAILED":            return { current: "analyze",  inProgress: false };
    default:                  return { current: "upload",   inProgress: false };
  }
}

export default function StatusTimeline({ status }: { status: string }) {
  const { current, inProgress } = statusToActiveStep(status);
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  const failed = status === "FAILED";

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < currentIdx || (i === currentIdx && !inProgress && status === "COMPLETED");
        const active = i === currentIdx;
        const reached = i <= currentIdx;

        return (
          <li key={s.key} className="flex items-center gap-2 flex-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                failed && active
                  ? "bg-red-50 text-red-700 ring-red-200"
                  : done
                  ? "bg-emerald-500 text-white ring-emerald-500"
                  : active
                  ? "bg-indigo-500 text-white ring-indigo-500"
                  : "bg-white text-gray-400 ring-gray-200"
              }`}
            >
              {active && inProgress ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : done ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-xs whitespace-nowrap ${
                reached ? "font-semibold text-gray-900" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-px flex-1 ${
                  i < currentIdx ? "bg-emerald-300" : "bg-gray-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
