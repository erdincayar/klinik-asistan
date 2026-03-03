"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  ArrowRight,
  RefreshCw,
  CalendarDays,
  Upload,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { TREATMENT_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ──────────────────────── TYPES ──────────────────────── */

interface IncomeStatement {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  vatAmount: number;
}

interface MonthlySummary {
  month: number;
  monthName: string;
  income: number;
  expense: number;
}

interface TreatmentDetail {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  treatmentType: string;
  amount: number;
}

interface ExpenseDetail {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

interface RecurringTransaction {
  id: string;
  type: string;
  category: string;
  name: string;
  amount: number | null;
  dayOfMonth: number;
  isActive: boolean;
  remindBefore: number;
  notes: string | null;
}

/* ──────────────────────── HELPERS ──────────────────────── */

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

const TURKISH_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTHS_FULL = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const EXPENSE_BADGE: Record<string, string> = {
  KIRA: "bg-purple-50 text-purple-700",
  MAAS: "bg-blue-50 text-blue-700",
  MALZEME: "bg-orange-50 text-orange-700",
  FATURA: "bg-amber-50 text-amber-700",
  DIGER: "bg-gray-100 text-gray-700",
};

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  KIRA: "bg-purple-100 text-purple-800",
  MAAS: "bg-blue-100 text-blue-800",
  MALZEME: "bg-orange-100 text-orange-800",
  FATURA: "bg-amber-100 text-amber-800",
  DIGER: "bg-gray-100 text-gray-800",
};

function formatTurkishDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${TURKISH_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-100", className)} />;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className={cn("text-sm font-semibold", entry.dataKey === "income" ? "text-emerald-600" : "text-red-500")}>
          {entry.dataKey === "income" ? "Gelir" : "Gider"}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ──────────────────────── COMPONENT ──────────────────────── */

export default function FinancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [treatments, setTreatments] = useState<TreatmentDetail[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Recurring transactions state
  const [activeTab, setActiveTab] = useState("overview");
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    type: "EXPENSE",
    category: "FIXED",
    amount: "",
    dayOfMonth: "1",
    remindBefore: "3",
    notes: "",
  });

  // Upcoming payments state
  const [upcomingPayments, setUpcomingPayments] = useState<RecurringTransaction[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [isRes, msRes] = await Promise.all([
          fetch(`/api/finance?type=income-statement&month=${month}&year=${year}`),
          fetch(`/api/finance?type=monthly-summary&year=${year}`),
        ]);
        if (!isRes.ok) throw new Error("Finans verisi alınamadı");
        const isData = await isRes.json();
        setIncomeStatement(isData);
        setTreatments(isData.treatments || []);
        setExpenses(isData.expenses || []);

        if (msRes.ok) {
          const msData = await msRes.json();
          setMonthlySummary(msData.months || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [month, year]);

  async function fetchRecurringTransactions() {
    setRecurringLoading(true);
    try {
      const res = await fetch("/api/finance/recurring");
      if (res.ok) {
        const data = await res.json();
        setRecurringTransactions(data.transactions || []);
      }
    } catch {
      // silent fail
    } finally {
      setRecurringLoading(false);
    }
  }

  async function fetchUpcomingPayments() {
    setUpcomingLoading(true);
    try {
      const res = await fetch("/api/finance/recurring/upcoming");
      if (res.ok) {
        const data = await res.json();
        setUpcomingPayments(data.upcoming || []);
      }
    } catch {
      // silent fail
    } finally {
      setUpcomingLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "recurring") {
      fetchRecurringTransactions();
    } else if (activeTab === "upcoming") {
      fetchUpcomingPayments();
    }
  }, [activeTab]);

  async function handleCreateRecurring() {
    if (!recurringForm.name || !recurringForm.dayOfMonth) return;

    try {
      const res = await fetch("/api/finance/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recurringForm.name,
          type: recurringForm.type,
          category: recurringForm.category,
          amount: recurringForm.amount || null,
          dayOfMonth: recurringForm.dayOfMonth,
          remindBefore: recurringForm.remindBefore,
          notes: recurringForm.notes || null,
        }),
      });

      if (res.ok) {
        setShowAddRecurring(false);
        setRecurringForm({
          name: "",
          type: "EXPENSE",
          category: "FIXED",
          amount: "",
          dayOfMonth: "1",
          remindBefore: "3",
          notes: "",
        });
        fetchRecurringTransactions();
      }
    } catch {
      // silent fail
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const res = await fetch("/api/finance/recurring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });

      if (res.ok) {
        fetchRecurringTransactions();
      }
    } catch {
      // silent fail
    }
  }

  async function handleMarkAsPaid(transaction: RecurringTransaction) {
    setPayingId(transaction.id);
    try {
      const res = await fetch(`/api/finance/recurring/${transaction.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: transaction.amount || 0,
          notes: `${transaction.name} - otomatik ödeme`,
        }),
      });

      if (res.ok) {
        fetchUpcomingPayments();
      }
    } catch {
      // silent fail
    } finally {
      setPayingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[350px] rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] rounded-2xl" />
          <Skeleton className="h-[300px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm font-medium text-blue-600 hover:underline">
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Toplam Gelir",
      value: formatCurrency(incomeStatement?.totalIncome ?? 0),
      icon: TrendingUp,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
    },
    {
      title: "Toplam Gider",
      value: formatCurrency(incomeStatement?.totalExpense ?? 0),
      icon: TrendingDown,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      valueColor: "text-red-600",
    },
    {
      title: "Net Kâr",
      value: formatCurrency(incomeStatement?.netProfit ?? 0),
      icon: DollarSign,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: (incomeStatement?.netProfit ?? 0) >= 0 ? "text-blue-700" : "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="recurring">
            <RefreshCw className="mr-1 h-4 w-4" />
            Sabit Ödemeler
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <CalendarDays className="mr-1 h-4 w-4" />
            Yaklaşan Ödemeler
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Header: filters + actions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-2">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {MONTHS_FULL.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {[year - 1, year, year + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/invoice-upload"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  İçe Aktar
                </Link>
                <a
                  href={`/api/finance/export?month=${month}&year=${year}`}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Dışa Aktar
                </a>
                <Link
                  href="/finance/new-income"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20"
                >
                  <Plus className="h-4 w-4" />
                  Gelir Ekle
                </Link>
                <Link
                  href="/finance/new-expense"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  Gider Ekle
                </Link>
                <Link
                  href="/invoices?tab=create"
                  className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 sm:inline-flex"
                >
                  <FileText className="h-4 w-4" />
                  Fatura Kes
                </Link>
              </div>
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.title}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    className="rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-gray-500">{stat.title}</p>
                        <p className={cn("mt-2 text-2xl font-bold tracking-tight", stat.valueColor)}>
                          {stat.value}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {MONTHS_FULL[month - 1]} {year}
                        </p>
                      </div>
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", stat.iconBg)}>
                        <Icon className={cn("h-5 w-5", stat.iconColor)} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Chart */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Aylık Gelir / Gider</h2>
                  <p className="mt-0.5 text-[13px] text-gray-500">{year} yılı karşılaştırma</p>
                </div>
                <Link href="/reports" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                  Detaylı Rapor <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {monthlySummary.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center">
                  <p className="text-sm text-gray-400">Grafik verisi henüz yok</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlySummary} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="monthName" fontSize={12} tickLine={false} axisLine={false} dy={8} tick={{ fill: "#9ca3af" }} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} dx={-4} tick={{ fill: "#9ca3af" }} tickFormatter={(v) => `${(v / 100).toLocaleString("tr-TR")}₺`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend formatter={(value) => (value === "income" ? "Gelir" : "Gider")} wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="income" name="income" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Income + Expense tables */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Income table */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={4}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold text-gray-900">Gelir Detayları</h2>
                    {treatments.length > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{treatments.length}</span>
                    )}
                  </div>
                </div>

                {treatments.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-400">Bu ay gelir kaydı yok</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {treatments.slice(0, 8).map((t) => {
                      const catLabel = TREATMENT_CATEGORIES.find((c) => c.value === t.treatmentType)?.label || t.treatmentType;
                      return (
                        <div key={t.id} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-gray-50/70">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                              <DollarSign className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <Link href={`/patients/${t.patientId}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                {t.patientName}
                              </Link>
                              <p className="text-[11px] text-gray-400">{catLabel} · {formatTurkishDate(t.date)}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-emerald-700">{formatCurrency(t.amount)}</span>
                        </div>
                      );
                    })}
                    {/* Total */}
                    <div className="flex items-center justify-between bg-emerald-50/30 px-6 py-3">
                      <span className="text-sm font-semibold text-gray-700">Toplam Gelir</span>
                      <span className="text-sm font-bold text-emerald-700">{formatCurrency(incomeStatement?.totalIncome ?? 0)}</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Expense table */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={5}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Gider Detayları</h2>
                    {expenses.length > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">{expenses.length}</span>
                    )}
                  </div>
                </div>

                {expenses.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center">
                    <div className="text-center">
                      <TrendingDown className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-400">Bu ay gider kaydı yok</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {expenses.slice(0, 8).map((e) => {
                      const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label || e.category;
                      const badgeColor = EXPENSE_BADGE[e.category] || EXPENSE_BADGE.DIGER;
                      return (
                        <div key={e.id} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-gray-50/70">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{e.description}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", badgeColor)}>{catLabel}</span>
                                <span className="text-[11px] text-gray-400">{formatTurkishDate(e.date)}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-red-600">{formatCurrency(e.amount)}</span>
                        </div>
                      );
                    })}
                    {/* Total */}
                    <div className="flex items-center justify-between bg-red-50/30 px-6 py-3">
                      <span className="text-sm font-semibold text-gray-700">Toplam Gider</span>
                      <span className="text-sm font-bold text-red-600">{formatCurrency(incomeStatement?.totalExpense ?? 0)}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </TabsContent>

        {/* Recurring Transactions Tab */}
        <TabsContent value="recurring">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sabit Ödemeler</h2>
              <Button onClick={() => setShowAddRecurring(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Sabit İşlem Ekle
              </Button>
            </div>

            {recurringLoading ? (
              <div className="text-gray-500">Yükleniyor...</div>
            ) : recurringTransactions.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">
                    Henüz sabit işlem tanımlanmamış. Kira, maaş, abonelik gibi tekrarlayan işlemlerinizi ekleyin.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>İşlem Adı</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead className="text-center">Ödeme Günü</TableHead>
                        <TableHead className="text-center">Durum</TableHead>
                        <TableHead className="text-center">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringTransactions.map((rt) => (
                        <TableRow key={rt.id}>
                          <TableCell className="font-medium">{rt.name}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                rt.type === "INCOME"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {rt.type === "INCOME" ? "Gelir" : "Gider"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rt.category === "FIXED" ? "Sabit" : "Değişken"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {rt.amount
                              ? `${rt.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            Her ayın {rt.dayOfMonth}. günü
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                rt.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {rt.isActive ? "Aktif" : "Pasif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(rt.id, rt.isActive)}
                            >
                              {rt.isActive ? "Pasife Al" : "Aktif Et"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Upcoming Payments Tab */}
        <TabsContent value="upcoming">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Yaklaşan Ödemeler</h2>
              <Button variant="outline" onClick={fetchUpcomingPayments}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Yenile
              </Button>
            </div>

            {upcomingLoading ? (
              <div className="text-gray-500">Yükleniyor...</div>
            ) : upcomingPayments.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">
                    Önümüzdeki 7 gün içinde yaklaşan ödeme bulunmuyor.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingPayments.map((up) => (
                  <Card key={up.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{up.name}</CardTitle>
                      <CardDescription>
                        <Badge
                          className={
                            up.type === "INCOME"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {up.type === "INCOME" ? "Gelir" : "Gider"}
                        </Badge>
                        <span className="ml-2">
                          {up.category === "FIXED" ? "Sabit" : "Değişken"}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Tutar</span>
                        <span className="font-semibold">
                          {up.amount
                            ? `${up.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`
                            : "Belirtilmemiş"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Ödeme Günü</span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4 text-gray-400" />
                          Ayın {up.dayOfMonth}. günü
                        </span>
                      </div>
                      {up.notes && (
                        <p className="text-sm text-gray-500">{up.notes}</p>
                      )}
                      <Button
                        className="w-full"
                        onClick={() => handleMarkAsPaid(up)}
                        disabled={payingId === up.id}
                      >
                        {payingId === up.id ? "Kaydediliyor..." : "Ödendi"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Recurring Transaction Dialog */}
      <Dialog open={showAddRecurring} onOpenChange={setShowAddRecurring}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Sabit İşlem Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recurring-name">İşlem Adı</Label>
              <Input
                id="recurring-name"
                placeholder="örn. Klinik Kirası"
                value={recurringForm.name}
                onChange={(e) =>
                  setRecurringForm({ ...recurringForm, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurring-type">Tür</Label>
                <select
                  id="recurring-type"
                  value={recurringForm.type}
                  onChange={(e) =>
                    setRecurringForm({ ...recurringForm, type: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="EXPENSE">Gider</option>
                  <option value="INCOME">Gelir</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurring-category">Kategori</Label>
                <select
                  id="recurring-category"
                  value={recurringForm.category}
                  onChange={(e) =>
                    setRecurringForm({ ...recurringForm, category: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="FIXED">Sabit</option>
                  <option value="VARIABLE">Değişken</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurring-amount">Tutar (TL)</Label>
                <Input
                  id="recurring-amount"
                  type="number"
                  placeholder="Opsiyonel"
                  value={recurringForm.amount}
                  onChange={(e) =>
                    setRecurringForm({ ...recurringForm, amount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurring-day">Ödeme Günü (1-31)</Label>
                <Input
                  id="recurring-day"
                  type="number"
                  min="1"
                  max="31"
                  value={recurringForm.dayOfMonth}
                  onChange={(e) =>
                    setRecurringForm({ ...recurringForm, dayOfMonth: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring-remind">Hatırlatma (gün önce)</Label>
              <Input
                id="recurring-remind"
                type="number"
                min="0"
                max="30"
                value={recurringForm.remindBefore}
                onChange={(e) =>
                  setRecurringForm({ ...recurringForm, remindBefore: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring-notes">Notlar</Label>
              <Input
                id="recurring-notes"
                placeholder="Opsiyonel"
                value={recurringForm.notes}
                onChange={(e) =>
                  setRecurringForm({ ...recurringForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRecurring(false)}>
              İptal
            </Button>
            <Button onClick={handleCreateRecurring} disabled={!recurringForm.name}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
