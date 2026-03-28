"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Palette,
  Instagram,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Image as ImageIcon,
  Wand2,
  Settings2,
  Check,
  X,
} from "lucide-react";

interface StyleProfile {
  id: string;
  source: string;
  colorPalette: string[];
  designTone: string | null;
  contentMood: string | null;
  compositionStyle: string | null;
  typographyStyle: string | null;
  visualComplexity: string | null;
  stylePromptFragment: string | null;
  analyzedAt: string | null;
}

interface GeneratedContent {
  id: string;
  userPrompt: string;
  agentPrompt: string | null;
  imageUrl: string | null;
  status: string;
  isLiked: boolean | null;
  createdAt: string;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Profesyonel" },
  { value: "playful", label: "Eğlenceli" },
  { value: "luxury", label: "Lüks" },
  { value: "minimalist", label: "Minimalist" },
  { value: "bold", label: "Cesur" },
  { value: "warm", label: "Sıcak" },
];

const MOOD_OPTIONS = [
  { value: "energetic", label: "Enerjik" },
  { value: "calm", label: "Sakin" },
  { value: "inspiring", label: "İlham Verici" },
  { value: "informative", label: "Bilgilendirici" },
  { value: "friendly", label: "Samimi" },
  { value: "sophisticated", label: "Sofistike" },
];

