"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Settings2,
  BookOpen,
  MessageSquare,
  CalendarCheck,
  Loader2,
  Upload,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
  MessageCircle,
  Send,
  Instagram,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Types ──

interface AssistantConfig {
  id: string;
  isActive: boolean;
  assistantName: string;
  tone: string;
  responseLength: string;
  emojiUsage: string;
  language: string;
  capabilities: Record<string, boolean>;
  learnedStylePrompt: string | null;
  whatsappExportProcessed: boolean;
  whatsappConversationCount: number;
  lastLearnedAt: string | null;
  systemPromptOverride: string | null;
}

interface KnowledgeItem {
  id: string;
  sourceType: string;
  sourceFilename: string | null;
  contentPreview: string;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  channel: string;
  customerPhone: string | null;
  customerChatId: string | null;
  customerName: string | null;
  lastMessage: string;
  messageCount: number;
  lastMessageAt: string;
}

interface ConversationDetail {
  id: string;
  channel: string;
  customerName: string | null;
  messages: Array<{ role: string; content: string; timestamp: string }>;
}

interface AssistantAppointment {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  appointmentDate: string;
  notes: string | null;
  status: string;
  sourceChannel: string;
  createdAt: string;
}

// ── Constants ──

const TONE_OPTIONS = [
  { value: "warm", label: "Sıcak & Samimi", desc: "Dostça, sıcak iletişim" },
  { value: "formal", label: "Resmi & Profesyonel", desc: "Kurumsal iletişim dili" },
  { value: "informative", label: "Bilgilendirici", desc: "Net ve açıklayıcı" },
];

const CAPABILITIES = [
  { key: "answer_services", label: "Hizmet bilgisi ver" },
  { key: "answer_hours", label: "Çalışma saatlerini söyle" },
  { key: "answer_location", label: "Konum gönder" },
  { key: "book_appointment", label: "Randevu oluştur" },
  { key: "modify_appointment", label: "Randevu değiştir" },
  { key: "cancel_appointment", label: "Randevu iptal et" },
  { key: "query_appointment", label: "Randevu sorgula" },
  { key: "suggest_products", label: "Ürün/hizmet öner" },
  { key: "share_campaigns", label: "Kampanya paylaş" },
];

