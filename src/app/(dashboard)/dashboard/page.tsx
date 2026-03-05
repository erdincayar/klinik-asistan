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
  Coins,
} from "lucide-react";
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
  totalPatients: number;
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
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
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
      <Skeleton className="h-[350px] w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[380px] rounded-2xl" />
        <Skeleton className="h-[380px] rounded-2xl" />
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
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const [dashRes, chartRes, lowStockRes, upcomingRes, tokenRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch(
            `/api/finance?type=monthly-summary&year=${today.getFullYear()}`
          ),
          fetch("/api/products/low-stock"),
          fetch("/api/finance/recurring/upcoming"),
          fetch("/api/settings/tokens"),
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

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          setTokenBalance(tokenData.balance?.balance ?? null);
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
            className="mt-3 text-sm font-medium text-blue-600 hover:underline"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  /* ── Stat cards config ── */
  const statCards = [
    {
      title: "Toplam Müşteri",
      value: data.totalPatients.toLocaleString("tr-TR"),
      change: null,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
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
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
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
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── TOKEN BADGE ── */}
      {tokenBalance !== null && (
        <Link href="/settings">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors cursor-pointer hover:opacity-80",
              tokenBalance < 5000
                ? "bg-red-50 text-red-700 border border-red-200"
                : tokenBalance < 20000
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-gray-50 text-gray-700 border border-gray-200"
            )}
          >
            <Coins className="h-4 w-4" />
            {tokenBalance.toLocaleString("tr-TR")} token
          </motion.div>
        </Link>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={i}
              className="group rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md"
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
          );
        })}
      </div>

      {/* ── REVENUE CHART ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
        className="rounded-2xl border border-gray-100 bg-white p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Gelir Grafiği
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              {new Date().getFullYear()} yılı aylık gelir özeti
            </p>
          </div>
          <Link
            href="/reports"
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
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
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
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
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#incomeGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
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
        className="rounded-2xl border border-gray-100 bg-white"
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
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
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
          className="rounded-2xl border border-gray-100 bg-white"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900">
                Bugünün Randevuları
              </h2>
              {data.todayAppointments.length > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {data.todayAppointments.length}
                </span>
              )}
            </div>
            <Link
              href="/appointments"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
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
          className="rounded-2xl border border-gray-100 bg-white"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Son İşlemler
              </h2>
            </div>
            <Link
              href="/finance"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
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
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
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
