"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Trash2,
  Loader2,
  Bot,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Eye,
  Upload,
  ImageIcon,
  Settings,
  BarChart3,
  Calendar,
  Target,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Unlink,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

/* ──────────────────────── TYPES ──────────────────────── */

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  dailyBudget: number;
  startDate: string;
  endDate: string | null;
  targetCity: string | null;
  targetAgeMin: number;
  targetAgeMax: number;
  targetGender: string;
  interests: string | null;
  platforms: string;
  imageUrl: string | null;
  headline: string | null;
  description: string | null;
  ctaType: string | null;
  websiteUrl: string | null;
  createdAt: string;
  impressions?: number;
  clicks?: number;
  spend?: number;
  ctr?: number;
  cpc?: number;
}

interface InsightDay {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpc: number;
  cpm: number;
  ctr: number;
  campaignName?: string;
  campaignId?: string;
}

interface CampaignForm {
  name: string;
  objective: string;
  dailyBudget: string;
  startDate: string;
  endDate: string;
  targetCity: string;
  targetAgeMin: string;
  targetAgeMax: string;
  targetGender: string;
  interests: string;
  platforms: string;
  imageUrl: string;
  headline: string;
  description: string;
  ctaType: string;
  websiteUrl: string;
}

/* ──────────────────────── CONSTANTS ──────────────────────── */

const OBJECTIVES: Record<string, string> = {
  TRAFFIC: "Trafik",
  LEADS: "Lead Toplama",
  MESSAGES: "Mesaj",
  AWARENESS: "Marka Bilinirliği",
};

const CTA_TYPES: Record<string, string> = {
  LEARN_MORE: "Daha Fazla",
  CALL_NOW: "Şimdi Ara",
  MESSAGE_PAGE: "Mesaj Gönder",
  BOOK_TRAVEL: "Randevu Al",
};

const PLATFORM_LABELS: Record<string, string> = {
  BOTH: "Facebook + Instagram",
  FACEBOOK: "Sadece Facebook",
  INSTAGRAM: "Sadece Instagram",
};

const GENDER_LABELS: Record<string, string> = {
  ALL: "Hepsi",
  MALE: "Erkek",
  FEMALE: "Kadın",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "Aktif", bg: "bg-emerald-100", text: "text-emerald-700" },
  PAUSED: { label: "Duraklatıldı", bg: "bg-amber-100", text: "text-amber-700" },
  DELETED: { label: "Durduruldu", bg: "bg-red-100", text: "text-red-700" },
};

const TAB_ITEMS = [
  { key: "campaigns", label: "Kampanyalar", icon: Megaphone },
  { key: "new", label: "Yeni Kampanya", icon: Plus },
  { key: "insights", label: "Performans Analiz", icon: BarChart3 },
] as const;

type TabKey = (typeof TAB_ITEMS)[number]["key"];

const INITIAL_FORM: CampaignForm = {
  name: "",
  objective: "TRAFFIC",
  dailyBudget: "",
  startDate: "",
  endDate: "",
  targetCity: "",
  targetAgeMin: "18",
  targetAgeMax: "65",
  targetGender: "ALL",
  interests: "",
  platforms: "BOTH",
  imageUrl: "",
  headline: "",
  description: "",
  ctaType: "LEARN_MORE",
  websiteUrl: "",
};

/* ──────────────────────── HELPERS ──────────────────────── */

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

function formatTL(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function getDateRange(days: number): { since: string; until: string } {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
  };
}

