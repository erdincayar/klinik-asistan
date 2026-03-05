"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: number;
  monthName: string;
  income: number;
  expense: number;
  profit: number;
}

interface ReportData {
  year: number;
  monthlyData: MonthlyData[];
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  expenseCategories: Record<string, number>;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

const categoryLabels: Record<string, string> = {
  MALZEME: "Malzeme",
  KIRA: "Kira",
  FATURA: "Fatura",
  MAAS: "Maaş",
  DIGER: "Diğer",
};

export default function FinancialReportsContent() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/financial?year=${year}`);
        if (res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [year]);

  const chartData = data?.monthlyData.map((m) => ({
    name: m.monthName.slice(0, 3),
    Gelir: m.income / 100,
    Gider: m.expense / 100,
    Kar: m.profit / 100,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Mali Tablo</h2>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </motion.div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : data ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm text-gray-500">Toplam Gelir</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-600">
              {formatCurrency(data.totalIncome)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm text-gray-500">Toplam Gider</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-red-600">
              {formatCurrency(data.totalExpense)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Net Kar</span>
            </div>
            <p className={`mt-3 text-2xl font-bold ${data.totalProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatCurrency(data.totalProfit)}
            </p>
          </div>
        </motion.div>
      ) : null}

      {/* Charts */}
      {!loading && data && (
        <>
          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-gray-100 bg-white p-6"
          >
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Aylık Gelir vs Gider</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `₺${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`]}
                />
                <Legend />
                <Bar dataKey="Gelir" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Gider" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Profit Trend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border border-gray-100 bg-white p-6"
          >
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Kar Trendi</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `₺${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }}
                  formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`]}
                />
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="Kar" stroke="#3b82f6" strokeWidth={2} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Expense categories */}
          {Object.keys(data.expenseCategories).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Gider Kategorileri</h3>
              <div className="space-y-3">
                {Object.entries(data.expenseCategories)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => {
                    const pct = data.totalExpense > 0 ? (amount / data.totalExpense) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-4">
                        <span className="w-24 text-sm text-gray-600">
                          {categoryLabels[cat] || cat}
                        </span>
                        <div className="flex-1">
                          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                              className="h-full rounded-full bg-red-400"
                            />
                          </div>
                        </div>
                        <span className="w-24 text-right text-sm font-medium text-gray-800">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* Monthly detail table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
          >
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Aylık Detay</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ay</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Gelir</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Gider</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Net Kar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.monthlyData.map((m) => (
                    <tr key={m.month} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-800">{m.monthName}</td>
                      <td className="px-6 py-3 text-right text-emerald-600">{formatCurrency(m.income)}</td>
                      <td className="px-6 py-3 text-right text-red-600">{formatCurrency(m.expense)}</td>
                      <td className={`px-6 py-3 text-right font-semibold ${m.profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {formatCurrency(m.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
