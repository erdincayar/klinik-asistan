"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LogItem {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  LOGIN: "Giriş",
  LOGOUT: "Çıkış",
  PATIENT_CREATE: "Müşteri Ekleme",
  PATIENT_UPDATE: "Müşteri Güncelleme",
  APPOINTMENT_CREATE: "Randevu Oluşturma",
  APPOINTMENT_UPDATE: "Randevu Güncelleme",
  TREATMENT_CREATE: "Tedavi Kaydı",
  EXPENSE_CREATE: "Gider Kaydı",
  INVOICE_CREATE: "Fatura Oluşturma",
  INVOICE_UPLOAD: "Fatura Yükleme",
  SETTINGS_UPDATE: "Ayar Güncelleme",
  USER_CREATE: "Kullanıcı Oluşturma",
  USER_UPDATE: "Kullanıcı Güncelleme",
  TELEGRAM_CONNECT: "Telegram Bağlantı",
  PHOTO_UPLOAD: "Fotoğraf Yükleme",
  POST_SCHEDULE: "Paylaşım Planlama",
};

const actionColors: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  PATIENT_CREATE: "bg-blue-100 text-blue-700",
  PATIENT_UPDATE: "bg-blue-100 text-blue-700",
  APPOINTMENT_CREATE: "bg-purple-100 text-purple-700",
  APPOINTMENT_UPDATE: "bg-purple-100 text-purple-700",
  USER_CREATE: "bg-red-100 text-red-700",
  USER_UPDATE: "bg-red-100 text-red-700",
  INVOICE_CREATE: "bg-yellow-100 text-yellow-700",
  INVOICE_UPLOAD: "bg-yellow-100 text-yellow-700",
};

export default function AdminActivityPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 30;

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/admin/activity?${params}`);
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Activity fetch error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  // Aggregate action counts for chart
  const actionCounts: Record<string, number> = {};
  logs.forEach((log) => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });
  const chartData = Object.entries(actionCounts)
    .map(([action, count]) => ({
      action: actionLabels[action] || action,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Activity className="h-6 w-6 text-blue-600" />
          Aktivite Logları
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Toplam {total} aktivite kaydı
        </p>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-100 bg-white p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Aktivite Dağılımı (Bu Sayfa)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="action"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Tüm Aktiviteler</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-gray-100 bg-white"
      >
        {loading ? (
          <div className="space-y-4 p-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">Tarih</th>
                  <th className="px-6 py-3">Kullanıcı</th>
                  <th className="px-6 py-3">Aktivite</th>
                  <th className="px-6 py-3">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(log.createdAt).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.user?.name || "-"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {log.user?.email || ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          actionColors[log.action] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-xs text-gray-400">
                      {log.details ? JSON.stringify(log.details) : "-"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-sm text-gray-400"
                    >
                      Aktivite kaydı bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-sm text-gray-500">
              Sayfa {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