function parseAnalysisText(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<br key={`br-${i}`} />);
      return;
    }
    // Bold headers: **text**
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      elements.push(
        <h4 key={i} className="mt-3 mb-1 text-sm font-bold text-gray-900">
          {trimmed.replace(/\*\*/g, "")}
        </h4>
      );
      return;
    }
    // Numbered headers: 1. **text**
    const numberedMatch = trimmed.match(/^\d+\.\s*\*\*(.+?)\*\*(.*)/);
    if (numberedMatch) {
      elements.push(
        <h4 key={i} className="mt-3 mb-1 text-sm font-bold text-blue-800">
          {numberedMatch[1]}
        </h4>
      );
      if (numberedMatch[2]?.trim()) {
        elements.push(
          <p key={`${i}-sub`} className="text-sm text-gray-700">
            {numberedMatch[2].replace(/^\s*[-—]\s*/, "")}
          </p>
        );
      }
      return;
    }
    // Bullet points
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const content = trimmed.replace(/^[-*]\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1");
      elements.push(
        <li key={i} className="ml-4 text-sm text-gray-700 list-disc">
          {content}
        </li>
      );
      return;
    }
    // Inline bold replacement
    const parts = trimmed.split(/\*\*(.+?)\*\*/g);
    elements.push(
      <p key={i} className="text-sm text-gray-700">
        {parts.map((part, j) =>
          j % 2 === 1 ? (
            <strong key={j} className="font-semibold text-gray-900">
              {part}
            </strong>
          ) : (
            part
          )
        )}
      </p>
    );
  });

  return elements;
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function AdsPage() {
  // General state
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("campaigns");
  const [loading, setLoading] = useState(true);

  // Tab 1: Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Tab 2: New Campaign
  const [form, setForm] = useState<CampaignForm>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 3: Insights
  const [insights, setInsights] = useState<InsightDay[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [dateRangeDays, setDateRangeDays] = useState(30);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  /* ──── Check Meta Connection ──── */
  useEffect(() => {
    async function checkConnection() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setMetaConnected(!!data.metaConnected);
        } else {
          setMetaConnected(false);
        }
      } catch {
        setMetaConnected(false);
      } finally {
        setLoading(false);
      }
    }
    checkConnection();
  }, []);

  /* ──── Fetch Campaigns ──── */
  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignsError("");
    try {
      const res = await fetch("/api/ads/campaigns");
      if (!res.ok) {
        const data = await res.json();
        setCampaignsError(data.error || "Kampanya verileri alinamadi");
        setCampaigns([]);
        return;
      }
      const data = await res.json();
      if (data.metaError) {
        setCampaignsError(data.metaError);
      }
      setCampaigns(data.campaigns || []);
    } catch {
      setCampaignsError("Kampanya verileri alinamadi");
      setCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (metaConnected && activeTab === "campaigns") {
      fetchCampaigns();
    }
  }, [metaConnected, activeTab, fetchCampaigns]);

  /* ──── Fetch Insights ──── */
  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const { since, until } = getDateRange(dateRangeDays);
      const res = await fetch(`/api/ads/insights?since=${since}&until=${until}`);
      if (!res.ok) {
        const data = await res.json();
        setInsightsError(data.error || "Performans verileri alinamadi");
        setInsights([]);
        return;
      }
      const data = await res.json();
      setInsights(Array.isArray(data) ? data : data.data || []);
    } catch {
      setInsightsError("Performans verileri alinamadi");
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  }, [dateRangeDays]);

  useEffect(() => {
    if (metaConnected && activeTab === "insights") {
      fetchInsights();
    }
  }, [metaConnected, activeTab, fetchInsights]);

  /* ──── Status Update ──── */
  async function handleStatusUpdate(campaignId: string, newStatus: string) {
    setStatusUpdating(campaignId);
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, status: newStatus } : c))
        );
      }
    } catch {
      // Handle error silently
    } finally {
      setStatusUpdating(null);
    }
  }

  /* ──── Image Upload ──── */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ads/upload-image", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({ ...prev, imageUrl: data.url }));
      }
    } catch {
      // Handle error silently
    } finally {
      setUploadingImage(false);
    }
  }

  /* ──── Create Campaign ──── */
  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        name: form.name,
        objective: form.objective,
        dailyBudget: parseFloat(form.dailyBudget),
        startDate: form.startDate,
        endDate: form.endDate || null,
        targetCity: form.targetCity || null,
        targetAgeMin: parseInt(form.targetAgeMin) || 18,
        targetAgeMax: parseInt(form.targetAgeMax) || 65,
        targetGender: form.targetGender,
        interests: form.interests || null,
        platforms: form.platforms,
        imageUrl: form.imageUrl || null,
        headline: form.headline || null,
        description: form.description || null,
        ctaType: form.ctaType || null,
        websiteUrl: form.websiteUrl || null,
      };

      const res = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMessage("Kampanya basariyla olusturuldu!");
        setForm(INITIAL_FORM);
        setTimeout(() => {
          setSuccessMessage("");
          setActiveTab("campaigns");
        }, 2000);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Kampanya olusturulurken bir hata olustu.");
      }
    } catch {
      setErrorMessage("Bir hata olustu. Lutfen tekrar deneyin.");
    } finally {
      setCreating(false);
    }
  }

  /* ──── AI Analysis ──── */
  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysis("");
    try {
      const dateRange =
        dateRangeDays === 7
          ? "Son 7 gun"
          : dateRangeDays === 30
          ? "Son 30 gun"
          : "Son 90 gun";

      const res = await fetch("/api/ads/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns, insights, dateRange }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis || "");
      } else {
        setAnalysis("Analiz sirasinda bir hata olustu.");
      }
    } catch {
      setAnalysis("Analiz sirasinda bir hata olustu.");
    } finally {
      setAnalyzing(false);
    }
  }

  /* ──── Disconnect ──── */
  async function handleDisconnect() {
    if (!confirm("Meta baglantisini kesmek istediginize emin misiniz?")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/ads/disconnect", { method: "DELETE" });
      if (res.ok) {
        setMetaConnected(false);
        setCampaigns([]);
        setInsights([]);
      }
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  }

  /* ──── Form Helpers ──── */
  function updateForm(field: keyof CampaignForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /* ──── Chart Data ──── */
  const chartData = insights.map((d) => ({
    date: d.date ? formatDateShort(d.date) : "",
    Gosterim: d.impressions || 0,
    Tiklama: d.clicks || 0,
    Harcama: d.spend || 0,
  }));

  // Campaign comparison from insights
  const campaignComparison = insights.reduce<
    Record<string, { name: string; impressions: number; clicks: number; spend: number; conversions: number }>
  >((acc, item) => {
    const key = item.campaignId || item.campaignName || "unknown";
    if (!acc[key]) {
      acc[key] = {
        name: item.campaignName || key,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
      };
    }
    acc[key].impressions += item.impressions || 0;
    acc[key].clicks += item.clicks || 0;
    acc[key].spend += item.spend || 0;
    acc[key].conversions += item.conversions || 0;
    return acc;
  }, {});

  const comparisonData = Object.values(campaignComparison);

  /* ══════════════════════════════════════════════════════ */
  /*  RENDER                                               */
  /* ══════════════════════════════════════════════════════ */

  // Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Not Connected
  if (!metaConnected) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Meta Reklam Yonetimi</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex min-h-[400px] items-center justify-center rounded-2xl border border-gray-100 bg-white"
        >
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <Megaphone className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Meta hesabinizi baglayin
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Facebook ve Instagram reklam kampanyalarinizi yonetmek, performans verilerini
              goruntulemek ve AI destekli analizler almak icin Meta hesabinizi baglayiniz.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Settings className="h-4 w-4" />
              Ayarlara Git
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Connected — Full Interface
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Meta Reklam Yonetimi</h2>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {disconnecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Unlink className="h-3.5 w-3.5" />
          )}
          Baglantiyi Kes
        </button>
      </motion.div>

      {/* Tab Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.03 }}
        className="flex gap-2"
      >
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* ══════════ TAB 1: KAMPANYALAR ══════════ */}
      {activeTab === "campaigns" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {/* Error */}
          {campaignsError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-3.5"
            >
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{campaignsError}</p>
            </motion.div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {campaigns.length} kampanya bulundu
            </p>
            <button
              onClick={() => setActiveTab("new")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni Kampanya
            </button>
          </div>

          {/* Campaigns Table */}
          {campaignsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
              <div className="text-center">
                <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  Henuz kampanya olusturulmamis
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Ilk reklam kampanyanizi olusturmak icin &ldquo;Yeni Kampanya&rdquo; butonunu kullanin.
                </p>
                <button
                  onClick={() => setActiveTab("new")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Kampanya Olustur
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500">
                        Ad
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500">
                        Durum
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500">
                        Butce
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500">
                        Gosterim
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500">
                        Tiklama
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500">
                        Harcama
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500">
                        Islemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {campaigns.map((camp, i) => {
                      const statusConf = STATUS_CONFIG[camp.status] || STATUS_CONFIG.PAUSED;
                      const isUpdating = statusUpdating === camp.id;
                      return (
                        <motion.tr
                          key={camp.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.04 }}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{camp.name}</p>
                              {camp.headline && (
                                <p className="mt-0.5 text-xs text-gray-400 truncate max-w-[200px]">
                                  {camp.headline}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusConf.bg} ${statusConf.text}`}
                            >
                              {statusConf.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-700">
                            {formatTL(camp.dailyBudget)}/gun
                          </td>
                          <td className="px-5 py-4 text-right text-gray-700">
                            {camp.impressions != null
                              ? camp.impressions.toLocaleString("tr-TR")
                              : "-"}
                          </td>
                          <td className="px-5 py-4 text-right text-gray-700">
                            {camp.clicks != null
                              ? camp.clicks.toLocaleString("tr-TR")
                              : "-"}
                          </td>
                          <td className="px-5 py-4 text-right text-gray-700">
                            {camp.spend != null
                              ? formatTL(camp.spend)
                              : "-"}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {camp.status !== "ACTIVE" && (
                                <button
                                  onClick={() => handleStatusUpdate(camp.id, "ACTIVE")}
                                  disabled={isUpdating}
                                  title="Baslat"
                                  className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              {camp.status === "ACTIVE" && (
                                <button
                                  onClick={() => handleStatusUpdate(camp.id, "PAUSED")}
                                  disabled={isUpdating}
                                  title="Duraklat"
                                  className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Pause className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              {camp.status !== "DELETED" && (
                                <button
                                  onClick={() => handleStatusUpdate(camp.id, "DELETED")}
                                  disabled={isUpdating}
                                  title="Durdur"
                                  className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ══════════ TAB 2: YENİ KAMPANYA ══════════ */}
      {activeTab === "new" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Success / Error Messages */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-3.5"
            >
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
            </motion.div>
          )}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-3.5"
            >
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{errorMessage}</p>
            </motion.div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Form Column (2/3) */}
            <form onSubmit={handleCreateCampaign} className="lg:col-span-2 space-y-6">
              {/* Kampanya Bilgileri */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Kampanya Bilgileri</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Kampanya Adi *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="Ornegin: Yaz Kampanyasi 2025"
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Hedef *
                    </label>
                    <select
                      required
                      value={form.objective}
                      onChange={(e) => updateForm("objective", e.target.value)}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    >
                      {Object.entries(OBJECTIVES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Gunluk Butce (TL) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={form.dailyBudget}
                      onChange={(e) => updateForm("dailyBudget", e.target.value)}
                      placeholder="100"
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Baslangic Tarihi *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) => updateForm("startDate", e.target.value)}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Bitis Tarihi
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => updateForm("endDate", e.target.value)}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Platform
                    </label>
                    <select
                      value={form.platforms}
                      onChange={(e) => updateForm("platforms", e.target.value)}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    >
                      {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Hedef Kitle */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Hedef Kitle</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Sehir
                    </label>
                    <input
                      type="text"
                      value={form.targetCity}
                      onChange={(e) => updateForm("targetCity", e.target.value)}
                      placeholder="Ornegin: Istanbul, Ankara"
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Minimum Yas
                    </label>
                    <input
                      type="number"
                      min="13"
                      max="65"
                      value={form.targetAgeMin}
                      onChange={(e) => updateForm("targetAgeMin", e.target.value)}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Maksimum Yas
                    </label>
                    <input
                      type="number"
                      min="13"
                      max="65"
                      value={form.targetAgeMax}
                      onChange={(e) => updateForm("targetAgeMax", e.target.value)}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Cinsiyet
                    </label>
                    <select
                      value={form.targetGender}
                      onChange={(e) => updateForm("targetGender", e.target.value)}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    >
                      {Object.entries(GENDER_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Ilgi Alanlari
                    </label>
                    <input
                      type="text"
                      value={form.interests}
                      onChange={(e) => updateForm("interests", e.target.value)}
                      placeholder="Virgul ile ayirin: saglik, guzellik, spor"
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                </div>
              </div>

              {/* Reklam İçeriği */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Reklam Icerigi</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Image Upload */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Reklam Gorseli
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {uploadingImage ? "Yukleniyor..." : "Gorsel Yukle"}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      {form.imageUrl && (
                        <div className="flex items-center gap-2">
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200">
                            <img
                              src={form.imageUrl}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="text-xs text-emerald-600 font-medium">Yuklendi</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Baslik
                    </label>
                    <input
                      type="text"
                      value={form.headline}
                      onChange={(e) => updateForm("headline", e.target.value)}
                      placeholder="Dikkat cekici bir baslik"
                      maxLength={100}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Aciklama
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="Reklamda gosterilecek aciklama metni..."
                      rows={3}
                      maxLength={500}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Eylem Butonu
                    </label>
                    <select
                      value={form.ctaType}
                      onChange={(e) => updateForm("ctaType", e.target.value)}
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    >
                      {Object.entries(CTA_TYPES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Web Sitesi URL
                    </label>
                    <input
                      type="url"
                      value={form.websiteUrl}
                      onChange={(e) => updateForm("websiteUrl", e.target.value)}
                      placeholder="https://ornek.com"
                      className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={creating || !form.name || !form.dailyBudget || !form.startDate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Megaphone className="h-4 w-4" />
                )}
                {creating ? "Olusturuluyor..." : "Kampanyayi Baslat"}
              </button>
            </form>

            {/* Preview Column (1/3) */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 sticky top-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">On Izleme</h3>

                {/* Ad Preview Card */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Megaphone className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">
                        {form.name || "Kampanya Adi"}
                      </p>
                      <p className="text-[10px] text-gray-400">Sponsorlu</p>
                    </div>
                  </div>

                  {/* Image */}
                  <div className="relative aspect-square bg-gray-100">
                    {form.imageUrl ? (
                      <img
                        src={form.imageUrl}
                        alt="Ad Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 space-y-1.5">
                    {form.headline && (
                      <p className="text-sm font-semibold text-gray-900">{form.headline}</p>
                    )}
                    {form.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{form.description}</p>
                    )}
                    {form.websiteUrl && (
                      <p className="text-[10px] text-gray-400 truncate">{form.websiteUrl}</p>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="border-t border-gray-100 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-600">
                        {CTA_TYPES[form.ctaType] || "Daha Fazla"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Platform</span>
                    <span className="font-medium text-gray-700">
                      {PLATFORM_LABELS[form.platforms]}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Butce</span>
                    <span className="font-medium text-gray-700">
                      {form.dailyBudget ? `${formatTL(parseFloat(form.dailyBudget))}/gun` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Hedef</span>
                    <span className="font-medium text-gray-700">
                      {OBJECTIVES[form.objective]}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Yas Araligi</span>
                    <span className="font-medium text-gray-700">
                      {form.targetAgeMin} - {form.targetAgeMax}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Cinsiyet</span>
                    <span className="font-medium text-gray-700">
                      {GENDER_LABELS[form.targetGender]}
                    </span>
                  </div>
                  {form.targetCity && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Sehir</span>
                      <span className="font-medium text-gray-700">{form.targetCity}</span>
                    </div>
                  )}
                  {form.interests && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Ilgi Alanlari</span>
                      <span className="font-medium text-gray-700 text-right max-w-[120px] truncate">
                        {form.interests}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════ TAB 3: PERFORMANS ANALİZ ══════════ */}
      {activeTab === "insights" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Date Range & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {[
                { days: 7, label: "Son 7 Gun" },
                { days: 30, label: "Son 30 Gun" },
                { days: 90, label: "Son 90 Gun" },
              ].map((range) => (
                <button
                  key={range.days}
                  onClick={() => setDateRangeDays(range.days)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    dateRangeDays === range.days
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              {analyzing ? "Analiz Ediliyor..." : "AI Analiz"}
            </button>
          </div>

          {/* Error */}
          {insightsError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-3.5"
            >
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{insightsError}</p>
            </motion.div>
          )}

          {/* Summary Stats */}
          {insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {[
                {
                  label: "Toplam Gosterim",
                  value: insights
                    .reduce((s, d) => s + (d.impressions || 0), 0)
                    .toLocaleString("tr-TR"),
                  icon: Eye,
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  label: "Toplam Tiklama",
                  value: insights
                    .reduce((s, d) => s + (d.clicks || 0), 0)
                    .toLocaleString("tr-TR"),
                  icon: MousePointerClick,
                  color: "text-indigo-600",
                  bg: "bg-indigo-50",
                },
                {
                  label: "Toplam Harcama",
                  value: formatTL(insights.reduce((s, d) => s + (d.spend || 0), 0)),
                  icon: DollarSign,
                  color: "text-red-600",
                  bg: "bg-red-50",
                },
                {
                  label: "Ort. CTR",
                  value: `%${(
                    insights.reduce((s, d) => s + (d.ctr || 0), 0) / (insights.length || 1)
                  ).toFixed(2)}`,
                  icon: TrendingUp,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-gray-100 bg-white p-5"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}
                      >
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </div>
                    <p className={`mt-3 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Chart */}
          {insightsLoading ? (
            <Skeleton className="h-80" />
          ) : chartData.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Performans Trendi</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="Gosterim"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Gosterim"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="Tiklama"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Tiklama"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Harcama"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Harcama (TL)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  Secilen tarih araliginda veri bulunamadi
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Farkli bir tarih araligi secmeyi deneyin
                </p>
              </div>
            </div>
          )}

          {/* Campaign Comparison Table */}
          {comparisonData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
            >
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Kampanya Karsilastirmasi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
                        Kampanya
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">
                        Gosterim
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">
                        Tiklama
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">
                        Harcama
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">
                        Donusum
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">
                        CTR
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {comparisonData.map((row, i) => {
                      const ctr =
                        row.impressions > 0
                          ? ((row.clicks / row.impressions) * 100).toFixed(2)
                          : "0.00";
                      return (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-gray-900">
                            {row.name}
                          </td>
                          <td className="px-5 py-3.5 text-right text-gray-700">
                            {row.impressions.toLocaleString("tr-TR")}
                          </td>
                          <td className="px-5 py-3.5 text-right text-gray-700">
                            {row.clicks.toLocaleString("tr-TR")}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-red-600">
                            {formatTL(row.spend)}
                          </td>
                          <td className="px-5 py-3.5 text-right text-emerald-600 font-medium">
                            {row.conversions}
                          </td>
                          <td className="px-5 py-3.5 text-right text-gray-700">%{ctr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* AI Analysis Result */}
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/50 py-12"
            >
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-3" />
                <p className="text-sm font-medium text-blue-700">AI analiz yapiliyor...</p>
                <p className="mt-1 text-xs text-blue-500">
                  Kampanya verileriniz inceleniyor
                </p>
              </div>
            </motion.div>
          )}

          {analysis && !analyzing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-blue-900">AI Kampanya Analizi</h3>
              </div>
              <div className="space-y-0.5">{parseAnalysisText(analysis)}</div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
