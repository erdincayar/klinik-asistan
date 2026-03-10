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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Toplam Ürün</p>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Aktif Ürün</p>
            <p className="text-2xl font-bold text-blue-600">{summary.activeProducts}</p>
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
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Toplam Stok Değeri</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalStockValue.purchase)}</p>
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
