"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { StockSummary, getCategoryLabel, CATEGORY_PIE_COLORS } from "./constants";

export default function ReportTab() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await fetch("/api/stock/summary");
        if (!res.ok) throw new Error("Rapor verileri alınamadı");
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) return <p className="text-gray-500">Yükleniyor...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!summary) return null;

  const pieData = summary.categoryDistribution.map((cd) => ({
    name: getCategoryLabel(cd.category),
    value: cd.count,
    fill: CATEGORY_PIE_COLORS[cd.category] || CATEGORY_PIE_COLORS.DIGER,
  }));

  const barData = [
    { name: "Giriş", value: summary.recentMovements.in, fill: "#22c55e" },
    { name: "Çıkış", value: summary.recentMovements.out, fill: "#ef4444" },
  ];

  const estimatedProfit = summary.totalStockValue.sale - summary.totalStockValue.purchase;

  return (
    <div className="space-y-6">
      {/* Financial summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-lg">📦</span>
            <p className="text-sm font-medium text-blue-700">Stok Maliyeti</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.totalStockValue.purchase)}</p>
          <p className="mt-1 text-xs text-blue-500">{summary.trackedCount} ürünün maliyet toplamı</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-lg">💰</span>
            <p className="text-sm font-medium text-emerald-700">Tahmini Satış Geliri</p>
          </div>
          <p className="text-2xl font-bold text-emerald-900">{formatCurrency(summary.totalStockValue.sale)}</p>
          <p className="mt-1 text-xs text-emerald-500">Tüm stoklar satılırsa</p>
        </div>
        <div className={`rounded-2xl border p-5 ${estimatedProfit >= 0 ? "border-purple-100 bg-gradient-to-br from-purple-50 to-white" : "border-red-100 bg-gradient-to-br from-red-50 to-white"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${estimatedProfit >= 0 ? "bg-purple-100" : "bg-red-100"}`}>📈</span>
            <p className={`text-sm font-medium ${estimatedProfit >= 0 ? "text-purple-700" : "text-red-700"}`}>Tahmini Kar</p>
          </div>
          <p className={`text-2xl font-bold ${estimatedProfit >= 0 ? "text-purple-900" : "text-red-900"}`}>{formatCurrency(estimatedProfit)}</p>
          <p className={`mt-1 text-xs ${estimatedProfit >= 0 ? "text-purple-500" : "text-red-500"}`}>Satış Geliri - Maliyet</p>
        </div>
      </div>

      {/* Count cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Toplam Ürün</p>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Stok Takip Edilen</p>
            <p className="text-2xl font-bold text-blue-600">{summary.trackedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Stok Takip Edilmeyen</p>
            <p className="text-2xl font-bold text-gray-400">{summary.untrackedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Düşük Stok</p>
            <p className={`text-2xl font-bold ${summary.lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kategori Dağılımı</CardTitle>
            <CardDescription>Ürün kategorilerine göre dağılım</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="name">
                    {pieData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son 30 Gün Hareketler</CardTitle>
            <CardDescription>Giriş ve çıkış hareketleri</CardDescription>
          </CardHeader>
          <CardContent>
            {barData.every((d) => d.value === 0) ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En Çok Tüketilen Ürünler</CardTitle>
          <CardDescription>Son 30 günde en çok çıkış yapılan ürünler</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.topConsumed.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz veri bulunmuyor</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sıra</TableHead>
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead className="text-right">Toplam Çıkış Miktarı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.topConsumed.map((item, index) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right font-medium">{item.totalOut}</TableCell>
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