const COMPLEXITY_OPTIONS = [
  { value: "low", label: "Sade" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Detaylı" },
];

const QUICK_PROMPTS = [
  "Yılbaşı kutlama görseli",
  "Kampanya duyurusu",
  "Yeni hizmet tanıtımı",
  "Müşteri memnuniyeti",
  "Sezon indirimi",
  "Motivasyon görseli",
];

const PRESET_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

export default function AiStudioContent() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [gallery, setGallery] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [showStyleSetup, setShowStyleSetup] = useState(false);
  const [lastResult, setLastResult] = useState<{ id: string; imageUrl: string; agentPrompt: string } | null>(null);
  const [error, setError] = useState("");

  // Manual style form
  const [styleForm, setStyleForm] = useState({
    colorPalette: ["#3B82F6", "#10B981", "#F59E0B"],
    designTone: "professional",
    contentMood: "friendly",
    compositionStyle: "balanced",
    typographyStyle: "modern sans-serif",
    visualComplexity: "medium" as "low" | "medium" | "high",
  });

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, galleryRes] = await Promise.all([
        fetch("/api/marketing/ai-studio/style-profile"),
        fetch("/api/marketing/ai-studio/gallery"),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }
      if (galleryRes.ok) {
        const data = await galleryRes.json();
        setGallery(data.items || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAnalyzeInstagram() {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/marketing/ai-studio/analyze-instagram", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      setShowStyleSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Instagram analizi başarısız");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveManualStyle() {
    setSavingStyle(true);
    setError("");
    try {
      const res = await fetch("/api/marketing/ai-studio/save-manual-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(styleForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      setShowStyleSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stil kaydetme başarısız");
    } finally {
      setSavingStyle(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setLastResult(null);
    setGenerationPhase("Prompt planlanıyor...");

    try {
      setTimeout(() => {
        if (generating) setGenerationPhase("Görsel üretiliyor...");
      }, 5000);

      const res = await fetch("/api/marketing/ai-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLastResult({
        id: data.id,
        imageUrl: data.imageUrl,
        agentPrompt: data.agentPrompt,
      });
      setPrompt("");
      // Refresh gallery
      const galleryRes = await fetch("/api/marketing/ai-studio/gallery");
      if (galleryRes.ok) {
        const galleryData = await galleryRes.json();
        setGallery(galleryData.items || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel üretimi başarısız");
    } finally {
      setGenerating(false);
      setGenerationPhase("");
    }
  }

  async function handleFeedback(contentId: string, isLiked: boolean | null) {
    try {
      await fetch("/api/marketing/ai-studio/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, isLiked }),
      });
      // Update local state
      setGallery((prev) =>
        prev.map((item) => (item.id === contentId ? { ...item, isLiked } : item))
      );
      if (lastResult?.id === contentId) {
        setLastResult((prev) => prev ? { ...prev } : null);
      }
    } catch {
      // silent
    }
  }

  function toggleColor(color: string) {
    setStyleForm((prev) => {
      const exists = prev.colorPalette.includes(color);
      if (exists) {
        return { ...prev, colorPalette: prev.colorPalette.filter((c) => c !== color) };
      }
      if (prev.colorPalette.length >= 6) return prev;
      return { ...prev, colorPalette: [...prev.colorPalette, color] };
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI Stüdyo</h2>
        </div>
        {profile && (
          <button
            onClick={() => setShowStyleSetup(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Stili Güncelle
          </button>
        )}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-500 hover:text-red-700">
            <X className="inline h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {/* Section A: Style Setup */}
      {!profile && !showStyleSetup && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Stil Kurulumu</h3>
            <p className="text-xs text-gray-500 mt-1">
              Görsellerinizin tutarlı bir stile sahip olması için önce markanızın stilini belirleyin.
            </p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <button
              onClick={handleAnalyzeInstagram}
              disabled={analyzing}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-6 transition-colors hover:border-pink-300 hover:bg-pink-50/50"
            >
              {analyzing ? (
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              ) : (
                <Instagram className="h-8 w-8 text-pink-500" />
              )}
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Instagram Analizi</p>
                <p className="text-xs text-gray-500 mt-1">
                  Mevcut Instagram görsellerinizden stil çıkarın
                </p>
                <span className="mt-2 inline-block rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600">
                  5.000 token
                </span>
              </div>
            </button>

            <button
              onClick={() => setShowStyleSetup(true)}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-6 transition-colors hover:border-purple-300 hover:bg-purple-50/50"
            >
              <Palette className="h-8 w-8 text-purple-500" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Manuel Ayarla</p>
                <p className="text-xs text-gray-500 mt-1">
                  Renk, ton ve stil tercihlerinizi kendiniz belirleyin
                </p>
                <span className="mt-2 inline-block rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                  Ücretsiz
                </span>
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {/* Style Profile Summary */}
      {profile && !showStyleSetup && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-900">Marka Stili</h3>
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600">
                  {profile.source === "INSTAGRAM" ? "Instagram" : "Manuel"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 px-6 py-4">
            <div className="flex gap-1.5">
              {profile.colorPalette.map((color, i) => (
                <div
                  key={i}
                  className="h-6 w-6 rounded-full border border-gray-200"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            {profile.designTone && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                {profile.designTone}
              </span>
            )}
            {profile.contentMood && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                {profile.contentMood}
              </span>
            )}
            {profile.visualComplexity && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                {profile.visualComplexity}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Manual Style Setup Modal */}
      {showStyleSetup && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Stil Ayarları</h3>
            <button
              onClick={() => setShowStyleSetup(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-5 p-6">
            {/* Color Palette */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-600">
                Renk Paleti (en az 1, en fazla 6)
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => toggleColor(color)}
                    className="relative h-8 w-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: styleForm.colorPalette.includes(color) ? "#111" : "#e5e7eb",
                    }}
                  >
                    {styleForm.colorPalette.includes(color) && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Design Tone */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-600">Tasarım Tonu</label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyleForm({ ...styleForm, designTone: opt.value })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      styleForm.designTone === opt.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Mood */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-600">İçerik Havası</label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyleForm({ ...styleForm, contentMood: opt.value })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      styleForm.contentMood === opt.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Complexity */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-600">Görsel Karmaşıklık</label>
              <div className="flex gap-2">
                {COMPLEXITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setStyleForm({ ...styleForm, visualComplexity: opt.value as "low" | "medium" | "high" })
                    }
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      styleForm.visualComplexity === opt.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveManualStyle}
              disabled={savingStyle || styleForm.colorPalette.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {savingStyle ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {savingStyle ? "Kaydediliyor..." : "Stili Kaydet"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Section B: Content Generation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="overflow-hidden rounded-xl border border-gray-100 bg-white"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Görsel Oluştur</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Quick prompts */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Hızlı Seçim</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  onClick={() => setPrompt(qp)}
                  className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700 transition-colors hover:bg-purple-100"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Ne tür bir görsel istersiniz?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Örn: Instagram için modern bir yılbaşı kutlama görseli, lacivert ve altın tonlarında..."
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
              disabled={generating}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {generationPhase}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Oluştur
                <span className="rounded-full bg-purple-500 px-2 py-0.5 text-[10px]">
                  6.000 token
                </span>
              </>
            )}
          </button>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className="border-t border-gray-100 p-6">
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <img
                src={lastResult.imageUrl}
                alt="AI Generated"
                className="w-full"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500 max-w-[70%] truncate" title={lastResult.agentPrompt}>
                {lastResult.agentPrompt}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFeedback(lastResult.id, true)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleFeedback(lastResult.id, false)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Section C: Gallery */}
      {gallery.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">Galeri</h3>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                {gallery.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="group relative overflow-hidden rounded-xl border border-gray-100"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.userPrompt}
                    className="aspect-square w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-[11px] text-white/90 line-clamp-2">{item.userPrompt}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-[10px] text-white/60">
                        {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            handleFeedback(item.id, item.isLiked === true ? null : true)
                          }
                          className={`rounded p-1 transition-colors ${
                            item.isLiked === true
                              ? "bg-green-500/30 text-green-300"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() =>
                            handleFeedback(item.id, item.isLiked === false ? null : false)
                          }
                          className={`rounded p-1 transition-colors ${
                            item.isLiked === false
                              ? "bg-red-500/30 text-red-300"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
