"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Megaphone,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Target,
  Loader2,
  Bot,
  Unlink,
  Settings,
  ChevronRight,
  AlertCircle,
  BarChart3,
  Eye,
  Filter,
  X,
  Play,
  Pause,
  Archive,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

/* ──────────────────────── TYPES ──────────────────────── */

interface Campaign {
  campaignId: string;
  campaignName: string;
  status: string;
  objective: string;
  dailyBudget: number;
  lifetimeBudget: number;
  startTime: string | null;
  stopTime: string | null;
  createdTime: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpc: number;
  cpm: number;
  ctr: number;
}

interface TrendDay {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
}

interface AccountSummary {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
}

/* ──────────────────────── CONSTANTS ──────────────────────── */

type TabKey = "campaigns" | "insights";

const DATE_PRESETS = [
  { key: "this_month", label: "Bu Ay" },
  { key: "last_90d", label: "Son 3 Ay" },
  { key: "last_180d", label: "Son 6 Ay" },
  { key: "last_year", label: "Son 1 Yil" },
  { key: "maximum", label: "Tum Zamanlar" },
] as const;

const INSIGHTS_DATE_PRESETS = [
  { key: "last_7d", label: "Son 7 Gun" },
  { key: "last_30d", label: "Son 30 Gun" },
  { key: "last_90d", label: "Son 90 Gun" },
  { key: "this_month", label: "Bu Ay" },
  { key: "maximum", label: "Tum Zamanlar" },
] as const;

const OBJECTIVE_MAP: Record<string, string> = {
  OUTCOME_TRAFFIC: "Trafik",
  OUTCOME_LEADS: "Lead",
  OUTCOME_ENGAGEMENT: "Etkilesim",
  OUTCOME_AWARENESS: "Bilinirlik",
  OUTCOME_SALES: "Donusum",
  TRAFFIC: "Trafik",
  LEAD_GENERATION: "Lead",
  LINK_CLICKS: "Trafik",
  POST_ENGAGEMENT: "Etkilesim",
  MESSAGES: "Mesaj",
  REACH: "Bilinirlik",
  BRAND_AWARENESS: "Bilinirlik",
  CONVERSIONS: "Donusum",
  VIDEO_VIEWS: "Video",
};

const OBJECTIVE_FILTERS = [
  { key: "ALL", label: "Tumu" },
  { key: "Etkilesim", label: "Etkilesim" },
  { key: "Trafik", label: "Trafik" },
  { key: "Bilinirlik", label: "Bilinirlik" },
  { key: "Donusum", label: "Donusum" },
  { key: "Mesaj", label: "Mesaj" },
  { key: "Lead", label: "Lead" },
];

const STATUS_FILTERS = [
  { key: "ALL", label: "Tumu" },
  { key: "ACTIVE", label: "Aktif" },
  { key: "PAUSED", label: "Duraklatildi" },
  { key: "DELETED", label: "Tamamlandi" },
  { key: "ARCHIVED", label: "Arsivlenmis" },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  ACTIVE: { label: "Aktif", bg: "bg-emerald-100", text: "text-emerald-700", icon: Play },
  PAUSED: { label: "Duraklatildi", bg: "bg-amber-100", text: "text-amber-700", icon: Pause },
  DELETED: { label: "Tamamlandi", bg: "bg-red-100", text: "text-red-700", icon: X },
  ARCHIVED: { label: "Arsivlenmis", bg: "bg-gray-100", text: "text-gray-600", icon: Archive },
};

/* ──────────────────────── HELPERS ──────────────────────── */

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

