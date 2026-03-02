"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Megaphone,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Target,
  Loader2,
  Bot,
  Link as LinkIcon,
  X,
  Unlink,
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
  const [connected, setConnected] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectForm, setConnectForm] = useState({ accessToken: "", adAccountId: "", pageId: "" });
  const [connecting, setConnecting] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/marketing/campaigns");
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setCampaigns(data.campaigns || []);
        setIsDemo(data.isDemo || false);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch("/api/marketing/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectForm),
      });
      if (res.ok) {
        setShowConnectModal(false);
        await fetchCampaigns();
      }
    } catch {
      // Handle error
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await fetch("/api/marketing/connect", { method: "DELETE" });
      setConnected(false);
      setCampaigns([]);
    } catch {
      // Handle error
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
      setAnalysis("Analiz sırasında bir hata oluştu.");
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
    Tıklama: c.clicks,
    Dönüşüm: c.conversions,
  }));

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
          {isDemo && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Demo Veri
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <Unlink className="h-3.5 w-3.5" />
                Bağlantıyı Kes
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Meta Hesabını Bağla
            </button>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : !connected ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-100 bg-white"
        >
          <div className="text-center">
            <Megaphone className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Meta Ads hesabınızı bağlayın</p>
            <p className="mt-1 text-xs text-gray-400">Kampanya performansınızı analiz edin</p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <LinkIcon className="h-4 w-4" />
              Meta Hesabını Bağla
            </button>
          </div>
        </motion.div>
      ) : (
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
              { label: "Toplam Tıklama", value: totalClicks.toLocaleString("tr-TR"), icon: MousePointerClick, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Ortalama CPC", value: `₺${avgCpc.toFixed(2)}`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Toplam Dönüşüm", value: totalConversions.toString(), icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
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
                      <p className="text-[10px] text-gray-400">Gösterim</p>
                      <p className="text-sm font-semibold text-gray-800">{camp.impressions.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] text-gray-400">Tıklama</p>
                      <p className="text-sm font-semibold text-gray-800">{camp.clicks.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] text-gray-400">CTR</p>
                      <p className="text-sm font-semibold text-gray-800">%{camp.ctr?.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] text-gray-400">Dönüşüm</p>
                      <p className="text-sm font-semibold text-emerald-600">{camp.conversions}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="rounded-2xl border border-gray-100 bg-white p-6"
              >
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Harcama Dağılımı</h3>
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
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Tıklama ve Dönüşüm</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }} />
                    <Line type="monotone" dataKey="Tıklama" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Dönüşüm" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
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

      {/* Connect Modal */}
      {showConnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowConnectModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Meta Ads Bağla</h3>
              <button onClick={() => setShowConnectModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Access Token</label>
                <input
                  value={connectForm.accessToken}
                  onChange={(e) => setConnectForm({ ...connectForm, accessToken: e.target.value })}
                  required
                  placeholder="Meta API Access Token"
                  className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Ad Account ID</label>
                <input
                  value={connectForm.adAccountId}
                  onChange={(e) => setConnectForm({ ...connectForm, adAccountId: e.target.value })}
                  required
                  placeholder="act_123456789"
                  className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Page ID (Opsiyonel)</label>
                <input
                  value={connectForm.pageId}
                  onChange={(e) => setConnectForm({ ...connectForm, pageId: e.target.value })}
                  placeholder="Facebook sayfa ID"
                  className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <button
                type="submit"
                disabled={connecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {connecting ? "Bağlanıyor..." : "Bağlan"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
