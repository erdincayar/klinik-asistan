"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard,
  Loader2,
  ArrowRight,
  Settings,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
} from "lucide-react";

interface PlanData {
  id: string;
  status: string;
  trialEnd: string | null;
  activeModules: string[];
  extraUsers: number;
  storagePlan: string;
  monthlyTotal: number;
  discountRate: number;
  cardLast4: string | null;
  cardBrand: string | null;
  nextBillingDate: string | null;
  pricing: {
    subtotal: number;
    discount: number;
    discountRate: number;
    total: number;
    kdv: number;
    totalWithKdv: number;
  };
}

interface BillingRecord {
  id: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  trial: { label: "Deneme Süresi", icon: Clock, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  active: { label: "Aktif", icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50 border-green-200" },
  suspended: { label: "Askıda", icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50 border-red-200" },
  cancelled: { label: "İptal", icon: XCircle, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
};

function fmt(kurus: number): string {
  return (kurus / 100).toLocaleString("tr-TR");
}

export default function BillingPage() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardToken, setCardToken] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);

  const fetchPlan = useCallback(() => {
    Promise.all([
      fetch("/api/billing/modules").then((r) => r.ok ? r.json() : null),
      fetch("/api/billing/history").then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([planData, histData]) => {
      if (planData) setPlan(planData);
      if (Array.isArray(histData)) setHistory(histData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  async function handleAddCard() {
    setCardLoading(true);
    try {
      const res = await fetch("/api/billing/add-card", { method: "POST" });
      const data = await res.json();
      if (data.token) {
        setCardToken(data.token);
        setCardModalOpen(true);
      } else {
        alert(data.error || "Kart ekleme başlatılamadı");
      }
    } catch {
      alert("Bir hata oluştu");
    } finally {
      setCardLoading(false);
    }
  }

  function handleCardModalClose() {
    setCardModalOpen(false);
    setCardToken(null);
    // Refresh plan data to pick up new card info
    fetchPlan();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-20 text-gray-500">
        Plan bilgisi yüklenemedi.
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.active;
  const StatusIcon = statusCfg.icon;
  const trialDaysLeft = plan.trialEnd
    ? Math.max(0, Math.ceil((new Date(plan.trialEnd).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Abonelik Yönetimi</h1>
        <p className="text-sm text-gray-500">Planınızı yönetin ve ödeme geçmişinizi görüntüleyin</p>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-6 ${statusCfg.bg}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm`}>
              <StatusIcon className={`h-6 w-6 ${statusCfg.color}`} />
            </div>
            <div>
              <p className={`text-lg font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
              {plan.status === "trial" && (
                <p className="text-sm text-gray-600">{trialDaysLeft} gün kaldı</p>
              )}
              {plan.status === "active" && plan.nextBillingDate && (
                <p className="text-sm text-gray-600">
                  Sonraki ödeme: {new Date(plan.nextBillingDate).toLocaleDateString("tr-TR")}
                </p>
              )}
              {plan.status === "suspended" && (
                <p className="text-sm text-red-600">Ödeme yönteminizi güncelleyin</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">₺{fmt(plan.pricing.totalWithKdv)}<span className="text-sm font-normal text-gray-500">/ay</span></p>
            <p className="text-xs text-gray-400">KDV Dahil</p>
            {plan.pricing.discountRate > 0 && (
              <p className="text-xs text-green-600">%{plan.pricing.discountRate} indirim uygulandı</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Active Modules */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-100 bg-white p-5"
        >
          <p className="text-sm font-medium text-gray-500">Aktif Modüller</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{plan.activeModules.length}</p>
          <Link
            href="/billing/moduller"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Modülleri Yönet <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-gray-100 bg-white p-5"
        >
          <p className="text-sm font-medium text-gray-500">Ödeme Yöntemi</p>
          {plan.cardLast4 ? (
            <div className="mt-1 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <span className="text-lg font-bold text-gray-900">
                **** {plan.cardLast4}
              </span>
              {plan.cardBrand && (
                <span className="text-xs text-gray-400">{plan.cardBrand}</span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-lg font-bold text-gray-400">Kart eklenmedi</p>
          )}
          <button
            onClick={handleAddCard}
            disabled={cardLoading}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {cardLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Settings className="h-3.5 w-3.5" />
            )}
            {plan.cardLast4 ? "Değiştir" : "Kart Ekle"}
          </button>
        </motion.div>

        {/* Extra Users */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-gray-100 bg-white p-5"
        >
          <p className="text-sm font-medium text-gray-500">Ek Kullanıcılar</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{plan.extraUsers}</p>
          <Link
            href="/billing/moduller"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Değiştir <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>

      {/* Billing History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-gray-100 bg-white"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Fatura Geçmişi</h2>
        </div>
        <div className="p-6">
          {history.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Henüz fatura bulunmuyor.</p>
          ) : (
            <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 font-medium text-gray-500">Tarih</th>
                    <th className="pb-3 font-medium text-gray-500">Açıklama</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Tutar</th>
                    <th className="pb-3 font-medium text-gray-500 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-3 text-gray-600">
                        {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="py-3 text-gray-700">{item.description}</td>
                      <td className="py-3 text-right font-medium text-gray-900">
                        ₺{fmt(item.amount)}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.status === "success"
                            ? "bg-green-50 text-green-700"
                            : item.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {item.status === "success" ? "Başarılı" : item.status === "failed" ? "Başarısız" : "Bekliyor"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-gray-50">
              {history.map((item) => (
                <div key={item.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === "success"
                        ? "bg-green-50 text-green-700"
                        : item.status === "failed"
                        ? "bg-red-50 text-red-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {item.status === "success" ? "Başarılı" : item.status === "failed" ? "Başarısız" : "Bekliyor"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{item.description}</p>
                  <p className="text-sm font-medium text-gray-900">₺{fmt(item.amount)}</p>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </motion.div>

      {/* PayTR Iframe Modal */}
      {cardModalOpen && cardToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Kart Bilgileri</h3>
              <button
                onClick={handleCardModalClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-gray-500">
                Kart doğrulama için ₺1 çekim yapılacak ve otomatik iade edilecektir.
              </p>
              <iframe
                src={`https://www.paytr.com/odeme/guvenli/${cardToken}`}
                className="h-[420px] w-full rounded-xl border border-gray-200"
                frameBorder="0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
