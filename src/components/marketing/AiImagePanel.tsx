"use client";

import { useState, useRef } from "react";
import {
  Wand2, Camera, Film, Upload, X, Loader2, Sparkles,
  Eye, RotateCcw, MessageSquare, RefreshCw, ChevronRight,
  ChevronLeft, Check, Palette, Type, Shield, SmilePlus,
  Ban, Image as LucideImage, FolderOpen, SkipForward,
  Monitor, Square, Smartphone, Bookmark,
} from "lucide-react";

interface AiImagePanelProps {
  tweetContent: string;
  onSelectImage: (imageUrl: string) => void;
  onUploadFile: () => void;
  onClose: () => void;
}

interface Preferences {
  style: string;
  colorPalette: string;
  subject: string;
  textOverlay: string;
  fontStyle: string;
  logo: string;
  mood: string;
  avoid: string;
}

type Step = "purpose" | "q1" | "q2" | "q3" | "q4" | "q5" | "q6" | "q7" | "reference" | "summary" | "settings" | "results";

const STEP_ORDER: Step[] = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "reference", "summary", "settings"];

const STYLE_OPTIONS = [
  { value: "photorealistic", label: "Fotoğraf gerçekçiliğinde", icon: "📷" },
  { value: "digital-design", label: "Dijital tasarım", icon: "🎨" },
  { value: "infographic", label: "İnfografik", icon: "📊" },
  { value: "illustration", label: "İllüstrasyon", icon: "✏️" },
  { value: "minimalist-typography", label: "Minimalist tipografi", icon: "🔤" },
];

const COLOR_OPTIONS = [
  { value: "brand", label: "Marka renklerim", desc: "#6C3CE1 mor, #19094D navy", colors: ["#6C3CE1", "#19094D", "#5B33E1"] },
  { value: "dark", label: "Koyu tonlar", desc: "Lacivert, siyah, koyu gri", colors: ["#1a1a2e", "#16213e", "#0f3460"] },
  { value: "light", label: "Açık-pastel", desc: "Yumuşak, hafif tonlar", colors: ["#f8e8ee", "#e8d5f5", "#d5e8f8"] },
  { value: "vibrant", label: "Canlı-enerjik", desc: "Parlak, dikkat çekici", colors: ["#ff6b6b", "#feca57", "#48dbfb"] },
  { value: "bw", label: "Siyah-beyaz", desc: "Monokrom, şık", colors: ["#000000", "#666666", "#ffffff"] },
];

const MOOD_OPTIONS = [
  { value: "professional", label: "Profesyonel", icon: "💼" },
  { value: "warm", label: "Samimi-sıcak", icon: "🤝" },
  { value: "energetic", label: "Enerjik", icon: "⚡" },
  { value: "luxury", label: "Lüks", icon: "✨" },
  { value: "fun", label: "Eğlenceli", icon: "🎉" },
];