const CHANNEL_ICONS: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  telegram: Send,
  instagram: Instagram,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-green-50 text-green-700",
  telegram: "bg-blue-50 text-blue-700",
  instagram: "bg-pink-50 text-pink-700",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Bekliyor", color: "bg-orange-100 text-orange-700" },
  confirmed: { label: "Onaylandı", color: "bg-green-100 text-green-700" },
  cancelled: { label: "İptal", color: "bg-red-100 text-red-700" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

// ── Main Component ──

export default function PobyAssistantContent() {
  const [activeTab, setActiveTab] = useState<"setup" | "knowledge" | "conversations" | "appointments">("setup");

  const tabs = [
    { key: "setup" as const, label: "Kurulum", icon: Settings2 },
    { key: "knowledge" as const, label: "Bilgi Tabanı", icon: BookOpen },
    { key: "conversations" as const, label: "Konuşmalar", icon: MessageSquare },
    { key: "appointments" as const, label: "Randevular", icon: CalendarCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Bot className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">Poby Asistan</h2>
      </motion.div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "setup" && <SetupTab />}
      {activeTab === "knowledge" && <KnowledgeTab />}
      {activeTab === "conversations" && <ConversationsTab />}
      {activeTab === "appointments" && <AppointmentsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Tab 1: Setup & Settings
// ═══════════════════════════════════════════════════

function SetupTab() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/config");
      if (res.ok) setConfig(await res.json());
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetch("/api/assistant/config/toggle", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setConfig((prev) => prev ? { ...prev, isActive: data.isActive } : prev);
      }
    } catch {
      //
    } finally {
      setToggling(false);
    }
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/assistant/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantName: config.assistantName,
          tone: config.tone,
          responseLength: config.responseLength,
          emojiUsage: config.emojiUsage,
          language: config.language,
          capabilities: config.capabilities,
        }),
      });
      if (res.ok) setConfig(await res.json());
    } catch {
      //
    } finally {
      setSaving(false);
    }
  }

  async function resetStyle() {
    if (!config) return;
    const res = await fetch("/api/assistant/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnedStylePrompt: null }),
    });
    if (res.ok) setConfig(await res.json());
  }

  if (loading) return <Skeleton className="h-96" />;
  if (!config) return <p className="text-sm text-gray-500">Yapılandırma yüklenemedi</p>;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Asistan Durumu</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {config.isActive ? "Asistan aktif, gelen mesajlara yanıt veriyor" : "Asistan pasif"}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            config.isActive ? "bg-indigo-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              config.isActive ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </motion.div>

      {/* Learned style badge */}
      {config.learnedStylePrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">
              WhatsApp geçmişinden öğrenildi
              {config.lastLearnedAt && ` — ${new Date(config.lastLearnedAt).toLocaleDateString("tr-TR")}`}
            </span>
          </div>
          <button onClick={resetStyle} className="text-xs text-green-600 hover:underline">
            Stili sıfırla
          </button>
        </motion.div>
      )}

      {/* Personality */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-gray-100 bg-white"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Kişilik Ayarları</h3>
        </div>
        <div className="space-y-5 p-6">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Asistan Adı</label>
            <input
              value={config.assistantName}
              onChange={(e) => setConfig({ ...config, assistantName: e.target.value })}
              maxLength={100}
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Ton</label>
            <div className="grid grid-cols-3 gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConfig({ ...config, tone: opt.value })}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    config.tone === opt.value
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Response length */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Cevap Uzunluğu</label>
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {[
                { value: "short", label: "Kısa" },
                { value: "medium", label: "Orta" },
                { value: "detailed", label: "Detaylı" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConfig({ ...config, responseLength: opt.value })}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    config.responseLength === opt.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Emoji Kullanımı</label>
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {[
                { value: "none", label: "Hiç" },
                { value: "minimal", label: "Az" },
                { value: "normal", label: "Normal" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConfig({ ...config, emojiUsage: opt.value })}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    config.emojiUsage === opt.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Dil</label>
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {[
                { value: "tr", label: "Türkçe" },
                { value: "en", label: "İngilizce" },
                { value: "both", label: "Otomatik" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConfig({ ...config, language: opt.value })}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    config.language === opt.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Capabilities */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-gray-100 bg-white"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Yetenekler</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <label
              key={cap.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={config.capabilities[cap.key] ?? false}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    capabilities: { ...config.capabilities, [cap.key]: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-gray-700">{cap.label}</span>
            </label>
          ))}
        </div>
      </motion.div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {saving ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Tab 2: Knowledge Base
// ═══════════════════════════════════════════════════

function KnowledgeTab() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingWA, setUploadingWA] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [waResult, setWaResult] = useState<string>("");
  const [showExportHelp, setShowExportHelp] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/knowledge");
      if (res.ok) setItems(await res.json());
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleManualAdd() {
    if (!manualText.trim()) return;
    setAddingManual(true);
    setError("");
    try {
      const res = await fetch("/api/assistant/knowledge/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: manualText, title: manualTitle || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setManualText("");
      setManualTitle("");
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ekleme başarısız");
    } finally {
      setAddingManual(false);
    }
  }

  async function handleDocUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await fetch("/api/assistant/knowledge/document", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  }

  async function handleWAExport(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingWA(true);
    setError("");
    setWaResult("");
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await fetch("/api/assistant/knowledge/whatsapp-export", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWaResult(`${data.conversationCount} konuşma analiz edildi, stil profili güncellendi`);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşleme başarısız");
    } finally {
      setUploadingWA(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/assistant/knowledge/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      //
    }
  }

  const sourceIcons: Record<string, string> = {
    manual: "T",
    document: "D",
    whatsapp_export: "W",
    whatsapp_learned: "L",
  };
  const sourceLabels: Record<string, string> = {
    manual: "Manuel",
    document: "Belge",
    whatsapp_export: "WA Export",
    whatsapp_learned: "Öğrenilen",
  };

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2"><X className="inline h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* WhatsApp Export */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-dashed border-green-200 bg-green-50/50"
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-900">WhatsApp Geçmişinden Öğren</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Mevcut WhatsApp konuşmalarınızı yükleyin, asistan sizin konuşma tarzınızı öğrensin.
          </p>

          <button
            onClick={() => setShowExportHelp(!showExportHelp)}
            className="mb-3 flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
          >
            Nasıl export edilir?
            {showExportHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showExportHelp && (
            <div className="mb-4 rounded-xl bg-white p-4 text-xs text-gray-600 space-y-2">
              <p><strong>Android:</strong> WhatsApp → Sohbet → 3 nokta → Daha fazla → Sohbeti dışa aktar → Medyasız</p>
              <p><strong>iPhone:</strong> WhatsApp → Sohbet → Kişi adı → Sohbeti Dışa Aktar → Medyasız</p>
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-300 bg-white px-4 py-6 transition-colors hover:border-green-400">
            {uploadingWA ? <Loader2 className="h-5 w-5 animate-spin text-green-600" /> : <Upload className="h-5 w-5 text-green-600" />}
            <span className="text-xs font-semibold text-green-700">
              {uploadingWA ? "İşleniyor..." : ".txt dosyası yükle"}
            </span>
            <input
              type="file"
              accept=".txt"
              onChange={(e) => handleWAExport(e.target.files)}
              className="hidden"
              disabled={uploadingWA}
            />
          </label>

          {waResult && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 text-xs font-medium text-green-700">
              <Check className="h-4 w-4" />
              {waResult}
            </div>
          )}

          <p className="mt-2 text-[10px] text-gray-400">5.000 token</p>
        </div>
      </motion.div>

      {/* Two panels */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Manual Add */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-100 bg-white"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Yazarak Ekle</h3>
          </div>
          <div className="space-y-3 p-6">
            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Başlık (opsiyonel)"
              className="block w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
            />
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={5}
              placeholder="Hizmetlerinizi, fiyatlarınızı, SSS'leri buraya yazın..."
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
            />
            <div className="flex flex-wrap gap-1.5">
              {["SSS Formatı", "Hizmet Listesi", "Genel Bilgi"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    const templates: Record<string, string> = {
                      "SSS Formatı": "S: [Soru]\nC: [Cevap]\n\nS: [Soru]\nC: [Cevap]",
                      "Hizmet Listesi": "Hizmetlerimiz:\n- [Hizmet 1]: [Fiyat]\n- [Hizmet 2]: [Fiyat]",
                      "Genel Bilgi": "İşletme Adı:\nAdres:\nÇalışma Saatleri:\nTelefon:",
                    };
                    setManualText(templates[chip] || "");
                  }}
                  className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  {chip}
                </button>
              ))}
            </div>
            <button
              onClick={handleManualAdd}
              disabled={addingManual || !manualText.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {addingManual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Ekle
            </button>
          </div>
        </motion.div>

        {/* Document Upload */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-gray-100 bg-white"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Belge Yükle</h3>
          </div>
          <div className="p-6">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-12 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              ) : (
                <FileText className="h-8 w-8 text-gray-400" />
              )}
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-700">
                  {uploading ? "İşleniyor..." : "PDF, DOCX, XLSX, TXT"}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Maks. 10MB</p>
              </div>
              <input
                type="file"
                accept=".pdf,.docx,.xlsx,.xls,.txt"
                onChange={(e) => handleDocUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </motion.div>
      </div>

      {/* Saved Sources */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-gray-100 bg-white"
        >
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Kayıtlı Kaynaklar</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600">
                    {sourceIcons[item.sourceType] || "?"}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {item.sourceFilename || sourceLabels[item.sourceType]}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Tab 3: Conversations
// ═══════════════════════════════════════════════════

function ConversationsTab() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedConv, setSelectedConv] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/assistant/conversations?channel=${filter}`);
      if (res.ok) setConversations(await res.json());
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  async function openConversation(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      if (res.ok) setSelectedConv(await res.json());
    } catch {
      //
    } finally {
      setLoadingDetail(false);
    }
  }

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {[
          { value: "all", label: "Tümü" },
          { value: "whatsapp", label: "WhatsApp" },
          { value: "telegram", label: "Telegram" },
          { value: "instagram", label: "Instagram" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setLoading(true); }}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
              filter === f.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedConv && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedConv(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedConv.customerName || "Anonim"}
              </h3>
              <button onClick={() => setSelectedConv(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-6">
              {selectedConv.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                      msg.role === "user"
                        ? "bg-gray-100 text-gray-900"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`mt-1 text-[9px] ${msg.role === "user" ? "text-gray-400" : "text-indigo-200"}`}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleString("tr-TR") : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-100 bg-white"
      >
        {conversations.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-xs text-gray-500">Henüz konuşma yok</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {conversations.map((conv) => {
              const ChannelIcon = CHANNEL_ICONS[conv.channel] || MessageSquare;
              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${CHANNEL_COLORS[conv.channel] || "bg-gray-50"}`}>
                      <ChannelIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {conv.customerName || conv.customerPhone || conv.customerChatId || "Anonim"}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[250px]">{conv.lastMessage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">
                      {new Date(conv.lastMessageAt).toLocaleDateString("tr-TR")}
                    </p>
                    <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${CHANNEL_COLORS[conv.channel]}`}>
                      {conv.channel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {loadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Tab 4: Appointments
// ═══════════════════════════════════════════════════

function AppointmentsTab() {
  const [appointments, setAppointments] = useState<AssistantAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/appointments");
      if (res.ok) setAppointments(await res.json());
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/assistant/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    } catch {
      //
    }
  }

  if (loading) return <Skeleton className="h-96" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-100 bg-white"
    >
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Asistan Randevuları</h3>
      </div>

      {appointments.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-xs text-gray-500">Henüz asistan tarafından oluşturulan randevu yok</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {appointments.map((appt) => {
            const statusConf = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
            return (
              <div key={appt.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                    <CalendarCheck className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {appt.serviceName} — {new Date(appt.appointmentDate).toLocaleDateString("tr-TR")}{" "}
                      {new Date(appt.appointmentDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {appt.customerPhone && (
                      <p className="text-[10px] text-gray-400">{appt.customerPhone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusConf.color}`}>
                    {statusConf.label}
                  </span>
                  {appt.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateStatus(appt.id, "confirmed")}
                        className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                        title="Onayla"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => updateStatus(appt.id, "cancelled")}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                        title="İptal Et"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
