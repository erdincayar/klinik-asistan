"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { TREATMENT_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

interface Transaction {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface CategoryBreakdown {
  category: string;
  label: string;
  total: number;
}

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function FinancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [isRes, msRes] = await Promise.all([
          fetch(`/api/finance?type=income-statement&month=${month}&year=${year}`),
          fetch(`/api/finance?type=monthly-summary&year=${year}`),
        ]);

        if (!isRes.ok) throw new Error("Finans verisi al\u0131namad\u0131");
        const isData = await isRes.json();
        setIncomeStatement(isData);

        if (msRes.ok) {
          const msData = await msRes.json();
          setMonthlySummary(msData.months || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata olu\u015ftu");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [month, year]);

  const months = [
    "Ocak", "\u015eubat", "Mart", "Nisan", "May\u0131s", "Haziran",
    "Temmuz", "A\u011fustos", "Eyl\u00fcl", "Ekim", "Kas\u0131m", "Aral\u0131k",
  ];

  if (loading) return <div className="text-gray-500">Y\u00fckleniyor...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Month/Year selector and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Link href="/finance/new-income">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Gelir
            </Button>
          </Link>
          <Link href="/finance/new-expense">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Gider
            </Button>
          </Link>
        </div>
      </div>

      {/* Income Statement */}
      {incomeStatement && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">Toplam Gelir</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(incomeStatement.totalIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(incomeStatement.totalExpense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">Net Kar</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(incomeStatement.netProfit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">KDV Tutar\u0131</p>
              <p className="text-2xl font-bold text-gray-700">
                {formatCurrency(incomeStatement.vatAmount)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Revenue vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Ayl\u0131k Gelir / Gider</CardTitle>
            <CardDescription>{year} y\u0131l\u0131 kar\u015f\u0131la\u015ft\u0131rma</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySummary.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlySummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => `${(v / 100).toLocaleString("tr-TR")}`}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value)),
                      name === "income" ? "Gelir" : "Gider",
                    ]}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="income" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="expense" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Kategori Da\u011f\u0131l\u0131m\u0131</CardTitle>
            <CardDescription>Tedavi kategorilerine g\u00f6re gelir</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeStatement && incomeStatement.totalIncome > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={TREATMENT_CATEGORIES.map((cat) => ({
                      name: cat.label,
                      value: 1,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {TREATMENT_CATEGORIES.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500">Veri yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