export default function AiImagePanel({ tweetContent, onSelectImage, onUploadFile, onClose }: AiImagePanelProps) {
  const [step, setStep] = useState<Step>("purpose");
  const [prefs, setPrefs] = useState<Preferences>({
    style: "", colorPalette: "brand", subject: "", textOverlay: "none",
    fontStyle: "", logo: "none", mood: "", avoid: "",
  });

  // Reference
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Build prompt
  const [building, setBuilding] = useState(false);
  const [builtPrompt, setBuiltPrompt] = useState("");
  const [builtSummary, setBuiltSummary] = useState("");

  // Generation
  const [model, setModel] = useState<"flux-schnell" | "flux-pro">("flux-schnell");
  const [aspect, setAspect] = useState<"16:9" | "1:1" | "9:16">("16:9");
  const [count, setCount] = useState<1 | 2 | 3>(1);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<{ url: string; id: string }[]>([]);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Lightbox
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Screenshot placeholder
  const [screenshotPage, setScreenshotPage] = useState("");

  function goNext() {
    const idx = STEP_ORDER.indexOf(step as any);
    if (idx >= 0 && idx < STEP_ORDER.length - 1) {
      const next = STEP_ORDER[idx + 1];
      if (next === "summary") buildPrompt();
      setStep(next);
    }
  }

  function goBack() {
    if (step === "results") { setStep("settings"); return; }
    if (step === "settings") { setStep("summary"); return; }
    const idx = STEP_ORDER.indexOf(step as any);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
    else setStep("purpose");
  }

  function getStepNumber() {
    if (step === "purpose") return 0;
    if (step === "results") return 6;
    const qaSteps: Step[] = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];
    const qaIdx = qaSteps.indexOf(step);
    if (qaIdx >= 0) return 1;
    if (step === "reference") return 2;
    if (step === "summary") return 3;
    if (step === "settings") return 4;
    return 0;
  }

  function getStepLabel() {
    const labels: Record<string, string> = {
      purpose: "Kullanım Amacı",
      q1: "Soru 1/7 — Görsel Stili", q2: "Soru 2/7 — Renk Paleti", q3: "Soru 3/7 — İçerik",
      q4: "Soru 4/7 — Metin", q5: "Soru 5/7 — Logo", q6: "Soru 6/7 — Hissiyat", q7: "Soru 7/7 — Kaçınılacak",
      reference: "Referans Görsel", summary: "Özet ve Onay", settings: "Üretim Ayarları", results: "Sonuçlar",
    };
    return labels[step] || "";
  }

  async function buildPrompt() {
    setBuilding(true);
    try {
      const res = await fetch("/api/marketing/ai-studio/build-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetContent, ...prefs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBuiltPrompt(data.prompt);
      setBuiltSummary(data.summary);
    } catch (err) {
      setBuiltSummary("Tercihleriniz alındı.");
      // Fallback: build a basic prompt
      setBuiltPrompt(`${prefs.style || "modern"} social media image, ${prefs.mood || "professional"} mood, ${prefs.colorPalette === "brand" ? "purple #6C3CE1 and navy #19094D" : prefs.colorPalette} color palette`);
    } finally {
      setBuilding(false);
    }
  }

  async function handleGenerate() {
    if (!builtPrompt) return;
    setGenerating(true);
    setImages([]);
    setStep("results");
    try {
      const results: { url: string; id: string }[] = [];
      const promises = Array.from({ length: count }, () =>
        fetch("/api/marketing/ai-studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: builtPrompt, model, aspectRatio: aspect }),
        }).then(r => r.json())
      );
      const responses = await Promise.all(promises);
      for (const data of responses) {
        if (data.imageUrl) results.push({ url: data.imageUrl, id: data.id });
      }
      if (results.length === 0) throw new Error("Görsel üretilemedi");
      setImages(results);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Görsel üretimi başarısız");
      setStep("settings");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerateWithFeedback() {
    if (!feedback.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/ai-studio/refine-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalPrompt: builtPrompt, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBuiltPrompt(data.prompt);
      setFeedbackMode(false);
      setFeedback("");
      // Re-generate
      setImages([]);
      const results: { url: string; id: string }[] = [];
      const promises = Array.from({ length: count }, () =>
        fetch("/api/marketing/ai-studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: data.prompt, model, aspectRatio: aspect }),
        }).then(r => r.json())
      );
      const responses = await Promise.all(promises);
      for (const d of responses) {
        if (d.imageUrl) results.push({ url: d.imageUrl, id: d.id });
      }
      setImages(results);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Düzenleme başarısız");
    } finally {
      setGenerating(false);
    }
  }

  function handleRefUpload(files: FileList | null) {
    if (!files?.[0]) return;
    const file = files[0];
    setReferenceFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setReferencePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // Option button component
  function Opt({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
    return (
      <button
        onClick={onClick}
        className={`text-left rounded-xl border-2 p-3 transition-all ${
          selected ? "border-purple-400 bg-purple-50 ring-1 ring-purple-200" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
        } ${className || ""}`}
      >
        {children}
      </button>
    );
  }

  function SkipBtn() {
    return (
      <button onClick={goNext} className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600">
        <SkipForward className="h-3 w-3" /> Atla
      </button>
    );
  }

  return (
    <>
      <div className="mt-2 rounded-xl border border-purple-200 bg-purple-50/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-purple-50 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-800">AI ile Görsel Üret</span>
            <span className="text-[10px] text-purple-400 bg-purple-100 rounded-full px-2 py-0.5">{getStepLabel()}</span>
          </div>
          <div className="flex items-center gap-1">
            {step !== "purpose" && (
              <button onClick={goBack} className="rounded p-1 hover:bg-purple-100 text-purple-400">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={onClose} className="rounded p-1 hover:bg-purple-100 text-purple-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* ═══ STEP 0: PURPOSE ═══ */}
          {step === "purpose" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700 mb-3">Bu görseli ne için kullanacaksınız?</p>
              <button onClick={() => setStep("q1")} className="w-full flex items-center gap-3 rounded-xl border-2 border-gray-100 p-3.5 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left">
                <span className="text-lg">🎨</span>
                <div>
                  <p className="text-xs font-semibold text-gray-900">AI ile görsel üret</p>
                  <p className="text-[10px] text-gray-400">Soyut tasarım, infografik, illüstrasyon</p>
                </div>
              </button>
              <button onClick={() => alert("Ekran görüntüsü özelliği yakında aktif olacak")} className="w-full flex items-center gap-3 rounded-xl border-2 border-gray-100 p-3.5 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left opacity-80">
                <span className="text-lg">📸</span>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Poby.ai ekran görüntüsü</p>
                  <p className="text-[10px] text-gray-400">Dashboard, Randevu, CRM sayfaları (yakında)</p>
                </div>
              </button>
              <button onClick={() => alert("Video özelliği yakında aktif olacak")} className="w-full flex items-center gap-3 rounded-xl border-2 border-gray-100 p-3.5 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-left opacity-80">
                <span className="text-lg">🎬</span>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Poby.ai özellik tanıtım videosu</p>
                  <p className="text-[10px] text-gray-400">Kısa demo video, ekran kaydı (yakında)</p>
                </div>
              </button>
              <button onClick={onUploadFile} className="w-full flex items-center gap-3 rounded-xl border-2 border-gray-100 p-3.5 hover:border-gray-300 hover:bg-gray-50 transition-all text-left">
                <span className="text-lg">📁</span>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Dosya yükle</p>
                  <p className="text-[10px] text-gray-400">Kendi görselimi kullanacağım</p>
                </div>
              </button>
            </div>
          )}

          {/* ═══ Q1: STYLE ═══ */}
          {step === "q1" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Nasıl bir görsel hayal ediyorsunuz?</p>
                <SkipBtn />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map(s => (
                  <Opt key={s.value} selected={prefs.style === s.value} onClick={() => { setPrefs({ ...prefs, style: s.value }); goNext(); }}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{s.icon}</span>
                      <span className="text-xs font-medium text-gray-800">{s.label}</span>
                    </div>
                  </Opt>
                ))}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Veya serbest yaz..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                  onKeyDown={e => { if (e.key === "Enter" && (e.target as HTMLInputElement).value) { setPrefs({ ...prefs, style: (e.target as HTMLInputElement).value }); goNext(); } }}
                />
              </div>
            </div>
          )}

          {/* ═══ Q2: COLOR ═══ */}
          {step === "q2" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Renk paleti?</p>
                <SkipBtn />
              </div>
              <div className="space-y-2">
                {COLOR_OPTIONS.map(c => (
                  <Opt key={c.value} selected={prefs.colorPalette === c.value} onClick={() => { setPrefs({ ...prefs, colorPalette: c.value }); goNext(); }}>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {c.colors.map((clr, i) => (
                          <div key={i} className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: clr }} />
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{c.label}</p>
                        <p className="text-[10px] text-gray-400">{c.desc}</p>
                      </div>
                    </div>
                  </Opt>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Q3: SUBJECT ═══ */}
          {step === "q3" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Görselde ne olsun?</p>
                <SkipBtn />
              </div>
              <div className="rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-500 italic">
                Tweet: &ldquo;{tweetContent.slice(0, 120)}{tweetContent.length > 120 ? "..." : ""}&rdquo;
              </div>
              <textarea
                value={prefs.subject}
                onChange={e => setPrefs({ ...prefs, subject: e.target.value })}
                rows={2}
                placeholder="Örn: Dijital dönüşüm ikonları, laptop kullanan insanlar, soyut geometrik şekiller..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:ring-2 focus:ring-purple-200"
              />
              <button onClick={goNext} className="w-full rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700">
                {prefs.subject ? "Devam" : "AI karar versin"}
              </button>
            </div>
          )}

          {/* ═══ Q4: TEXT OVERLAY ═══ */}
          {step === "q4" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Metin/yazı olsun mu?</p>
                <SkipBtn />
              </div>
              <div className="space-y-2">
                <Opt selected={prefs.textOverlay === "none"} onClick={() => { setPrefs({ ...prefs, textOverlay: "none", fontStyle: "" }); goNext(); }}>
                  <span className="text-xs font-medium text-gray-800">Hayır, metin olmasın</span>
                </Opt>
                <Opt selected={prefs.textOverlay === "hook"} onClick={() => setPrefs({ ...prefs, textOverlay: "hook" })}>
                  <span className="text-xs font-medium text-gray-800">Tweet hook&apos;u yazılsın</span>
                </Opt>
                <Opt selected={prefs.textOverlay === "custom"} onClick={() => setPrefs({ ...prefs, textOverlay: "custom" })}>
                  <span className="text-xs font-medium text-gray-800">Özel metin yazayım</span>
                </Opt>
              </div>
              {prefs.textOverlay === "custom" && (
                <input
                  type="text"
                  placeholder="Görsele yazılacak metin..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:ring-2 focus:ring-purple-200"
                  onChange={e => setPrefs({ ...prefs, textOverlay: e.target.value })}
                />
              )}
              {(prefs.textOverlay === "hook" || prefs.textOverlay === "custom" || (prefs.textOverlay && prefs.textOverlay !== "none")) && (
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">Font stili:</p>
                  <div className="flex gap-2">
                    {[{ v: "modern", l: "Modern" }, { v: "serif", l: "Serif" }, { v: "handwritten", l: "El yazısı" }].map(f => (
                      <button
                        key={f.v}
                        onClick={() => setPrefs({ ...prefs, fontStyle: f.v })}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                          prefs.fontStyle === f.v ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {f.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {prefs.textOverlay !== "none" && prefs.textOverlay && (
                <button onClick={goNext} className="w-full rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700">Devam</button>
              )}
            </div>
          )}

          {/* ═══ Q5: LOGO ═══ */}
          {step === "q5" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Logo eklensin mi?</p>
                <SkipBtn />
              </div>
              <div className="space-y-2">
                {[
                  { v: "none", l: "Hayır" },
                  { v: "yes", l: "Evet, görsele dahil et" },
                  { v: "watermark", l: "Watermark olarak köşeye" },
                ].map(o => (
                  <Opt key={o.v} selected={prefs.logo === o.v} onClick={() => { setPrefs({ ...prefs, logo: o.v }); goNext(); }}>
                    <span className="text-xs font-medium text-gray-800">{o.l}</span>
                  </Opt>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Q6: MOOD ═══ */}
          {step === "q6" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Hissiyat?</p>
                <SkipBtn />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MOOD_OPTIONS.map(m => (
                  <Opt key={m.value} selected={prefs.mood === m.value} onClick={() => { setPrefs({ ...prefs, mood: m.value }); goNext(); }}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{m.icon}</span>
                      <span className="text-xs font-medium text-gray-800">{m.label}</span>
                    </div>
                  </Opt>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Q7: AVOID ═══ */}
          {step === "q7" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Kaçınılması gereken?</p>
                <SkipBtn />
              </div>
              <textarea
                value={prefs.avoid}
                onChange={e => setPrefs({ ...prefs, avoid: e.target.value })}
                rows={2}
                placeholder="Örn: İnsan yüzü olmasın, çok karmaşık olmasın, kırmızı renk kullanılmasın..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:ring-2 focus:ring-purple-200"
              />
              <button onClick={goNext} className="w-full rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700">
                {prefs.avoid ? "Devam" : "Atla"}
              </button>
            </div>
          )}

          {/* ═══ REFERENCE ═══ */}
          {step === "reference" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Referans görsel (opsiyonel)</p>
                <SkipBtn />
              </div>
              {referencePreview ? (
                <div className="relative inline-block">
                  <img src={referencePreview} alt="Referans" className="h-24 rounded-lg border" />
                  <button onClick={() => { setReferenceFile(null); setReferencePreview(null); }} className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleRefUpload(e.target.files)} />
                  <button onClick={() => refInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-xs text-gray-500 hover:border-purple-300 hover:bg-purple-50/30">
                    <Upload className="h-4 w-4" /> Referans görsel yükle
                  </button>
                </div>
              )}
              <button onClick={goNext} className="w-full rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700">
                {referencePreview ? "Devam" : "Referanssız devam et"}
              </button>
            </div>
          )}

          {/* ═══ SUMMARY ═══ */}
          {step === "summary" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-700">Özet ve Onay</p>
              {building ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500 mr-2" />
                  <span className="text-xs text-purple-600">Tercihler analiz ediliyor...</span>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-white border border-gray-200 p-3 space-y-2">
                    <p className="text-xs text-gray-700">{builtSummary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prefs.style && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">{prefs.style}</span>}
                      {prefs.colorPalette && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">{prefs.colorPalette}</span>}
                      {prefs.mood && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">{prefs.mood}</span>}
                      {prefs.textOverlay && prefs.textOverlay !== "none" && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">metin: {prefs.textOverlay === "hook" ? "hook" : "özel"}</span>}
                      {prefs.logo && prefs.logo !== "none" && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">logo: {prefs.logo}</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1">Oluşturulan prompt (düzenleyebilirsiniz):</p>
                    <textarea
                      value={builtPrompt}
                      onChange={e => setBuiltPrompt(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[11px] text-gray-600 focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep("q1")} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Düzeltmek istiyorum
                    </button>
                    <button onClick={() => setStep("settings")} className="flex-1 rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700">
                      <Check className="inline h-3.5 w-3.5 mr-1" /> Evet, devam
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {step === "settings" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-700">Üretim Ayarları</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-gray-500">Kalite</label>
                  <select value={model} onChange={e => setModel(e.target.value as any)} className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs">
                    <option value="flux-schnell">Hızlı önizleme</option>
                    <option value="flux-pro">Yüksek kalite</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-500">Boyut</label>
                  <select value={aspect} onChange={e => setAspect(e.target.value as any)} className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs">
                    <option value="16:9">16:9 (X)</option>
                    <option value="1:1">1:1 (Kare)</option>
                    <option value="9:16">9:16 (Dikey)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-500">Varyasyon</label>
                  <select value={count} onChange={e => setCount(Number(e.target.value) as any)} className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs">
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
              </div>
              <button onClick={handleGenerate} disabled={generating || !builtPrompt} className="w-full rounded-lg bg-purple-600 py-2.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Evet, üret
              </button>
            </div>
          )}

          {/* ═══ RESULTS ═══ */}
          {step === "results" && (
            <div className="space-y-3">
              {generating ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500 mr-2" />
                  <span className="text-xs text-purple-600">Görseller üretiliyor...</span>
                </div>
              ) : images.length > 0 ? (
                <>
                  <p className="text-[11px] font-medium text-gray-600">{images.length} görsel — birini seçin:</p>
                  <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {images.map((img, i) => (
                      <div key={i} className="group relative rounded-xl overflow-hidden border-2 border-gray-100 hover:border-purple-400 transition-all cursor-pointer">
                        <img
                          src={img.url}
                          alt={`Varyasyon ${i + 1}`}
                          className="w-full aspect-video object-cover"
                          onClick={() => onSelectImage(img.url)}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                          <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 rounded-lg px-3 py-1.5">Seç ve Ekle</span>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setLightbox(img.url); }}
                          className="absolute top-2 right-2 rounded-lg bg-black/40 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Re-generate actions */}
                  <div className="flex gap-2">
                    <button onClick={handleGenerate} disabled={generating} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <RotateCcw className="h-3 w-3" /> Yeniden üret
                    </button>
                    <button onClick={() => setFeedbackMode(!feedbackMode)} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <MessageSquare className="h-3 w-3" /> Feedback ile düzelt
                    </button>
                  </div>

                  {feedbackMode && (
                    <div className="space-y-2 rounded-lg bg-white border border-purple-200 p-3">
                      <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        rows={2}
                        placeholder="Ne değişmeli? (örn: daha sıcak renkler, insanlar olmasın...)"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:ring-2 focus:ring-purple-200"
                      />
                      <button onClick={handleRegenerateWithFeedback} disabled={generating || !feedback.trim()} className="w-full rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1">
                        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Feedback ile yeniden üret
                      </button>
                    </div>
                  )}

                  <button onClick={() => setStep("settings")} className="text-[10px] text-purple-600 hover:underline">
                    Ayarlara geri dön
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 z-10">
            <X className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="Preview" className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
