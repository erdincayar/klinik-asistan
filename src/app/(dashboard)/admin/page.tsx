"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, Building2, LogIn, Shield, UserPlus, BarChart3,
  UserX, Zap, TrendingUp, Eye, DollarSign, Calendar, Package,
  CreditCard, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle,
  CheckCircle, XCircle, Search, ChevronDown, Timer, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

/* ──────────── Types ──────────── */

interface UserItem {
  id: string; name: string; email: string; role: string;
  isActive: boolean; isDemo: boolean;
  lastLoginAt: string | null; createdAt: string;
  clinicId: string | null; clinicName: string | null;
  clinicPlan: string | null; sector: string | null;
  subStatus: string; trialEnd: string | null;
  daysLeft: number | null; displayStatus: string;
  monthlyTotal: number;
}

interface PaymentItem {
  id: string; date: string; userName: string; userEmail: string;
  amount: number; status: string; method: string; ref: string | null;
}

interface Stats {
  totalUsers: number; activeUsers: number; activeUsersLast7d: number;
  passiveUsers: number; totalClinics: number; todayLogins: number;
  totalPatients: number; totalEmployees: number;
  totalAppointments: number; totalTreatments: number;
  newUsersLast30d: number; newUsersThisWeek: number; newUsersThisMonth: number;
  newClinicsLast30d: number; newPatientsLast30d: number; newEmployeesLast30d: number;
  avgEmployeesPerClinic: number; avgPatientsPerClinic: number;
  treatmentRevenueTotal: number; treatmentCount30d: number;
  sectors: { sector: string; count: number }[];
  subscriptions: { status: string; count: number }[];
  topModulesPurchased: { name: string; count: number }[];
  payments: { method: string; count: number; total: number }[];
  appointmentStatusData: { status: string; count: number }[];
  topModules: { module: string; views: number; uniqueUsers: number; avgPerUser: number }[];
  userAnalytics: { userId: string; name: string; email: string; total: number; modules: { module: string; count: number }[] }[];
  loginChart: { date: string; logins: number; uniqueUsers: number }[];
  userList: UserItem[];
  trialActive: number; trialExpired: number; payingUsers: number;
  paymentHistory: PaymentItem[];
  monthlyRevenue: number;
}

/* ──────────── Constants ──────────── */

const MODULE_LABELS: Record<string, string> = {
  "/dashboard": "Genel Bakış", "/patients": "Müşteriler", "/appointments": "Randevular",
  "/finance": "Finans", "/inventory": "Stok/Envanter", "/employees": "Çalışanlar",
  "/hr": "Belgeler", "/marketing": "Pazarlama", "/messaging": "Mesajlaşma",
  "/ai-assistant": "AI Asistan", "/reports": "Raporlar", "/alarmlar": "Alarmlar",
  "/reminders": "Hatırlatmalar", "/billing": "Abonelik", "/settings": "Ayarlar",
  "/admin": "Admin", "/ads": "Reklamlar", "/whatsapp": "WhatsApp",
  "/social-media": "Sosyal Medya", "/invoices": "Faturalar", "/customers": "Müşteriler",
};

const COLORS = [
  "#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6",
  "#8B5CF6", "#EF4444", "#14B8A6", "#F97316", "#06B6D4",
];

const SUB_LABELS: Record<string, string> = {
  trial: "Deneme", active: "Aktif", suspended: "Askıda", cancelled: "İptal",
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700" },
  demo: { label: "Demo", color: "bg-gray-100 text-gray-600" },
  paying: { label: "Ödeme Yapan", color: "bg-emerald-100 text-emerald-700" },
  trial: { label: "Deneme", color: "bg-amber-100 text-amber-700" },
  expired: { label: "Süresi Dolmuş", color: "bg-red-100 text-red-700" },
  suspended: { label: "Askıda", color: "bg-orange-100 text-orange-700" },
  cancelled: { label: "İptal", color: "bg-gray-100 text-gray-500" },
};

const fmtTL = (v: number) => v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₺";
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/* ──────────── Stat Card ──────────── */