function formatTL(amount: number): string {
  return "₺" + amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNum(n: number): string {
  return n.toLocaleString("tr-TR");
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit" }).format(new Date(dateStr));
}

function getObjectiveLabel(objective: string): string {
  return OBJECTIVE_MAP[objective] || objective || "-";
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function MetaAdsContent() {
  // Connection & tabs
  const [connected, setConnected] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("campaigns");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  // Campaigns data
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [campaignsDatePreset, setCampaignsDatePreset] = useState("maximum");
  const [objectiveFilter, setObjectiveFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");

  // Insights data
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [insightsDatePreset, setInsightsDatePreset] = useState("last_30d");
  const [insightsObjectiveFilter, setInsightsObjectiveFilter] = useState("ALL");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [insightsCampaigns, setInsightsCampaigns] = useState<Campaign[]>([]);
  const [insightsSummary, setInsightsSummary] = useState<AccountSummary | null>(null);

  // AI
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  /* ──── Fetch Campaigns ──── */
  const fetchCampaigns = useCallback(async (preset: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/marketing/campaigns?date_preset=${preset}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Kampanya verileri alinamadi");
        setConnected(false);
        return;
      }
      const data = await res.json();
      setConnected(data.connected);
      setAllCampaigns(data.campaigns || []);
      setAccountSummary(data.accountSummary || null);
      if (data.error) setError(data.error);
    } catch {
      setError("Kampanya verileri alinamadi");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ──── Fetch Insights ──── */
  const fetchInsights = useCallback(async (preset: string) => {
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const res = await fetch(`/api/marketing/campaigns?date_preset=${preset}&trend=1`);
      if (!res.ok) {
        const data = await res.json();
        setInsightsError(data.error || "Performans verileri alinamadi");
        return;
      }
      const data = await res.json();
      setInsightsCampaigns(data.campaigns || []);
      setInsightsSummary(data.accountSummary || null);
      setTrend(data.trend || []);
      if (data.error) setInsightsError(data.error);
    } catch {
      setInsightsError("Performans verileri alinamadi");
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCampaigns(campaignsDatePreset);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload campaigns when date preset changes
  useEffect(() => {
    if (connected && activeTab === "campaigns") {
      fetchCampaigns(campaignsDatePreset);
    }
  }, [campaignsDatePreset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load insights when tab switches or date changes
  useEffect(() => {
    if (connected && activeTab === "insights") {
      fetchInsights(insightsDatePreset);
    }
  }, [connected, activeTab, insightsDatePreset]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ──── Filtered Campaigns ──── */
  const filteredCampaigns = useMemo(() => {
    let result = allCampaigns;

    // Objective filter
    if (objectiveFilter !== "ALL") {
      result = result.filter((c) => getObjectiveLabel(c.objective) === objectiveFilter);
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Custom date filter
    if (customDateStart) {
      const start = new Date(customDateStart).getTime();
      result = result.filter((c) => {
        const t = c.createdTime ? new Date(c.createdTime).getTime() : 0;
        return t >= start;
      });
    }
    if (customDateEnd) {
      const end = new Date(customDateEnd).getTime() + 86400000;
      result = result.filter((c) => {
        const t = c.createdTime ? new Date(c.createdTime).getTime() : 0;
        return t <= end;
      });
    }

    return result;
  }, [allCampaigns, objectiveFilter, statusFilter, customDateStart, customDateEnd]);

  /* ──── Filtered Insights Campaigns ──── */
  const filteredInsightsCampaigns = useMemo(() => {
    if (insightsObjectiveFilter === "ALL") return insightsCampaigns;
    return insightsCampaigns.filter((c) => getObjectiveLabel(c.objective) === insightsObjectiveFilter);
  }, [insightsCampaigns, insightsObjectiveFilter]);

  /* ──── Summary stats from filtered campaigns ──── */
  const campaignStats = useMemo(() => {
    const totalSpend = filteredCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalClicks = filteredCampaigns.reduce((s, c) => s + c.clicks, 0);
    const totalImpressions = filteredCampaigns.reduce((s, c) => s + c.impressions, 0);
    const activeCount = filteredCampaigns.filter((c) => c.status === "ACTIVE").length;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    return { totalSpend, totalClicks, totalImpressions, activeCount, avgCtr, total: filteredCampaigns.length };
  }, [filteredCampaigns]);

  /* ──── Insights stats ──── */
  const insightsStats = useMemo(() => {
    const camps = filteredInsightsCampaigns;
    const totalImpressions = camps.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = camps.reduce((s, c) => s + c.clicks, 0);
    const totalSpend = camps.reduce((s, c) => s + c.spend, 0);
    const totalConversions = camps.reduce((s, c) => s + c.conversions, 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    return { totalImpressions, totalClicks, totalSpend, totalConversions, avgCtr, avgCpc };
  }, [filteredInsightsCampaigns]);

  /* ──── Chart data ──── */
  const trendChartData = useMemo(() => {
    return trend.map((d) => ({
      date: formatDateShort(d.date),
      Gosterim: d.impressions,
      Tiklama: d.clicks,
      Harcama: d.spend,
    }));
  }, [trend]);

  const campaignChartData = useMemo(() => {
    return filteredInsightsCampaigns
      .filter((c) => c.spend > 0)
      .slice(0, 10)
      .map((c) => ({
        name: c.campaignName.length > 18 ? c.campaignName.slice(0, 18) + "..." : c.campaignName,
        Harcama: c.spend,
        Tiklama: c.clicks,
        Donusum: c.conversions,
      }));
  }, [filteredInsightsCampaigns]);

  const hasActiveFilters = objectiveFilter !== "ALL" || statusFilter !== "ALL" || customDateStart || customDateEnd;

  function clearFilters() {
    setObjectiveFilter("ALL");
    setStatusFilter("ALL");
    setCustomDateStart("");
    setCustomDateEnd("");
  }

  /* ──── Disconnect ──── */
  async function handleDisconnect() {
    if (!confirm("Meta baglantisini kesmek istediginize emin misiniz?")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/ads/disconnect", { method: "DELETE" });
      if (res.ok) {
        setConnected(false);
        setAllCampaigns([]);
      }
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  }

  /* ──── AI Analysis ──── */
  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysis("");
    try {
      const camps = activeTab === "campaigns" ? filteredCampaigns : filteredInsightsCampaigns;
      const res = await fetch("/api/marketing/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: camps }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } catch {
      setAnalysis("Analiz sirasinda bir hata olustu.");
    } finally {
      setAnalyzing(false);
    }
  }

  /* ══════════════════════════════════════════════════════ */
  /*  RENDER                                               */
  /* ══════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Pazarlama</h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="flex min-h-[400px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <Megaphone className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Meta hesabinizi baglayin</h3>
            <p className="text-sm text-gray-500 mb-6">
              Facebook ve Instagram reklam kampanyalarinizi goruntulemek ve AI destekli analizler almak icin Meta hesabinizi Ayarlar sayfasindan baglayiniz.
            </p>
            <Link href="/settings" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
              <Settings className="h-4 w-4" />
              Ayarlara Git
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Pazarlama</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAnalyze} disabled={analyzing} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
            {analyzing ? "Analiz Ediliyor..." : "AI Analiz"}
          </button>
          <button onClick={handleDisconnect} disabled={disconnecting} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
            {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
            Baglantiyi Kes
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.03 }} className="flex gap-2">
        {([
          { key: "campaigns" as TabKey, label: "Kampanyalar", icon: Megaphone },
          { key: "insights" as TabKey, label: "Performans Analiz", icon: BarChart3 },
        ]).map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${activeTab === tab.key ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-3.5">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">Meta baglanti hatasi: {error}</p>
        </motion.div>
      )}

      {/* ══════════ TAB: KAMPANYALAR ══════════ */}
      {activeTab === "campaigns" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {[
              { label: "Toplam Harcama", value: formatTL(campaignStats.totalSpend), icon: DollarSign, color: "text-red-600", bg: "bg-red-50" },
              { label: "Toplam Gosterim", value: formatNum(campaignStats.totalImpressions), icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Toplam Tiklama", value: formatNum(campaignStats.totalClicks), icon: MousePointerClick, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Ort. CTR", value: `%${campaignStats.avgCtr.toFixed(2)}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Toplam Kampanya", value: campaignStats.total.toString(), icon: Megaphone, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Aktif Kampanya", value: campaignStats.activeCount.toString(), icon: Target, color: "text-amber-600", bg: "bg-amber-50" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                    <span className="text-[11px] text-gray-500">{stat.label}</span>
                  </div>
                  <p className={`mt-2 text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-700">Filtreler</span>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors">
                  <X className="h-3 w-3" />
                  Temizle
                </button>
              )}
            </div>

            {/* Date preset */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-400 font-medium">Tarih (Insight)</span>
              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((p) => (
                  <button key={p.key} onClick={() => setCampaignsDatePreset(p.key)} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${campaignsDatePreset === p.key ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">Ozel Tarih:</span>
              <input type="date" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-700 focus:border-blue-400 focus:outline-none" />
              <span className="text-[11px] text-gray-400">—</span>
              <input type="date" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-700 focus:border-blue-400 focus:outline-none" />
            </div>

            {/* Objective filter */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-400 font-medium">Kampanya Turu</span>
              <div className="flex flex-wrap gap-1.5">
                {OBJECTIVE_FILTERS.map((f) => (
                  <button key={f.key} onClick={() => setObjectiveFilter(f.key)} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${objectiveFilter === f.key ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-400 font-medium">Durum</span>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((f) => (
                  <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${statusFilter === f.key ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign List */}
          {filteredCampaigns.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
              <div className="text-center">
                <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  {hasActiveFilters ? "Filtreye uygun kampanya bulunamadi" : "Henuz kampanyaniz yok"}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="border-b border-gray-100 px-6 py-3">
                <span className="text-xs text-gray-500">{filteredCampaigns.length} kampanya</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Kampanya</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Durum</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Tur</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Gosterim</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Tiklama</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">CTR</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Harcama</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Donusum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredCampaigns.map((camp, i) => {
                      const sc = STATUS_CONFIG[camp.status] || STATUS_CONFIG.PAUSED;
                      return (
                        <motion.tr key={camp.campaignId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: i * 0.02 }} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{camp.campaignName}</p>
                            {camp.createdTime && <p className="text-[10px] text-gray-400 mt-0.5">{new Date(camp.createdTime).toLocaleDateString("tr-TR")}</p>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-600">{getObjectiveLabel(camp.objective)}</td>
                          <td className="px-4 py-3.5 text-right text-gray-700">{formatNum(camp.impressions)}</td>
                          <td className="px-4 py-3.5 text-right text-gray-700">{formatNum(camp.clicks)}</td>
                          <td className="px-4 py-3.5 text-right text-gray-700">%{camp.ctr.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-right font-medium text-red-600">{formatTL(camp.spend)}</td>
                          <td className="px-4 py-3.5 text-right font-medium text-emerald-600">{camp.conversions}</td>
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

      {/* ══════════ TAB: PERFORMANS ANALİZ ══════════ */}
      {activeTab === "insights" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {INSIGHTS_DATE_PRESETS.map((p) => (
                <button key={p.key} onClick={() => setInsightsDatePreset(p.key)} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${insightsDatePreset === p.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {OBJECTIVE_FILTERS.map((f) => (
                <button key={f.key} onClick={() => setInsightsObjectiveFilter(f.key)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${insightsObjectiveFilter === f.key ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Insights Error */}
          {insightsError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-3.5">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{insightsError}</p>
            </div>
          )}

          {/* Summary Stats */}
          {insightsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Gosterim", value: formatNum(insightsStats.totalImpressions), icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Tiklama", value: formatNum(insightsStats.totalClicks), icon: MousePointerClick, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Harcama", value: formatTL(insightsStats.totalSpend), icon: DollarSign, color: "text-red-600", bg: "bg-red-50" },
                { label: "Ort. CTR", value: `%${insightsStats.avgCtr.toFixed(2)}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Ort. CPC", value: formatTL(insightsStats.avgCpc), icon: Target, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Donusum", value: formatNum(insightsStats.totalConversions), icon: Megaphone, color: "text-purple-600", bg: "bg-purple-50" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                      </div>
                      <span className="text-[11px] text-gray-500">{stat.label}</span>
                    </div>
                    <p className={`mt-2 text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trend Chart */}
          {insightsLoading ? (
            <Skeleton className="h-80" />
          ) : trendChartData.length > 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Gunluk Performans Trendi</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line yAxisId="left" type="monotone" dataKey="Gosterim" stroke="#3b82f6" strokeWidth={2} dot={false} name="Gosterim" />
                  <Line yAxisId="left" type="monotone" dataKey="Tiklama" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Tiklama" />
                  <Line yAxisId="right" type="monotone" dataKey="Harcama" stroke="#ef4444" strokeWidth={2} dot={false} name="Harcama (TL)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : !insightsError ? (
            <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Secilen donemde veri bulunamadi</p>
              </div>
            </div>
          ) : null}

          {/* Campaign Comparison Bar Chart */}
          {campaignChartData.length > 0 && !insightsLoading && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Harcama Dagilimi</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={campaignChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                    <Bar dataKey="Harcama" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Tiklama ve Donusum</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={campaignChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                    <Bar dataKey="Tiklama" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Donusum" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Campaign Comparison Table */}
          {filteredInsightsCampaigns.length > 0 && !insightsLoading && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="border-b border-gray-100 px-6 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Kampanya Karsilastirmasi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Kampanya</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Gosterim</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Tiklama</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">CTR</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">CPC</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Harcama</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Donusum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredInsightsCampaigns.map((c) => (
                      <tr key={c.campaignId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[200px]">{c.campaignName}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatNum(c.impressions)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatNum(c.clicks)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">%{c.ctr.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatTL(c.cpc)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">{formatTL(c.spend)}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{c.conversions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">AI Kampanya Analizi</h3>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{analysis}</div>
        </motion.div>
      )}
    </div>
  );
}
