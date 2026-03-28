"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  CalendarDays,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Bell,
  Clock,
  AlertTriangle,
  Sparkles,
  Bot,
  HardDrive,
} from "lucide-react";
import type { ModuleRecommendation } from "@/lib/onboarding/onboarding-agent";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { APPOINTMENT_STATUSES, TREATMENT_CATEGORIES } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ──────────────────────── TYPES ──────────────────────── */

interface DashboardData {
  monthlyIncome: number;
  monthlyExpense: number;
  netProfit: number;
  estimatedProfit: number;
  unmatchedItemCount: number;
  totalPatients: number;
  unreadAlarmCount?: number;
  pendingReminders: number;
  recentTreatments: {
    id: string;
    patientName: string;
    name: string;
    amount: number;
    date: string;
  }[];
  todayAppointments: {
    id: string;
    patientName: string;
    startTime: string;
    endTime: string;
    treatmentType: string;
    status: string;
  }[];
}

interface MonthlySummary {
  month: number;
  monthName: string;
  income: number;
  expense: number;
}

interface UpcomingPayment {
  id: string;
  name: string;
  type: string; // "INCOME" or "EXPENSE"
  amount: number | null;
  dueDate: string;
  dayOfMonth: number;
}

/* ──────────────────────── ANIMATION ──────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

/* ──────────────────────── SKELETON ──────────────────────── */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gray-100",
        className
      )}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-[350px] w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
    </div>
  );
}

