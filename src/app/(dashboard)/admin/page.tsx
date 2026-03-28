"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, Building2, Activity, LogIn, Shield, UserPlus, BarChart3,
  UserX, Zap, TrendingUp, Eye, DollarSign, Calendar, Package,
  CreditCard, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from "recharts";

/* ──────────── Types ──────────── */

interface Stats {
  totalUsers: number;
  activeUsers: number;
  passiveUsers: number;
  totalClinics: number;
  todayLogins: number;
  totalPatients: number;
  totalEmployees: number;
  totalAppointments: number;
  totalTreatments: number;
  newUsersLast30d: number;
  newClinicsLast30d: number;
  newPatientsLast30d: number;
  newEmployeesLast30d: number;
  avgEmployeesPerClinic: number;
  avgPatientsPerClinic: number;
  treatmentRevenueTotal: number;
  treatmentCount30d: number;
  sectors: { sector: string; count: number }[];
  subscriptions: { status: string; count: number }[];
  topModulesPurchased: { name: string; count: number }[];
  payments: { method: string; count: number; total: number }[];
  appointmentStatusData: { status: string; count: number }[];
  topModules: { module: string; views: number; uniqueUsers: number; avgPerUser: number }[];
  userAnalytics: { userId: string; name: string; email: string; total: number; modules: { module: string; count: number }[] }[];
  loginChart: { date: string; logins: number; uniqueUsers: number }[];
}

/* ──────────── Constants ──────────── */

const MODULE_LABELS: Record<string, string> = {
  "/dashboard": "Genel Bakış", "/patients": "Müşteriler", "/appointments": "Randevular",
  "/finance": "Finans", "/inventory": "Stok/Envanter", "/employees": "Çalışanlar",
  "/hr": "Belgeler", "/marketing": "Pazarlama", "/messaging": "Mesajlaşma",
  "/ai-assistant": "AI Asistan", "/reports": "Raporlar", "/alarmlar": "Alarmlar",
  "/reminders": "Hatırlatmalar", "/billing": "Abonelik", "/settings": "Ayarlar",
  "/admin": "Admin", "/ads": "Reklamlar", "/whatsapp": "WhatsApp",
  "/social-media": "Sosyal Medya", "/invoices": "Faturalar",
};

const COLORS = [
  "#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6",
  "#8B5CF6", "#EF4444", "#14B8A6", "#F97316", "#06B6D4",
  "#84CC16", "#D946EF",
];

const SUB_LABELS: Record<string, string> = {
  trial: "Deneme", active: "Aktif", suspended: "Askıda", cancelled: "İptal",
};

const fmtTL = (v: number) => v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₺";

/* ──────────── Stat Card ──────────── */

function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
  trend?: { value: number; label: string };
}) {
  const bg: Record<string, string> = {
    blue: "bg-[#EEF2FF]", green: "bg-green-50", red: "bg-red-50",
    purple: "bg-purple-50", orange: "bg-orange-50", pink: "bg-pink-50",
    teal: "bg-teal-50", yellow: "bg-yellow-50",
  };
  const ic: Record<string, string> = {
    blue: "text-[#6366F1]", green: "text-green-600", red: "text-red-500",
    purple: "text-purple-600", orange: "text-orange-600", pink: "text-pink-600",
    teal: "text-teal-600", yellow: "text-yellow-600",
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg ${bg[color]} p-2.5`}>
          <Icon className={`h-4 w-4 ${ic[color]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend.value >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend.value >= 0 ? "+" : ""}{trend.value} {trend.label}
          </div>
        )}
      </div>
      {sub && <p className="mt-1 text-[11px] text-gray-400 pl-11">{sub}</p>}
    </div>
  );
}