function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
  trend?: { value: number; label: string };
}) {
  const bg: Record<string, string> = {
    blue: "bg-[#EEF2FF]", green: "bg-green-50", red: "bg-red-50",
    purple: "bg-purple-50", orange: "bg-orange-50", pink: "bg-pink-50",
    teal: "bg-teal-50", yellow: "bg-yellow-50", amber: "bg-amber-50",
  };
  const ic: Record<string, string> = {
    blue: "text-[#6366F1]", green: "text-green-600", red: "text-red-500",
    purple: "text-purple-600", orange: "text-orange-600", pink: "text-pink-600",
    teal: "text-teal-600", yellow: "text-yellow-600", amber: "text-amber-600",
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
  const [tab, setTab] = useState<"overview" | "users" | "payments">("overview");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedAnalytics, setExpandedAnalytics] = useState<string | null>(null);

  async function fetchStats() {
    try {
      const r = await fetch("/api/admin/stats");
      if (r.status === 403) { router.push("/dashboard"); return; }
      const d = await r.json();
      setStats(d);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchStats(); }, []);

  async function handleManage(body: any) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchStats();
      } else {
        const data = await res.json();
        alert(`Hata: ${data.error}`);
      }
    } catch {} finally { setActionLoading(false); }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[...Array(10)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;
  const s = stats;

  // Filter users
  const filteredUsers = s.userList.filter(u => {
    const matchSearch = !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchFilter = userFilter === "all" || u.displayStatus === userFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-[#6366F1]" />
            Admin Panel
          </h2>
          <p className="mt-1 text-sm text-gray-500">Platform yönetimi ve kullanıcı analizi</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/marketing" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Content Studio
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {[
          { key: "overview", label: "Genel Bakış" },
          { key: "users", label: `Kullanıcılar (${s.totalUsers})` },
          { key: "payments", label: "Ödemeler" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {tab === "overview" && (
        <>
          {/* Row 1: Ana Metrikler */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Toplam Kullanıcı" value={s.totalUsers} icon={Users} color="blue"
              trend={{ value: s.newUsersLast30d, label: "30g" }} />
            <StatCard label="Aktif (7 gün)" value={s.activeUsersLast7d} icon={Zap} color="green" />
            <StatCard label="Denemede" value={s.trialActive} icon={Timer} color="amber" />
            <StatCard label="Süresi Dolmuş" value={s.trialExpired} icon={AlertTriangle} color="red" />
            <StatCard label="Ödeme Yapan" value={s.payingUsers} icon={CheckCircle} color="teal" />
          </div>

          {/* Row 2: İşletme + Gelir */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Toplam Klinik" value={s.totalClinics} icon={Building2} color="purple"
              trend={{ value: s.newClinicsLast30d, label: "30g" }} />
            <StatCard label="Bu Hafta Kayıt" value={s.newUsersThisWeek} icon={UserPlus} color="blue" />
            <StatCard label="Bu Ay Kayıt" value={s.newUsersThisMonth} icon={UserPlus} color="pink" />
            <StatCard label="Bugün Giriş" value={s.todayLogins} icon={LogIn} color="orange" />
            <StatCard label="Bu Ay Gelir" value={fmtTL(s.monthlyRevenue)} icon={DollarSign} color="green" />
          </div>

          {/* Row 3: Giriş Trendi + Sektör */}
          <div className="grid gap-6 lg:grid-cols-2">
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

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-[#6366F1]" />
                <h3 className="text-sm font-semibold text-gray-900">Sektör Dağılımı</h3>
              </div>
              {s.sectors.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="45%" height={200}>
                    <PieChart>
                      <Pie data={s.sectors.map(sec => ({ name: sec.sector, value: sec.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value">
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

          {/* Row 4: Abonelik + Modüller */}
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4 text-[#6366F1]" />
                <h3 className="text-sm font-semibold text-gray-900">Abonelik Durumu</h3>
              </div>
              {s.subscriptions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Veri yok</p>
              ) : (
                <div className="space-y-3">
                  {s.subscriptions.map(sub => {
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
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-[#6366F1]" />
                <h3 className="text-sm font-semibold text-gray-900">Modül Kullanımı</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={s.topModules.slice(0, 8).map(m => ({ name: MODULE_LABELS[m.module] || m.module, views: m.views }))} layout="vertical" margin={{ left: 70 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} width={70} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="views" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={14} name="Görüntüleme" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-4 w-4 text-[#6366F1]" />
                <h3 className="text-sm font-semibold text-gray-900">Son Ödemeler</h3>
              </div>
              {s.paymentHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Henüz ödeme yok</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {s.paymentHistory.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2">
                      <div>
                        <p className="font-medium text-gray-700">{p.userName}</p>
                        <p className="text-gray-400">{fmtDate(p.date)}</p>
                      </div>
                      <span className={`font-bold ${p.status === "success" || p.status === "SUCCESS" ? "text-emerald-600" : "text-red-500"}`}>
                        {fmtTL(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* ══════════ USERS TAB ══════════ */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="İsim veya email ara..."
                className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="all">Tümü</option>
              <option value="trial">Denemede</option>
              <option value="expired">Süresi Dolmuş</option>
              <option value="paying">Ödeme Yapan</option>
              <option value="admin">Admin</option>
              <option value="suspended">Askıda</option>
            </select>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-xs text-amber-600">Denemede</p>
              <p className="text-lg font-bold text-amber-700">{s.trialActive}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-xs text-red-600">Süresi Dolmuş</p>
              <p className="text-lg font-bold text-red-700">{s.trialExpired}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 text-center">
              <p className="text-xs text-emerald-600">Ödeme Yapan</p>
              <p className="text-lg font-bold text-emerald-700">{s.payingUsers}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-xs text-blue-600">Toplam</p>
              <p className="text-lg font-bold text-blue-700">{s.totalUsers}</p>
            </div>
          </div>

          {/* User Table */}
          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Kullanıcı</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Kayıt</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Deneme Bitiş</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Kalan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Son Giriş</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(u => {
                    const badge = STATUS_BADGES[u.displayStatus] || STATUS_BADGES.trial;
                    const isExpanded = selectedUser === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                            {u.clinicName && <p className="text-[10px] text-gray-400">{u.clinicName} · {u.sector || "—"}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(u.trialEnd)}</td>
                        <td className="px-4 py-3">
                          {u.daysLeft !== null ? (
                            <span className={`text-xs font-bold ${u.daysLeft > 3 ? "text-green-600" : u.daysLeft > 0 ? "text-amber-600" : "text-red-600"}`}>
                              {u.daysLeft > 0 ? `${u.daysLeft} gün` : u.daysLeft === 0 ? "Bugün" : `${Math.abs(u.daysLeft)} gün geçti`}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(u.lastLoginAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedUser(isExpanded ? null : u.id)}
                            className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                        {/* Expanded actions row */}
                        {isExpanded && (
                          <td colSpan={7} className="px-4 py-3 bg-gray-50/80">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Süre Uzat */}
                              {u.clinicId && (
                                <>
                                  <span className="text-xs text-gray-500">Süre uzat:</span>
                                  {[7, 30, 90].map(d => (
                                    <button
                                      key={d}
                                      onClick={() => handleManage({ action: "extend-trial", clinicId: u.clinicId, days: d })}
                                      disabled={actionLoading}
                                      className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                                    >
                                      +{d} gün
                                    </button>
                                  ))}
                                  <span className="text-gray-300">|</span>
                                  <span className="text-xs text-gray-500">Durum:</span>
                                  {["active", "suspended", "cancelled"].map(st => (
                                    <button
                                      key={st}
                                      onClick={() => handleManage({ action: "change-status", clinicId: u.clinicId, status: st })}
                                      disabled={actionLoading}
                                      className={`rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                                        st === "active" ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" :
                                        st === "suspended" ? "bg-orange-50 text-orange-600 hover:bg-orange-100" :
                                        "bg-red-50 text-red-600 hover:bg-red-100"
                                      }`}
                                    >
                                      {SUB_LABELS[st] || st}
                                    </button>
                                  ))}
                                </>
                              )}
                              {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">Kullanıcı bulunamadı</p>
            )}
          </div>
        </div>
      )}

      {/* ══════════ PAYMENTS TAB ══════════ */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <p className="text-xs text-gray-400">Bu Ay Gelir</p>
              <p className="text-2xl font-bold text-emerald-600">{fmtTL(s.monthlyRevenue)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <p className="text-xs text-gray-400">Ödeme Yapan</p>
              <p className="text-2xl font-bold text-blue-600">{s.payingUsers}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <p className="text-xs text-gray-400">Toplam Ödeme</p>
              <p className="text-2xl font-bold text-gray-900">{s.paymentHistory.length}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Ödeme Geçmişi</h3>
            </div>
            {s.paymentHistory.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">Henüz ödeme kaydı yok</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Kullanıcı</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tutar</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Yöntem</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Durum</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Referans</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {s.paymentHistory.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(p.date)}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-700">{p.userName}</p>
                          <p className="text-[10px] text-gray-400">{p.userEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{fmtTL(p.amount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{p.method}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            p.status === "success" || p.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}>
                            {p.status === "success" || p.status === "SUCCESS" ? "Başarılı" : "Başarısız"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-gray-400 font-mono">{p.ref || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
