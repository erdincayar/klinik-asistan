"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  ChevronLeft,
  Check,
  Loader2,
  ArrowRight,
  Calendar,
  DollarSign,
  Share2,
  Users,
  Bot,
  Megaphone,
  Sparkles,
} from "lucide-react";
import {
  PAIN_POINT_OPTIONS,
  SECTOR_OPTIONS,
  TEAM_SIZE_OPTIONS,
} from "@/lib/onboarding/module-definitions";
import type { ModuleRecommendation, AnalysisResult } from "@/lib/onboarding/onboarding-agent";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  Calendar,
  DollarSign,
  Sparkles,
  Megaphone,
  Share2,
  Users,
  Bot,
};

function ModuleIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const Icon = ICON_MAP[name] || Bot;
  return (
    <span style={color ? { color } : undefined}>
      <Icon className={className} />
    </span>
  );
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export default function OnboardingWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Data
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const [sectorCustom, setSectorCustom] = useState("");
  const [teamSize, setTeamSize] = useState<string | null>(null);
  const [painPoints, setPainPoints] = useState<Set<string>>(new Set());
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);

  // Listen for external open events
  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("open-onboarding-widget", handleOpen);
    return () => window.removeEventListener("open-onboarding-widget", handleOpen);
  }, []);

  // Start session on first open
  useEffect(() => {
    if (open && !sessionId) {
      fetch("/api/onboarding/start", { method: "POST" })
        .then((r) => r.json())
        .then((data) => {
          if (data.sessionId) {
            setSessionId(data.sessionId);
          }
        })
        .catch(console.error);
    }
  }, [open, sessionId]);

  const fireUpdate = useCallback(
    (data: Record<string, unknown>) => {
      if (!sessionId) return;
      fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...data }),
      }).catch(console.error);
    },
    [sessionId]
  );

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  function handleSectorSelect(id: string) {
    setSector(id);
    fireUpdate({ sector: id });
    if (id !== "other") {
      goNext();
    }
  }

  function handleSectorCustomSubmit() {
    if (sectorCustom.trim()) {
      fireUpdate({ sector: "other", sectorCustom: sectorCustom.trim() });
      goNext();
    }
  }

  function handleTeamSizeSelect(id: string) {
    setTeamSize(id);
    fireUpdate({ teamSize: id });
    goNext();
  }

  function togglePainPoint(id: string) {
    setPainPoints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAnalyze() {
    if (painPoints.size === 0 || !sessionId) return;
    const arr = Array.from(painPoints);
    fireUpdate({ painPoints: arr });
    setAnalyzing(true);
    goNext();

    try {
      const res = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
      // Pre-select all recommended modules
      const slugs = new Set(data.recommendedModules.map((m) => m.slug));
      setSelectedModules(slugs);
    } catch {
      // fallback
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleModuleSelection(slug: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function handleBuildPackage() {
    setDirection(1);
    setStep(4);
  }

  async function handleComplete() {
    if (!sessionId) return;
    const slugs = Array.from(selectedModules);
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, selectedModules: slugs }),
    }).catch(console.error);
    sessionStorage.setItem("onboardingProfileSessionId", sessionId);
    window.location.href = "/register";
  }

  const totalPrice = analysisResult
    ? [...analysisResult.recommendedModules, ...analysisResult.upsellModules]
        .filter((m) => selectedModules.has(m.slug))
        .reduce((sum, m) => sum + m.basePrice, 0)
    : 0;

  const selectedList = analysisResult
    ? [...analysisResult.recommendedModules, ...analysisResult.upsellModules].filter(
        (m) => selectedModules.has(m.slug)
      )
    : [];

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring", stiffness: 200 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#EF9F27] text-white shadow-lg shadow-[#EF9F27]/30 transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-[60] flex w-[420px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/10 max-sm:inset-0 max-sm:bottom-0 max-sm:right-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-none"
            style={{ height: "min(600px, calc(100vh - 120px))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 bg-[#EF9F27] px-5 py-4">
              {step > 0 && (
                <button onClick={goBack} className="mr-1 text-white/80 hover:text-white">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Poby Asistan</p>
                <p className="text-[11px] text-amber-100">Size özel paket oluşturalım</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white sm:hidden">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 border-b border-gray-50 py-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === step
                      ? "w-6 bg-[#EF9F27]"
                      : i < step
                      ? "w-2 bg-[#F5B940]"
                      : "w-2 bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait" custom={direction}>
                {step === 0 && (
                  <motion.div
                    key="step-0"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="p-5"
                  >
                    <h3 className="mb-1 text-lg font-bold text-gray-900">Sektörünüz nedir?</h3>
                    <p className="mb-5 text-sm text-gray-500">
                      İşletmenize en uygun çözümü bulalım
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {SECTOR_OPTIONS.filter((s) => s.id !== "other").map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSectorSelect(s.id)}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all hover:border-[#F5B940] hover:bg-[#FDF3E3] ${
                            sector === s.id
                              ? "border-[#EF9F27] bg-[#FDF3E3]"
                              : "border-gray-100"
                          }`}
                        >
                          <span className="text-2xl">{s.emoji}</span>
                          <span className="text-sm font-medium text-gray-800">{s.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => handleSectorSelect("other")}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all hover:border-[#F5B940] hover:bg-[#FDF3E3] ${
                          sector === "other" ? "border-[#EF9F27] bg-[#FDF3E3]" : "border-gray-100"
                        }`}
                      >
                        <span className="text-2xl">✏️</span>
                        <span className="text-sm font-medium text-gray-800">Diğer</span>
                      </button>
                      {sector === "other" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-3 flex gap-2"
                        >
                          <input
                            value={sectorCustom}
                            onChange={(e) => setSectorCustom(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSectorCustomSubmit()}
                            placeholder="Sektörünüzü yazın..."
                            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#EF9F27] focus:outline-none focus:ring-2 focus:ring-[#EF9F27]/20"
                            autoFocus
                          />
                          <button
                            onClick={handleSectorCustomSubmit}
                            disabled={!sectorCustom.trim()}
                            className="rounded-xl bg-[#EF9F27] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step-1"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="p-5"
                  >
                    <h3 className="mb-1 text-lg font-bold text-gray-900">Ekibiniz kaç kişi?</h3>
                    <p className="mb-5 text-sm text-gray-500">
                      Ekip büyüklüğünüze göre çözüm öneriyoruz
                    </p>
                    <div className="space-y-3">
                      {TEAM_SIZE_OPTIONS.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTeamSizeSelect(t.id)}
                          className={`flex w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition-all hover:border-[#F5B940] hover:bg-[#FDF3E3] ${
                            teamSize === t.id
                              ? "border-[#EF9F27] bg-[#FDF3E3]"
                              : "border-gray-100"
                          }`}
                        >
                          <span className="text-3xl">{t.emoji}</span>
                          <span className="text-base font-semibold text-gray-800">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step-2"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="p-5"
                  >
                    <h3 className="mb-1 text-lg font-bold text-gray-900">En çok hangi konuda zorlanıyorsunuz?</h3>
                    <p className="mb-5 text-sm text-gray-500">
                      Birden fazla seçebilirsiniz
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PAIN_POINT_OPTIONS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => togglePainPoint(p.id)}
                          className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                            painPoints.has(p.id)
                              ? "border-[#EF9F27] bg-[#FDF3E3] text-[#BA7517]"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <ModuleIcon name={p.icon} className="h-4 w-4" />
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={painPoints.size === 0}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#EF9F27] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#D88A1B] disabled:opacity-40"
                    >
                      Analiz Et
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step-3"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="p-5"
                  >
                    {analyzing ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#EF9F27]" />
                        <p className="text-sm font-medium text-gray-600">Profiliniz analiz ediliyor...</p>
                        <p className="mt-1 text-xs text-gray-400">Bu birkaç saniye sürebilir</p>
                      </div>
                    ) : analysisResult ? (
                      <div>
                        {/* Custom message */}
                        <div className="mb-5 rounded-xl bg-[#FDF3E3] p-4">
                          <p className="text-sm leading-relaxed text-[#8C5811]">
                            {analysisResult.customMessage}
                          </p>
                        </div>

                        {/* Recommended modules */}
                        <div className="mb-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Sizin için önerildi
                            </span>
                          </div>
                          <div className="space-y-2">
                            {analysisResult.recommendedModules.map((mod) => (
                              <ModuleCard
                                key={mod.slug}
                                module={mod}
                                selected={selectedModules.has(mod.slug)}
                                onToggle={() => toggleModuleSelection(mod.slug)}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Upsell modules */}
                        {analysisResult.upsellModules.length > 0 && (
                          <div className="mb-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                              Keşfet
                            </p>
                            <div className="space-y-2">
                              {analysisResult.upsellModules.map((mod) => (
                                <ModuleCard
                                  key={mod.slug}
                                  module={mod}
                                  selected={selectedModules.has(mod.slug)}
                                  onToggle={() => toggleModuleSelection(mod.slug)}
                                  muted
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleBuildPackage}
                          disabled={selectedModules.size === 0}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#EF9F27] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#D88A1B] disabled:opacity-40"
                        >
                          Paketimi Oluştur
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16">
                        <p className="text-sm text-gray-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                        <button onClick={goBack} className="mt-3 text-sm font-medium text-[#EF9F27]">
                          Geri Dön
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step-4"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="p-5"
                  >
                    <h3 className="mb-1 text-lg font-bold text-gray-900">Kişisel Paketiniz</h3>
                    <p className="mb-5 text-sm text-gray-500">
                      {selectedModules.size} modül seçildi
                    </p>

                    <div className="space-y-2">
                      {selectedList.map((mod) => (
                        <div
                          key={mod.slug}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 p-3"
                        >
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${mod.color}15` }}
                          >
                            <ModuleIcon name={mod.icon} className="h-4 w-4" color={mod.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{mod.name}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-700">₺{mod.basePrice}/ay</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Toplam</span>
                        <span className="text-xl font-bold text-gray-900">₺{totalPrice}/ay</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        AI kredisi kullandıkça ödeyin
                      </p>
                    </div>

                    <button
                      onClick={handleComplete}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#EF9F27] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#D88A1B]"
                    >
                      Hemen Başla — Ücretsiz Dene
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => (window.location.href = "/demo")}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
                    >
                      Demo Talep Et
                    </button>

                    <p className="mt-4 text-center text-xs text-gray-400">
                      14 gün ücretsiz, kredi kartı gerekmez
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Module Card ── */

function ModuleCard({
  module: mod,
  selected,
  onToggle,
  muted = false,
}: {
  module: ModuleRecommendation;
  selected: boolean;
  onToggle: () => void;
  muted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border-2 p-3 transition-all ${
        selected
          ? "border-[#F5B940] bg-[#FDF3E3]/50"
          : muted
          ? "border-gray-100 bg-gray-50/50"
          : "border-gray-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            selected ? "border-[#EF9F27] bg-[#EF9F27]" : "border-gray-300"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${mod.color}15` }}
              >
                <ModuleIcon name={mod.icon} className="h-3.5 w-3.5" color={mod.color} />
              </div>
              <span className="text-[13px] font-semibold text-gray-800">{mod.name}</span>
            </div>
            <span className="text-[13px] font-bold text-[#EF9F27]">₺{mod.basePrice}/ay</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">{mod.reasoning}</p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-[11px] font-medium text-[#BA7517] hover:underline"
          >
            {expanded ? "Gizle" : "Detaylar"}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <ul className="mt-2 space-y-1">
                  {mod.featureList.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Check className="h-3 w-3 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
