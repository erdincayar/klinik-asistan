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
  TrendingUp,
  Users,
  Eye,
  BarChart3,
  Zap,
} from "lucide-react";
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
  AreaChart,
  Area,
} from "recharts";

/* ──────────── Types ──────────── */

interface LogItem {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface ModuleAnalytics {
  module: string;
  views: number;
  uniqueUsers: number;
  avgPerUser: number;
}

interface ActionStat {
  action: string;
  count: number;
}

interface DailyChart {
  date: string;
  total: number;
  pageViews: number;
  actions: number;
}

/* ──────────── Constants ──────────── */

const MODULE_LABELS: Record<string, string> = {
  "/dashboard": "Genel Bakış",
  "/patients": "Müşteriler",
  "/appointments": "Randevular",
  "/finance": "Finans",
  "/inventory": "Stok/Envanter",
  "/employees": "Çalışanlar",
  "/hr": "Belgeler",
  "/marketing": "Pazarlama",
  "/messaging": "Mesajlaşma",
  "/ai-assistant": "AI Asistan",
  "/reports": "Raporlar",
  "/alarmlar": "Alarmlar",
  "/reminders": "Hatırlatmalar",
  "/billing": "Abonelik",
  "/settings": "Ayarlar",
  "/admin": "Admin",
  "/ads": "Reklamlar",
  "/whatsapp": "WhatsApp",
  "/social-media": "Sosyal Medya",
  "/invoices": "Faturalar",
};

const PIE_COLORS = [
  "#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6",
  "#8B5CF6", "#EF4444", "#14B8A6", "#F97316", "#06B6D4",
  "#84CC16", "#D946EF",
];

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
  PAGE_VIEW: "Sayfa Görüntüleme",
};

const actionColors: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  PATIENT_CREATE: "bg-[#E0E7FF] text-[#4F46E5]",
  PATIENT_UPDATE: "bg-[#E0E7FF] text-[#4F46E5]",
  APPOINTMENT_CREATE: "bg-purple-100 text-purple-700",
  APPOINTMENT_UPDATE: "bg-purple-100 text-purple-700",
  USER_CREATE: "bg-red-100 text-red-700",
  USER_UPDATE: "bg-red-100 text-red-700",
  INVOICE_CREATE: "bg-yellow-100 text-yellow-700",
  INVOICE_UPLOAD: "bg-yellow-100 text-yellow-700",
  PAGE_VIEW: "bg-blue-50 text-blue-600",
};

/* ──────────── Custom Tooltip ──────────── */

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-900">{d.name}</p>
      <p className="text-gray-500">{d.value} görüntüleme ({d.payload.pct}%)</p>
      <p className="text-xs text-gray-400">{d.payload.uniqueUsers} kullanıcı · ort. {d.payload.avgPerUser}/kişi</p>
    </div>
  );
}

/* ──────────── Page ──────────── */

