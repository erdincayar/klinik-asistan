"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, Package } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { APPOINTMENT_STATUSES, TREATMENT_CATEGORIES } from "@/lib/types";
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

interface TodayAppointment {
  id: string;
  patientName: string;
  startTime: string;
  endTime: string;
  treatmentType: string;
  status: string;
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
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const [dashRes, chartRes, apptRes, lowStockRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch(`/api/finance?type=monthly-summary&year=${new Date().getFullYear()}`),
          fetch(`/api/appointments?date=${todayStr}`),
          fetch("/api/products/low-stock"),
        ]);

        if (!dashRes.ok) throw new Error("Dashboard verisi alınamadı");
        const dashData = await dashRes.json();
        setData(dashData);

        if (chartRes.ok) {
          const chartJson = await chartRes.json();
          setChartData(chartJson.months || []);
        }

        if (apptRes.ok) {
          const apptData = await apptRes.json();
          setTodayAppointments(apptData.appointments || apptData || []);
        }

        if (lowStockRes.ok) {
          const lowStockData = await lowStockRes.json();
          setLowStockCount(Array.isArray(lowStockData) ? lowStockData.length : 0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-gray-500">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!data) return null;

  const statCards = [
    {
      title: "Aylık Gelir",
      value: formatCurrency(data.monthlyIncome),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Aylık Gider",
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

      {/* Low Stock Warning */}
      <Link href="/inventory">
        <Card className={cn(
          "cursor-pointer transition-colors hover:shadow-md",
          lowStockCount > 0 ? "border-orange-300 bg-orange-50" : "border-green-300 bg-green-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-full p-2",
                lowStockCount > 0 ? "bg-orange-100" : "bg-green-100"
              )}>
                <Package className={cn(
                  "h-5 w-5",
                  lowStockCount > 0 ? "text-orange-600" : "text-green-600"
                )} />
              </div>
              <div>
                <p className={cn(
                  "text-sm font-semibold",
                  lowStockCount > 0 ? "text-orange-800" : "text-green-800"
                )}>
                  {lowStockCount > 0
                    ? `${lowStockCount} urun dusuk stokta`
                    : "Stok seviyeleri normal"}
                </p>
                <p className={cn(
                  "text-xs",
                  lowStockCount > 0 ? "text-orange-600" : "text-green-600"
                )}>
                  {lowStockCount > 0 ? "Stok sayfasina gitmek icin tiklayin" : "Tum urunler yeterli stokta"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Bugünün Randevuları
            </CardTitle>
            <CardDescription>
              {todayAppointments.length > 0
                ? `${todayAppointments.length} randevu`
                : ""}
            </CardDescription>
          </div>
          <Link href="/appointments">
            <Button variant="outline" size="sm">
              Tümünü Gör
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-gray-500">Bugün randevu yok</p>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((appt) => {
                const statusInfo = APPOINTMENT_STATUSES.find(
                  (s) => s.value === appt.status
                ) || APPOINTMENT_STATUSES[0];
                const treatmentLabel =
                  TREATMENT_CATEGORIES.find((t) => t.value === appt.treatmentType)
                    ?.label || appt.treatmentType;

                return (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">
                        {appt.startTime}
                      </span>
                      <span className="font-medium text-gray-900">
                        {appt.patientName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-700">
                        {treatmentLabel}
                      </Badge>
                      <Badge className={cn(statusInfo.color)}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Treatments */}
        <Card>
          <CardHeader>
            <CardTitle>Son İşlemler</CardTitle>
            <CardDescription>Son 5 tedavi işlemi</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentTreatments.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz işlem yok</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hasta</TableHead>
                    <TableHead>İşlem</TableHead>
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
            <CardTitle>Aylık Gelir</CardTitle>
            <CardDescription>{new Date().getFullYear()} yılı aylık gelir grafiği</CardDescription>
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