/* ──────────── Page ──────────── */

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => { if (r.status === 403) { router.push("/dashboard"); return null; } return r.json(); })
      .then((d) => { if (d) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[...Array(10)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />)}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (!stats) return null;

  const s = stats;
  const totalModuleViews = s.topModules.reduce((a, m) => a + m.views, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-[#6366F1]" />
            Admin Panel
          </h2>
          <p className="mt-1 text-sm text-gray-500">Platform istatistikleri ve kullanıcı analizi</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users" className="flex items-center gap-2 rounded-xl bg-[#6366F1] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4F46E5]">
            <UserPlus className="h-4 w-4" /> Kullanıcılar
          </Link>
          <Link href="/admin/activity" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <BarChart3 className="h-4 w-4" /> Aktivite
          </Link>
        </div>
      </div>

      {/* ── Row 1: Ana Metrikler ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Toplam Kullanıcı" value={s.totalUsers} icon={Users} color="blue"
          trend={{ value: s.newUsersLast30d, label: "30g" }} />
        <StatCard label="Aktif (24s)" value={s.activeUsers} icon={Zap} color="green" />
        <StatCard label="Pasif (7+ gün)" value={s.passiveUsers} icon={UserX} color="red" />
        <StatCard label="Toplam Klinik" value={s.totalClinics} icon={Building2} color="purple"
          trend={{ value: s.newClinicsLast30d, label: "30g" }} />
        <StatCard label="Bugün Giriş" value={s.todayLogins} icon={LogIn} color="orange" />
      </div>

      {/* ── Row 2: İşletme Metrikleri ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Toplam Müşteri" value={s.totalPatients} icon={Users} color="teal"
          sub={`Ort. ${s.avgPatientsPerClinic}/klinik`}
          trend={{ value: s.newPatientsLast30d, label: "30g" }} />
        <StatCard label="Toplam Çalışan" value={s.totalEmployees} icon={UserPlus} color="pink"
          sub={`Ort. ${s.avgEmployeesPerClinic}/klinik`}
          trend={{ value: s.newEmployeesLast30d, label: "30g" }} />
        <StatCard label="Toplam Randevu" value={s.totalAppointments} icon={Calendar} color="purple" />
        <StatCard label="Tedavi (30g)" value={s.treatmentCount30d} icon={Package} color="blue"
          sub={`Toplam ${fmtTL(s.treatmentRevenueTotal)}`} />
        <StatCard label="Tedavi Geliri (30g)" value={fmtTL(s.treatmentRevenueTotal)} icon={DollarSign} color="green" />
      </div>

      {/* ── Row 3: Giriş Trendi + Sektör Dağılımı ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Giriş Trendi */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Günlük Giriş Trendi</h3>
            <span className="ml-auto text-xs text-gray-400">Son 14 gün</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={s.loginChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="uniqueUsers" stroke="#6366F1" fill="#EEF2FF" name="Tekil Kullanıcı" />
              <Area type="monotone" dataKey="logins" stroke="#10B981" fill="#ECFDF5" name="Giriş Sayısı" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Sektör Dağılımı */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Sektör Dağılımı</h3>
          </div>
          {s.sectors.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="45%" height={200}>
                <PieChart>
                  <Pie data={s.sectors.map((sec) => ({ name: sec.sector, value: sec.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value">
                    {s.sectors.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {s.sectors.map((sec, i) => (
                  <div key={sec.sector} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="flex-1 text-gray-700">{sec.sector || "Belirtilmemiş"}</span>
                    <span className="font-semibold text-gray-900">{sec.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">Veri yok</p>}
        </motion.div>
      </div>

      {/* ── Row 4: Modül Satın Alma + Abonelik Durumu + Ödeme Yöntemi ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* En Çok Satın Alınan Modüller */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Modül Satın Alma</h3>
          </div>
          <div className="space-y-2.5">
            {s.topModulesPurchased.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Veri yok</p>
            ) : s.topModulesPurchased.map((m, i) => {
              const max = s.topModulesPurchased[0]?.count || 1;
              return (
                <div key={m.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{m.name}</span>
                    <span className="text-gray-500">{m.count} klinik</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(m.count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Abonelik Durumları */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Abonelik Durumu</h3>
          </div>
          {s.subscriptions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Veri yok</p>
          ) : (
            <div className="space-y-3">
              {s.subscriptions.map((sub) => {
                const total = s.subscriptions.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? Math.round((sub.count / total) * 100) : 0;
                const statusColor: Record<string, string> = { trial: "#F59E0B", active: "#10B981", suspended: "#EF4444", cancelled: "#6B7280" };
                return (
                  <div key={sub.status} className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColor[sub.status] || "#6B7280" }} />
                    <span className="flex-1 text-sm text-gray-700">{SUB_LABELS[sub.status] || sub.status}</span>
                    <span className="text-sm font-bold text-gray-900">{sub.count}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Randevu durumu */}
          {s.appointmentStatusData.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-3">Randevu Durumları (30g)</p>
              {s.appointmentStatusData.map((a) => (
                <div key={a.status} className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-600">{a.status}</span>
                  <span className="font-semibold text-gray-900">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Ödeme Yöntemleri */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Ödeme Yöntemleri</h3>
          </div>
          {s.payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Veri yok</p>
          ) : (
            <div className="space-y-3">
              {s.payments.map((p, i) => (
                <div key={p.method} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">{p.method}</p>
                    <p className="text-[11px] text-gray-400">{p.count} işlem</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{fmtTL(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Row 5: Modül Kullanım + Kullanıcı Aktivitesi ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Modül Kullanım Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-[#6366F1]" />
            <h3 className="text-sm font-semibold text-gray-900">Modül Kullanımı</h3>
            <span className="ml-auto text-xs text-gray-400">Son 30 gün</span>
          </div>
          {s.topModules.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={s.topModules.slice(0, 10).map((m) => ({ name: MODULE_LABELS[m.module] || m.module, views: m.views, users: m.uniqueUsers }))} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="views" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={14} name="Görüntüleme" />
                </BarChart>
              </ResponsiveContainer>
              {/* Modül detay tablosu */}
              <div className="mt-4 border-t border-gray-100 pt-3 space-y-1.5 max-h-48 overflow-y-auto">
                {s.topModules.map((m, i) => {
                  const pct = totalModuleViews > 0 ? Math.round((m.views / totalModuleViews) * 100) : 0;
                  return (
                    <div key={m.module} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 text-gray-600">{MODULE_LABELS[m.module] || m.module}</span>
                      <span className="text-gray-500">{m.uniqueUsers} kişi</span>
                      <span className="font-medium text-gray-400">ort.{m.avgPerUser}</span>
                      <span className="font-semibold text-gray-800 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <p className="text-sm text-gray-400 text-center py-12">Veri yok</p>}
        </motion.div>

        {/* Kullanıcı Aktivitesi */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-gray-100 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <Eye className="h-4 w-4 text-[#6366F1]" />
            <h3 className="font-semibold text-gray-900">Kullanıcı Aktivitesi</h3>
            <span className="ml-auto text-xs text-gray-400">Son 30 gün</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {s.userAnalytics.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">Veri yok</p>
            ) : s.userAnalytics.slice(0, 30).map((ua) => (
              <button
                key={ua.userId}
                onClick={() => setSelectedUser(selectedUser === ua.userId ? null : ua.userId)}
                className="w-full text-left px-6 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ua.name || "İsimsiz"}</p>
                    <p className="text-xs text-gray-400">{ua.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#6366F1]">{ua.total}</p>
                    <p className="text-[10px] text-gray-400">sayfa</p>
                  </div>
                </div>
                {selectedUser === ua.userId && (
                  <div className="mt-3 space-y-1.5 rounded-lg bg-gray-50 p-3">
                    {ua.modules.map((m, j) => (
                      <div key={m.module} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[j % COLORS.length] }} />
                          <span className="text-gray-600">{MODULE_LABELS[m.module] || m.module}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{m.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
