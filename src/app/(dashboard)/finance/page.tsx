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

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

const TURKISH_MONTHS = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

function formatTurkishDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${TURKISH_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  KIRA: "bg-purple-100 text-purple-800",
  MAAS: "bg-blue-100 text-blue-800",
  MALZEME: "bg-orange-100 text-orange-800",
  FATURA: "bg-yellow-100 text-yellow-800",
  DIGER: "bg-gray-100 text-gray-800",
};

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

  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;
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
              <p className="text-sm text-gray-500">KDV Tutarı</p>
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
            <CardTitle>Aylık Gelir / Gider</CardTitle>
            <CardDescription>{year} yılı karşılaştırma</CardDescription>
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
            <CardTitle>Kategori Dağılımı</CardTitle>
            <CardDescription>Tedavi kategorilerine göre gelir</CardDescription>
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

      {/* Gelir Detayları */}
      <Card>
        <CardHeader>
          <CardTitle>Gelir Detayları</CardTitle>
          <CardDescription>
            {months[month - 1]} {year} - Tedavi kayıtları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {treatments.length === 0 ? (
            <p className="text-sm text-gray-500">Bu ay kayıt bulunmuyor</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Hasta Adı</TableHead>
                    <TableHead>İşlem Türü</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treatments.map((t) => {
                    const catLabel =
                      TREATMENT_CATEGORIES.find((c) => c.value === t.treatmentType)?.label ||
                      t.treatmentType;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>{formatTurkishDate(t.date)}</TableCell>
                        <TableCell>
                          <Link
                            href={`/patients/${t.patientId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {t.patientName}
                          </Link>
                        </TableCell>
                        <TableCell>{catLabel}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(t.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end border-t pt-4">
                <p className="text-sm font-semibold">
                  Toplam Gelir:{" "}
                  <span className="text-green-600">
                    {formatCurrency(incomeStatement?.totalIncome ?? 0)}
                  </span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gider Detayları */}
      <Card>
        <CardHeader>
          <CardTitle>Gider Detayları</CardTitle>
          <CardDescription>
            {months[month - 1]} {year} - Gider kayıtları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-500">Bu ay kayıt bulunmuyor</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => {
                    const catLabel =
                      EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label ||
                      e.category;
                    const catColor =
                      EXPENSE_CATEGORY_COLORS[e.category] || EXPENSE_CATEGORY_COLORS.DIGER;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>{formatTurkishDate(e.date)}</TableCell>
                        <TableCell>{e.description}</TableCell>
                        <TableCell>
                          <Badge className={catColor}>{catLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(e.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end border-t pt-4">
                <p className="text-sm font-semibold">
                  Toplam Gider:{" "}
                  <span className="text-red-600">
                    {formatCurrency(incomeStatement?.totalExpense ?? 0)}
                  </span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
