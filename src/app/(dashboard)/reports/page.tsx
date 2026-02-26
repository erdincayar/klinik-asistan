"use client";

import { useEffect, useState, useCallback } from "react";
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
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonthlyAmount {
  month: string;
  amount: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
}

interface IncomeData {
  monthlyIncome: MonthlyAmount[];
  categoryBreakdown: CategoryBreakdown[];
  topService: { name: string; amount: number } | null;
  comparison: { current: number; previous: number; change: number };
}

interface ExpenseData {
  monthlyExpense: MonthlyAmount[];
  categoryBreakdown: CategoryBreakdown[];
  topExpense: { name: string; amount: number } | null;
  trend: MonthlyAmount[];
}

interface ProfitLossData {
  monthly: { month: string; income: number; expense: number; profit: number }[];
  netProfitTrend: MonthlyAmount[];
  vatSummary: { month: string; income: number; vatAmount: number }[];
  annualTaxEstimate: number;
  grossProfitMargin: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
}

interface CustomerData {
  monthlyNewPatients: MonthlyAmount[];
  topPatients: { name: string; totalRevenue: number; visitCount: number }[];
  averageRevenuePerPatient: number;
  loyaltyRate: number;
}

interface EmployeeData {
  employees: {
    name: string;
    role: string;
    totalRevenue: number;
    commission: number;
    treatmentCount: number;
  }[];
  revenueChart: { name: string; revenue: number }[];
  monthlyCommission: { month: string; commission: number }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const MONTHS = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTL(amount: number): string {
  return (
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " TL"
  );
}

function buildPdfHtml(data: ProfitLossData, year: number): string {
  const rows = data.monthly
    .map(
      (m) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${m.month}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#16a34a">${formatTL(m.income)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#dc2626">${formatTL(m.expense)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#2563eb;font-weight:600">${formatTL(m.profit)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <title>Kar-Zarar Raporu - ${year}</title>
  <style>
    body{font-family:system-ui,sans-serif;padding:40px;color:#1f2937}
    h1{font-size:24px;margin-bottom:4px}
    h2{font-size:14px;color:#6b7280;margin-bottom:24px}
    table{border-collapse:collapse;width:100%;margin-bottom:32px}
    th{background:#f3f4f6;padding:10px 8px;border:1px solid #ddd;text-align:left;font-size:13px}
    td{font-size:13px}
    .summary{display:flex;gap:24px;margin-bottom:32px}
    .summary-card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;flex:1}
    .summary-card p{margin:0}
    .summary-card .label{font-size:12px;color:#6b7280}
    .summary-card .value{font-size:22px;font-weight:700;margin-top:4px}
    .green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}
    @media print{body{padding:20px}}
  </style>
</head>
<body>
  <h1>Kar-Zarar Raporu</h1>
  <h2>${year} Yili</h2>
  <div class="summary">
    <div class="summary-card"><p class="label">Toplam Gelir</p><p class="value green">${formatTL(data.totalIncome)}</p></div>
    <div class="summary-card"><p class="label">Toplam Gider</p><p class="value red">${formatTL(data.totalExpense)}</p></div>
    <div class="summary-card"><p class="label">Net Kar</p><p class="value blue">${formatTL(data.netProfit)}</p></div>
  </div>
  <table>
    <thead><tr><th>Ay</th><th style="text-align:right">Gelir</th><th style="text-align:right">Gider</th><th style="text-align:right">Net Kar</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:12px;color:#9ca3af;margin-top:40px">Bu rapor KlinikAsistan tarafindan olusturulmustur.</p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Loading skeleton component
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      <p className="mt-4 text-sm text-gray-500">Veriler yukleniyor...</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error component
// ---------------------------------------------------------------------------

function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-sm text-red-500">{message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Tekrar Dene
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom hook for lazy-fetching tab data
// ---------------------------------------------------------------------------

function useTabData<T>(url: string, active: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Veri alinamadi");
      const json = await res.json();
      setData(json);
      setFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata olustu");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (active && !fetched) {
      fetchData();
    }
  }, [active, fetched, fetchData]);

  // Reset when URL changes (e.g., year change)
  useEffect(() => {
    setFetched(false);
    setData(null);
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// Tab 1 - Gelir Analizi
// ---------------------------------------------------------------------------

function IncomeTab({ year, active }: { year: number; active: boolean }) {
  const { data, loading, error, refetch } = useTabData<IncomeData>(
    `/api/reports?type=income&year=${year}`,
    active
  );

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  const changePercent = data.comparison.previous > 0
    ? ((data.comparison.change / data.comparison.previous) * 100).toFixed(1)
    : "0";
  const isUp = data.comparison.change >= 0;

  return (
    <div className="space-y-6">
      {/* Highlight cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Top service card */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Bu Ay En Cok Kazandiran Servis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topService ? (
              <>
                <p className="text-lg font-bold text-green-800">{data.topService.name}</p>
                <p className="text-2xl font-bold text-green-600">{formatTL(data.topService.amount)}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Henuz veri yok</p>
            )}
          </CardContent>
        </Card>

        {/* Previous month comparison */}
        <Card className={isUp ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Onceki Aya Gore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isUp ? (
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              ) : (
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              )}
              <span className={`text-2xl font-bold ${isUp ? "text-green-600" : "text-red-600"}`}>
                %{changePercent}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Bu ay: {formatTL(data.comparison.current)} / Gecen ay: {formatTL(data.comparison.previous)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly income bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aylik Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyIncome.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlyIncome}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${v.toLocaleString("tr-TR")}`} />
                  <Tooltip formatter={(value) => [formatTL(Number(value)), "Gelir"]} />
                  <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} name="Gelir" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kategori Dagilimi</CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {data.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatTL(Number(value)), "Tutar"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 - Gider Analizi
// ---------------------------------------------------------------------------

function ExpenseTab({ year, active }: { year: number; active: boolean }) {
  const { data, loading, error, refetch } = useTabData<ExpenseData>(
    `/api/reports?type=expense&year=${year}`,
    active
  );

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Highlight card */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-700">
            En Cok Neye Harcadim?
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topExpense ? (
            <>
              <p className="text-lg font-bold text-red-800">{data.topExpense.name}</p>
              <p className="text-2xl font-bold text-red-600">{formatTL(data.topExpense.amount)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Henuz veri yok</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly expense bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aylik Gider</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyExpense.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlyExpense}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${v.toLocaleString("tr-TR")}`} />
                  <Tooltip formatter={(value) => [formatTL(Number(value)), "Gider"]} />
                  <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gider" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gider Kategorileri</CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {data.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatTL(Number(value)), "Tutar"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense trend line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gider Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          {data.trend.length === 0 ? (
            <p className="text-sm text-gray-500">Veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v.toLocaleString("tr-TR")}`} />
                <Tooltip formatter={(value) => [formatTL(Number(value)), "Gider"]} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3 - Kar-Zarar
// ---------------------------------------------------------------------------

function ProfitLossTab({ year, active }: { year: number; active: boolean }) {
  const { data, loading, error, refetch } = useTabData<ProfitLossData>(
    `/api/reports?type=profit-loss&year=${year}`,
    active
  );

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Toplam Gelir</p>
                <p className="text-xl font-bold text-green-600">{formatTL(data.totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Toplam Gider</p>
                <p className="text-xl font-bold text-red-600">{formatTL(data.totalExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Net Kar</p>
                <p className="text-xl font-bold text-blue-600">{formatTL(data.netProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expense comparison chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aylik Gelir / Gider Karsilastirmasi</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthly.length === 0 ? (
            <p className="text-sm text-gray-500">Veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v.toLocaleString("tr-TR")}`} />
                <Tooltip
                  formatter={(value, name) => [
                    formatTL(Number(value)),
                    name === "income" ? "Gelir" : name === "expense" ? "Gider" : "Kar",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "income" ? "Gelir" : value === "expense" ? "Gider" : "Kar"
                  }
                />
                <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Net profit trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Net Kar Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          {data.netProfitTrend.length === 0 ? (
            <p className="text-sm text-gray-500">Veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.netProfitTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v.toLocaleString("tr-TR")}`} />
                <Tooltip formatter={(value) => [formatTL(Number(value)), "Net Kar"]} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* KDV summary table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">KDV Ozeti</CardTitle>
          </CardHeader>
          <CardContent>
            {data.vatSummary.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ay</TableHead>
                    <TableHead className="text-right">Gelir</TableHead>
                    <TableHead className="text-right">KDV Tutari</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.vatSummary.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{formatTL(row.income)}</TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {formatTL(row.vatAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Annual tax estimate and profit margin */}
        <div className="space-y-4">
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">
                Yillik Tahmini Vergi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{formatTL(data.annualTaxEstimate)}</p>
              <p className="mt-1 text-xs text-orange-500">
                Tahmini vergi tutari (gelir vergisi + KDV)
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">
                Brut Kar Marji
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                %{data.grossProfitMargin.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-blue-500">
                (Gelir - Gider) / Gelir x 100
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4 - Musteri Analizi
// ---------------------------------------------------------------------------

function CustomerTab({ year, active }: { year: number; active: boolean }) {
  const { data, loading, error, refetch } = useTabData<CustomerData>(
    `/api/reports?type=customer-analytics&year=${year}`,
    active
  );

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Hasta Basina Ortalama Gelir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {formatTL(data.averageRevenuePerPatient)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700">
              Sadakat Orani
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600" />
              <p className="text-2xl font-bold text-indigo-600">
                %{data.loyaltyRate.toFixed(1)}
              </p>
            </div>
            <p className="mt-1 text-xs text-indigo-500">Tekrar gelen hasta orani</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly new patients chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aylik Yeni Hasta Sayisi</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyNewPatients.length === 0 ? (
            <p className="text-sm text-gray-500">Veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyNewPatients}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip formatter={(value) => [Number(value), "Yeni Hasta"]} />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Yeni Hasta" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top 10 patients table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">En Degerli 10 Hasta</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topPatients.length === 0 ? (
            <p className="text-sm text-gray-500">Henuz veri yok</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Hasta Adi</TableHead>
                  <TableHead className="text-right">Toplam Gelir</TableHead>
                  <TableHead className="text-right">Ziyaret Sayisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topPatients.map((patient, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant={i < 3 ? "default" : "secondary"}>{i + 1}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatTL(patient.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right">{patient.visitCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 5 - Calisan & Prim (Pro)
// ---------------------------------------------------------------------------

function EmployeeTab({ year, active }: { year: number; active: boolean }) {
  const { data, loading, error, refetch } = useTabData<EmployeeData>(
    `/api/reports?type=employee-performance&year=${year}`,
    active
  );

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Pro badge */}
      <div className="flex items-center gap-2">
        <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          Pro
        </Badge>
        <span className="text-sm text-gray-500">Calisan performans ve prim yonetimi</span>
      </div>

      {/* Employee performance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calisan Performansi</CardTitle>
        </CardHeader>
        <CardContent>
          {data.employees.length === 0 ? (
            <p className="text-sm text-gray-500">Henuz calisan verisi yok</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Calisan</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Toplam Gelir</TableHead>
                  <TableHead className="text-right">Prim</TableHead>
                  <TableHead className="text-right">Islem Sayisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.employees.map((emp, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{emp.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatTL(emp.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">
                      {formatTL(emp.commission)}
                    </TableCell>
                    <TableCell className="text-right">{emp.treatmentCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employee revenue bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calisan Bazinda Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueChart.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.revenueChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `${v.toLocaleString("tr-TR")}`} />
                  <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                  <Tooltip formatter={(value) => [formatTL(Number(value)), "Gelir"]} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly commission report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aylik Prim Raporu</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyCommission.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.monthlyCommission}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${v.toLocaleString("tr-TR")}`} />
                  <Tooltip formatter={(value) => [formatTL(Number(value)), "Prim"]} />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("income");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  function handleDownloadPdf() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    fetch(`/api/reports?type=profit-loss&year=${selectedYear}`)
      .then((res) => res.json())
      .then((data: ProfitLossData) => {
        const html = buildPdfHtml(data, selectedYear);
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      })
      .catch(() => {
        printWindow.document.write(
          "<p style='padding:40px;color:#dc2626'>Rapor olusturulamadi. Lutfen tekrar deneyin.</p>"
        );
        printWindow.document.close();
      });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Raporlar</h1>
            <p className="text-sm text-gray-500">Klinik performans analizi ve finansal raporlar</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* PDF download */}
          <Button onClick={handleDownloadPdf} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            PDF Indir
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="income" className="gap-1.5 text-xs sm:text-sm">
            <DollarSign className="hidden h-4 w-4 sm:inline" />
            Gelir Analizi
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-1.5 text-xs sm:text-sm">
            <TrendingDown className="hidden h-4 w-4 sm:inline" />
            Gider Analizi
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="hidden h-4 w-4 sm:inline" />
            Kar-Zarar
          </TabsTrigger>
          <TabsTrigger value="customer" className="gap-1.5 text-xs sm:text-sm">
            <Users className="hidden h-4 w-4 sm:inline" />
            Musteri Analizi
          </TabsTrigger>
          <TabsTrigger value="employee" className="gap-1.5 text-xs sm:text-sm">
            <Briefcase className="hidden h-4 w-4 sm:inline" />
            Calisan & Prim
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <IncomeTab year={selectedYear} active={activeTab === "income"} />
        </TabsContent>

        <TabsContent value="expense">
          <ExpenseTab year={selectedYear} active={activeTab === "expense"} />
        </TabsContent>

        <TabsContent value="profit-loss">
          <ProfitLossTab year={selectedYear} active={activeTab === "profit-loss"} />
        </TabsContent>

        <TabsContent value="customer">
          <CustomerTab year={selectedYear} active={activeTab === "customer"} />
        </TabsContent>

        <TabsContent value="employee">
          <EmployeeTab year={selectedYear} active={activeTab === "employee"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
