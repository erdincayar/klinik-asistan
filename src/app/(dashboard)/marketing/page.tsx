"use client";

import { useEffect, useState } from "react";
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
} from "recharts";

interface Campaign {
  campaignId: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpc: number;
  cpm: number;
  ctr: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

export default function MarketingPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/marketing/campaigns");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Kampanya verileri alinamadi");
        setConnected(false);
        return;
      }
      const data = await res.json();
      setConnected(data.connected);
      setCampaigns(data.campaigns || []);
      if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Kampanya verileri alinamadi");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Meta baglantisini kesmek istediginize emin misiniz?")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/ads/disconnect", { method: "DELETE" });
      if (res.ok) {
        setConnected(false);
        setCampaigns([]);
      }
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysis("");
    try {
      const res = await fetch("/api/marketing/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns }),
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

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  const chartData = campaigns.map((c) => ({
    name: c.campaignName.length > 15 ? c.campaignName.slice(0, 15) + "..." : c.campaignName,
    Harcama: c.spend,
    Tiklama: c.clicks,
    Donusum: c.conversions,
  }));

  // Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Not connected
  if (!connected) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Pazarlama</h2>
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
              Facebook ve Instagram reklam kampanyalarinizi goruntulemek ve AI destekli analizler almak icin
              Meta hesabinizi Ayarlar sayfasindan baglayiniz.
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

  // Connected
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
          <h2 className="text-lg font-semibold text-gray-900">Pazarlama</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || campaigns.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
            {analyzing ? "Analiz Ediliyor..." : "AI Analiz"}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
            Baglantiyi Kes
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-3.5"
        >
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">Meta baglanti hatasi: {error}</p>
        </motion.div>
      )}

      {campaigns.length === 0 && !error ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-100 bg-white"
        >
          <div className="text-center">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Henuz kampanyaniz yok</p>
            <p className="mt-1 text-xs text-gray-400">
              Meta Ads hesabinizda aktif kampanya bulunmuyor
            </p>
          </div>
        </motion.div>
      ) : campaigns.length > 0 && (
        <>
          {/* Summary cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {[
              { label: "Toplam Harcama", value: `₺${totalSpend.toFixed(0)}`, icon: DollarSign, color: "text-red-600", bg: "bg-red-50" },
              { label: "Toplam Tiklama", value: totalClicks.toLocaleString("tr-TR"), icon: MousePointerClick, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Ortalama CPC", value: `₺${avgCpc.toFixed(2)}`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Toplam Donusum", value: totalConversions.toString(), icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                  <p className={`mt-3 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              );
            })}
          </motion.div>

          {/* Campaigns */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
          >
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Kampanyalar</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {campaigns.map((camp, i) => (
                <motion.div
                  key={camp.campaignId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="px-6 py-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">{camp.campaignName}</h4>
                    <span className="text-sm font-bold text-red-600">₺{camp.spend.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] text-gray-400">Gosterim</p>
                      <p className="text-sm font-semibold text-gray-800">{camp.impressions.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] text-gray-400">Tiklama</p>
                      <p className="text-sm font-semibold text-gray-800">{camp.clicks.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] text-gray-400">CTR</p>
                      <p className="text-sm font-semibold text-gray-800">%{camp.ctr?.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] text-gray-400">Donusum</p>
                      <p className="text-sm font-semibold text-emerald-600">{camp.conversions}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="rounded-2xl border border-gray-100 bg-white p-6"
              >
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Harcama Dagilimi</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }} />
                    <Bar dataKey="Harcama" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-2xl border border-gray-100 bg-white p-6"
              >
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Tiklama ve Donusum</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }} />
                    <Line type="monotone" dataKey="Tiklama" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Donusum" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          )}

          {/* AI Analysis */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900">AI Kampanya Analizi</h3>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {analysis}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
