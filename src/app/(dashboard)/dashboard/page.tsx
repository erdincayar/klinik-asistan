"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  monthlyIncome: number;
  monthlyExpense: number;
  netProfit: number;
  totalPatients: number;
  recentTreatments: {
    id: string;
    patientName: string;
    name: string;
    amount: number;
    date: string;
  }[];
}

interface MonthlySummary {
  month: number;
  monthName: string;
  income: number;
  expense: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, chartRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch(`/api/finance?type=monthly-summary&year=${new Date().getFullYear()}`),
        ]);

        if (!dashRes.ok) throw new Error("Dashboard verisi alinamadi");
        const dashData = await dashRes.json();
        setData(dashData);

        if (chartRes.ok) {
          const chartJson = await chartRes.json();
          setChartData(chartJson.months || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata olustu");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-gray-500">Yukleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!data) return null;

  const statCards = [
    {
      title: "Aylik Gelir",
      value: formatCurrency(data.monthlyIncome),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Aylik Gider",
      value: formatCurrency(data.monthlyExpense),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Net Kar",
      value: formatCurrency(data.netProfit),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Toplam Hasta",
      value: data.totalPatients.toString(),
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-full p-3 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Treatments */}
        <Card>
          <CardHeader>
            <CardTitle>Son Islemler</CardTitle>
            <CardDescription>Son 5 tedavi islemi</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentTreatments.length === 0 ? (
              <p className="text-sm text-gray-500">Henuz islem yok</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Islem</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTreatments.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.patientName}
                      </TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{formatCurrency(t.amount)}</TableCell>
                      <TableCell>{formatDate(t.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aylik Gelir</CardTitle>
            <CardDescription>{new Date().getFullYear()} yili aylik gelir grafigi</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-500">Grafik verisi yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => `${(v / 100).toLocaleString("tr-TR")} TL`}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      formatCurrency(Number(value)),
                      "Gelir",
                    ]}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