/* ──────────────────────── TOOLTIP ──────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm font-semibold text-gray-900">
          {entry.dataKey === "income" ? "Gelir" : "Gider"}:{" "}
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ──────────────────────── STATUS BADGE ──────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const info =
    APPOINTMENT_STATUSES.find((s) => s.value === status) ||
    APPOINTMENT_STATUSES[0];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold",
        info.color
      )}
    >
      {info.label}
    </span>
  );
}

/* ──────────────────────── MAIN ──────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<MonthlySummary[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  // TOKEN_SYSTEM_DISABLED
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [storageUsage, setStorageUsage] = useState<{ usedMb: number; limitMb: number; plan: string } | null>(null);
  const [onboardingProfile, setOnboardingProfile] = useState<{
    customMessage?: string;
    selectedModules?: ModuleRecommendation[];
    upsellModules?: ModuleRecommendation[];
  } | null>(null);
  const [employeePerms, setEmployeePerms] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const [dashRes, chartRes, lowStockRes, upcomingRes, tokenRes, onbRes, permRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch(
            `/api/finance?type=monthly-summary&year=${today.getFullYear()}`
          ),
          fetch("/api/products/low-stock"),
          fetch("/api/finance/recurring/upcoming"),
          fetch("/api/settings/tokens"),
          fetch("/api/onboarding/dashboard-profile"),
          fetch("/api/employees/me/permissions"),
        ]);

        if (!dashRes.ok) throw new Error("Dashboard verisi alınamadı");
        setData(await dashRes.json());

        if (chartRes.ok) {
          const chartJson = await chartRes.json();
          setChartData(chartJson.months || []);
        }

        if (lowStockRes.ok) {
          const lowStockData = await lowStockRes.json();
          setLowStockCount(
            Array.isArray(lowStockData) ? lowStockData.length : 0
          );
        }

        if (upcomingRes.ok) {
          const upcomingData = await upcomingRes.json();
          setUpcomingPayments(Array.isArray(upcomingData) ? upcomingData : []);
        }

        // TOKEN_SYSTEM_DISABLED
        // if (tokenRes.ok) {
        //   const tokenData = await tokenRes.json();
        //   setTokenBalance(tokenData.balance?.balance ?? null);
        // }

        // Storage usage
        try {
          const storageRes = await fetch("/api/billing/storage-usage");
          if (storageRes.ok) {
            setStorageUsage(await storageRes.json());
          }
        } catch {}

        if (onbRes.ok) {
          const onbData = await onbRes.json();
          if (onbData.profile) {
            const profile = onbData.profile;
            const analysis = profile.analysisResult as {
              customMessage?: string;
              upsellModules?: ModuleRecommendation[];
            } | null;
            const recommended = (profile.recommendedModules || []) as ModuleRecommendation[];
            const selected = (profile.selectedModules || []) as string[];
            const selectedRecs = recommended.filter((m: ModuleRecommendation) => selected.includes(m.slug));
            const upsellMods = (analysis?.upsellModules || []).filter(
              (m: ModuleRecommendation) => !selected.includes(m.slug)
            );
            setOnboardingProfile({
              customMessage: analysis?.customMessage,
              selectedModules: selectedRecs,
              upsellModules: upsellMods,
            });
          }
        }

        if (permRes.ok) {
          const permData = await permRes.json();
          if (permData.permissions) setEmployeePerms(permData.permissions);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-medium text-[#4F46E5] hover:underline"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  /* ── Stat cards config ── */
  const allStatCards = [
    {
      title: "Toplam Müşteri",
      value: data.totalPatients.toLocaleString("tr-TR"),
      change: null,
      icon: Users,
      iconBg: "bg-[#EEF2FF]",
      iconColor: "text-[#6366F1]",
      href: "/patients",
      permKey: "customers",
    },
    {
      title: "Bugünün Randevuları",
      value: data.todayAppointments.length.toString(),
      change:
        data.todayAppointments.length > 0
          ? `${data.todayAppointments.filter((a) => a.status === "COMPLETED").length} tamamlandı`
          : null,
      icon: Calendar,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/appointments",
      permKey: "appointments",
    },
    {
      title: "Aylık Gelir",
      value: formatCurrency(data.monthlyIncome),
      change:
        data.netProfit >= 0
          ? `+${formatCurrency(data.netProfit)} net kâr`
          : `${formatCurrency(data.netProfit)} net zarar`,
      changeUp: data.netProfit >= 0,
      icon: DollarSign,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      estimatedProfit: data.estimatedProfit,
      unmatchedItemCount: data.unmatchedItemCount,
      href: "/finance",
      permKey: "finance",
    },
    {
      title: "Stok Uyarıları",
      value: lowStockCount.toString(),
      change:
        lowStockCount > 0
          ? `${lowStockCount} ürün düşük stokta`
          : "Stok normal",
      changeUp: lowStockCount === 0,
      icon: Package,
      iconBg: lowStockCount > 0 ? "bg-red-50" : "bg-emerald-50",
      iconColor: lowStockCount > 0 ? "text-red-600" : "text-emerald-600",
      href: "/inventory",
      permKey: "inventory",
    },
  ];

  // Filter stat cards based on employee permissions
  const statCards = allStatCards.filter((card) => {
    if (!employeePerms) return true; // No restrictions (admin/owner)
    return employeePerms[card.permKey] !== "none";
  });

  return (
    <div className="space-y-6">
      {/* TOKEN_SYSTEM_DISABLED — Token badge kaldırıldı */}

      {/* ── ONBOARDING PERSONALIZATION ── */}
      {onboardingProfile?.selectedModules && onboardingProfile.selectedModules.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="rounded-xl border border-[#818CF8]/30 bg-gradient-to-br from-[#EEF2FF] to-white p-6"
        >
          {onboardingProfile.customMessage && (
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm leading-relaxed text-[#5C1B0F]">
                {onboardingProfile.customMessage}
              </p>
            </div>
          )}
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Sizin İçin Hazırlandı</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {onboardingProfile.selectedModules.map((mod) => (
              <div key={mod.slug} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${mod.color}15` }}
                  >
                    <span className="text-sm" style={{ color: mod.color }}>
                      {mod.icon === "MessageCircle" ? "💬" : mod.icon === "Calendar" ? "📅" : mod.icon === "DollarSign" ? "💰" : mod.icon === "Users" ? "👥" : mod.icon === "Bot" ? "🤖" : mod.icon === "Megaphone" ? "📣" : mod.icon === "Share2" ? "📱" : "✨"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{mod.name}</span>
                </div>
                <p className="text-xs text-gray-500">{mod.shortDescription}</p>
              </div>
            ))}
          </div>
          {onboardingProfile.upsellModules && onboardingProfile.upsellModules.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Keşfet — Büyümeye Devam Et
              </p>
              <div className="flex flex-wrap gap-2">
                {onboardingProfile.upsellModules.map((mod) => (
                  <div
                    key={mod.slug}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2"
                  >
                    <span className="text-xs font-medium text-gray-700">{mod.name}</span>
                    <span className="text-[11px] text-[#6366F1]">₺{mod.basePrice}/ay</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── CTA for users without profile ── */}
      {!onboardingProfile && (
        <motion.button
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          onClick={() => window.dispatchEvent(new Event("open-onboarding-widget"))}
          className="flex w-full items-center gap-4 rounded-xl border border-dashed border-[#818CF8] bg-[#EEF2FF]/50 p-5 text-left transition-all hover:bg-[#EEF2FF] hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Platformu size özel kuralım</p>
            <p className="text-xs text-gray-500">Sektörünüze uygun modülleri keşfedin</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-[#6366F1]" />
        </motion.button>
      )}

      {/* ── ALARM WARNING ── */}
      {data.unreadAlarmCount != null && data.unreadAlarmCount > 0 && (
        <Link href="/alarmlar">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 transition-colors hover:bg-orange-100 cursor-pointer"
          >
            <Bell className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              {data.unreadAlarmCount} okunmamış alarm
            </span>
            <ArrowRight className="ml-auto h-4 w-4 text-orange-500" />
          </motion.div>
        </Link>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={i}
                className="group cursor-pointer rounded-xl border border-gray-100 bg-white p-6 transition-all hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-gray-500">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <div className="mt-2 flex items-center gap-1">
                        {"changeUp" in stat ? (
                          stat.changeUp ? (
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )
                        ) : null}
                        <span
                          className={cn(
                            "text-xs font-medium",
                            "changeUp" in stat
                              ? stat.changeUp
                                ? "text-emerald-600"
                                : "text-red-600"
                              : "text-gray-500"
                          )}
                        >
                          {stat.change}
                        </span>
                      </div>
                    )}
                    {"estimatedProfit" in stat && stat.estimatedProfit !== 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className={cn("text-xs font-medium", (stat.estimatedProfit as number) >= 0 ? "text-emerald-600" : "text-red-600")}>
                          Tahmini Kâr: {formatCurrency(stat.estimatedProfit as number)}
                        </span>
                        {"unmatchedItemCount" in stat && (stat.unmatchedItemCount as number) > 0 && (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      stat.iconBg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", stat.iconColor)} />
                  </div>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* ── STORAGE INDICATOR ── */}
      {storageUsage && (() => {
        const pct = storageUsage.limitMb > 0 ? Math.min(100, Math.round((storageUsage.usedMb / storageUsage.limitMb) * 100)) : 0;
        const isWarning = pct >= 90;
        const isFull = pct >= 100;
        return (
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={5}
            className={cn(
              "rounded-xl border p-4",
              isFull ? "border-red-200 bg-red-50" : isWarning ? "border-orange-200 bg-orange-50" : "border-gray-100 bg-white"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className={cn("h-4 w-4", isFull ? "text-red-500" : isWarning ? "text-orange-500" : "text-gray-400")} />
                <span className="text-sm font-medium text-gray-700">Depolama</span>
                <span className="text-xs text-gray-500">
                  {storageUsage.usedMb} / {storageUsage.limitMb >= 1024 ? `${(storageUsage.limitMb / 1024).toFixed(0)} GB` : `${storageUsage.limitMb} MB`}
                </span>
              </div>
              {(isWarning || isFull) && (
                <Link href="/billing/moduller" className="text-xs font-medium text-[#6366F1] hover:text-[#4F46E5]">
                  {isFull ? "Depolama doldu! Yükselt" : "Dolmak üzere — Yükselt"}
                </Link>
              )}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={cn("h-full rounded-full transition-all", isFull ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-[#EEF2FF]0")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </motion.div>
        );
      })()}

      {/* ── REVENUE CHART ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
        className="rounded-xl border border-gray-100 bg-white p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Gelir / Gider Grafiği
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              {new Date().getFullYear()} yılı aylık özet
            </p>
          </div>
          <Link
            href="/reports"
            className="flex items-center gap-1 text-xs font-medium text-[#4F46E5] hover:text-[#5C1B0F]"
          >
            Detaylı Rapor
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {chartData.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center">
            <p className="text-sm text-gray-400">Grafik verisi henüz yok</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="monthName"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={8}
                tick={{ fill: "#9ca3af" }}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dx={-4}
                tick={{ fill: "#9ca3af" }}
                tickFormatter={(v) =>
                  `${(v / 100).toLocaleString("tr-TR")}₺`
                }
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#6366F1"
                strokeWidth={2.5}
                fill="url(#incomeGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "#6366F1", strokeWidth: 2, stroke: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#expenseGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ── UPCOMING PAYMENTS ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={5}
        className="rounded-xl border border-gray-100 bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-600" />
              <h2 className="text-sm font-semibold text-gray-900">
                Yaklaşan Ödemeler
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">Önümüzdeki 7 gün içindeki ödemeler</p>
          </div>
          <Link
            href="/finance?tab=upcoming"
            className="flex items-center gap-1 text-xs font-medium text-[#4F46E5] hover:text-[#5C1B0F]"
          >
            Tümünü Gör
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-4">
          {upcomingPayments.length === 0 ? (
            <div className="flex h-[80px] items-center justify-center">
              <p className="text-sm text-gray-400">Yaklaşan ödeme yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                        payment.type === "INCOME"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      )}
                    >
                      {payment.type === "INCOME" ? "Gelir" : "Gider"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{payment.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {payment.amount ? formatCurrency(payment.amount) : "Değişken"}
                    </p>
                    <p className="text-[11px] text-gray-400">Her ayın {payment.dayOfMonth}. günü</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── BOTTOM TWO-COLUMN ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Appointments */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
          className="rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#6366F1]" />
              <h2 className="text-sm font-semibold text-gray-900">
                Bugünün Randevuları
              </h2>
              {data.todayAppointments.length > 0 && (
                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#4F46E5]">
                  {data.todayAppointments.length}
                </span>
              )}
            </div>
            <Link
              href="/appointments"
              className="flex items-center gap-1 text-xs font-medium text-[#4F46E5] hover:text-[#5C1B0F]"
            >
              Tümünü Gör
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-4">
            {data.todayAppointments.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center">
                <div className="text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    Bugün randevu bulunmuyor
                  </p>
                  <Link
                    href="/appointments"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#4F46E5] hover:text-[#5C1B0F]"
                  >
                    Randevu oluştur
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.todayAppointments.slice(0, 5).map((appt) => {
                  const treatmentLabel =
                    TREATMENT_CATEGORIES.find(
                      (t) => t.value === appt.treatmentType
                    )?.label || appt.treatmentType;

                  return (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF2FF] text-xs font-bold text-[#4F46E5]">
                          {appt.startTime}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {appt.patientName}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {treatmentLabel}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Reminders & Recent Treatments */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={7}
          className="rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Son İşlemler
              </h2>
            </div>
            <Link
              href="/finance"
              className="flex items-center gap-1 text-xs font-medium text-[#4F46E5] hover:text-[#5C1B0F]"
            >
              Tümünü Gör
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-4">
            {data.recentTreatments.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center">
                <div className="text-center">
                  <DollarSign className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    Henüz işlem bulunmuyor
                  </p>
                  <Link
                    href="/finance/new-income"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#4F46E5] hover:text-[#5C1B0F]"
                  >
                    İşlem ekle
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentTreatments.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {t.patientName}
                        </p>
                        <p className="text-[11px] text-gray-400">{t.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(t.amount)}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {formatDate(t.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending reminders footer */}
          {data.pendingReminders > 0 && (
            <Link
              href="/reminders"
              className="flex items-center justify-between border-t border-gray-100 px-6 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-700">
                  {data.pendingReminders}
                </span>
                <span className="text-xs font-medium text-gray-600">
                  Aktif hatırlatma
                </span>
              </div>
              <ArrowRight className="h-3 w-3 text-gray-400" />
            </Link>
          )}
        </motion.div>
      </div>
    </div>
  );
}