export default function AdminActivityPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [moduleAnalytics, setModuleAnalytics] = useState<ModuleAnalytics[]>([]);
  const [actionStats, setActionStats] = useState<ActionStat[]>([]);
  const [dailyChart, setDailyChart] = useState<DailyChart[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
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
      setModuleAnalytics(data.moduleAnalytics || []);
      setActionStats(data.actions || []);
      setDailyChart(data.dailyChart || []);
      setTotalUsersCount(data.totalUsers || 0);
    } catch {
      console.error("Activity fetch error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const totalPages = Math.ceil(total / limit);

  // Pie chart data
  const totalModuleViews = moduleAnalytics.reduce((s, m) => s + m.views, 0);
  const pieData = moduleAnalytics.slice(0, 10).map((m) => ({
    name: MODULE_LABELS[m.module] || m.module,
    value: m.views,
    pct: totalModuleViews > 0 ? Math.round((m.views / totalModuleViews) * 100) : 0,
    uniqueUsers: m.uniqueUsers,
    avgPerUser: m.avgPerUser,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Activity className="h-6 w-6 text-[#6366F1]" />
          Aktivite Logları & Analiz
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Toplam {total} aktivite kaydı · {totalUsersCount} kullanıcı
        </p>
      </div>

      {/* ── Top Row: Daily Chart + Module Pie ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Günlük Aktivite Trendi */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-100 bg-white p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Son 7 Gün Aktivite</h3>
          </div>
          {dailyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v: any, name: any) => [v, name === "actions" ? "İşlemler" : name === "pageViews" ? "Sayfa Görüntüleme" : "Toplam"]}
                />
                <Area type="monotone" dataKey="pageViews" stackId="1" stroke="#6366F1" fill="#EEF2FF" name="pageViews" />
                <Area type="monotone" dataKey="actions" stackId="1" stroke="#10B981" fill="#ECFDF5" name="actions" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Henüz veri yok</p>
          )}
        </motion.div>

        {/* Modül Kullanım Oranları (Pie Chart) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-gray-100 bg-white p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Modül Kullanım Oranları</h3>
            <span className="ml-auto text-xs text-gray-400">Kullanıcı ortalaması</span>
          </div>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 max-h-[220px] overflow-y-auto">
                {pieData.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="flex-1 text-gray-700 truncate">{m.name}</span>
                    <span className="font-semibold text-gray-900">{m.pct}%</span>
                    <span className="text-gray-400 w-14 text-right">{m.avgPerUser}/kişi</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Henüz veri yok</p>
          )}
        </motion.div>
      </div>

      {/* ── Middle Row: Module Bar Chart + Action Breakdown ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Modül Bazlı Görüntüleme */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-gray-100 bg-white p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Modül Bazlı Görüntüleme</h3>
            <span className="ml-auto text-xs text-gray-400">Son 30 gün</span>
          </div>
          {moduleAnalytics.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={moduleAnalytics.slice(0, 10).map((m) => ({
                  name: MODULE_LABELS[m.module] || m.module,
                  views: m.views,
                  users: m.uniqueUsers,
                }))}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v: any, name: any) => [v, name === "views" ? "Görüntüleme" : "Kullanıcı"]}
                />
                <Bar dataKey="views" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Henüz veri yok</p>
          )}
        </motion.div>

        {/* İşlem Dağılımı */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-gray-100 bg-white p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">İşlem Dağılımı</h3>
            <span className="ml-auto text-xs text-gray-400">Son 30 gün · PAGE_VIEW hariç</span>
          </div>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
            {actionStats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">Henüz veri yok</p>
            ) : (
              actionStats.map((a, i) => {
                const maxCount = actionStats[0]?.count || 1;
                const pct = (a.count / maxCount) * 100;
                return (
                  <div key={a.action} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">
                        {actionLabels[a.action] || a.action}
                      </span>
                      <span className="text-gray-500">{a.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Modül Detay Tablosu ── */}
      {moduleAnalytics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <Users className="h-4 w-4 text-[#6366F1]" />
            <h3 className="font-semibold text-gray-900">Modül Detay Tablosu</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">Modül</th>
                  <th className="px-6 py-3 text-right">Toplam Görüntüleme</th>
                  <th className="px-6 py-3 text-right">Tekil Kullanıcı</th>
                  <th className="px-6 py-3 text-right">Ort. / Kullanıcı</th>
                  <th className="px-6 py-3 text-right">Oran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {moduleAnalytics.map((m, i) => {
                  const pct = totalModuleViews > 0 ? Math.round((m.views / totalModuleViews) * 100) : 0;
                  return (
                    <tr key={m.module} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {MODULE_LABELS[m.module] || m.module}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        {m.views}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-600">
                        {m.uniqueUsers}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-600">
                        {m.avgPerUser}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── Filter + Activity Log Table ── */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20"
          >
            <option value="">Tüm Aktiviteler</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl border border-gray-100 bg-white"
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
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">{log.user?.name || "-"}</p>
                      <p className="text-xs text-gray-400">{log.user?.email || ""}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-700"}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-xs text-gray-400">
                      {log.action === "PAGE_VIEW" && log.details
                        ? MODULE_LABELS[(log.details as any).page?.split("/").filter(Boolean)[0] ? "/" + (log.details as any).page.split("/").filter(Boolean)[0] : ""] || (log.details as any).page
                        : log.details ? JSON.stringify(log.details) : "-"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                      Aktivite kaydı bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-sm text-gray-500">Sayfa {page} / {totalPages}</p>
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
