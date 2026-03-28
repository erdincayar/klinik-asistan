"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  Activity,
  LogIn,
  Shield,
  ArrowRight,
  UserPlus,
  BarChart3,
  UserX,
  Zap,
  TrendingUp,
  Eye,
} from "lucide-react";

/* ──────────── Types ──────────── */

interface ModuleStat {
  module: string;
  views: number;
}

interface UserModuleStat {
  module: string;
  count: number;
}

interface UserAnalytics {
  userId: string;
  name: string;
  email: string;
  total: number;
  modules: UserModuleStat[];
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  passiveUsers: number;
  totalClinics: number;
  todayLogins: number;
  topModules: ModuleStat[];
  userAnalytics: UserAnalytics[];
}

/* ──────────── Module Labels ──────────── */

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

const MODULE_COLORS: string[] = [
  "#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6",
  "#8B5CF6", "#EF4444", "#14B8A6", "#F97316", "#06B6D4",
  "#84CC16", "#D946EF", "#0EA5E9", "#A855F7", "#22C55E",
];

/* ──────────── Page ──────────── */

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        const data = await res.json();
        setStats(data);
      } catch {
        console.error("Admin data fetch error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Toplam Kullanıcı", value: stats.totalUsers, icon: Users, color: "blue" },
    { label: "Aktif (24 saat)", value: stats.activeUsers, icon: Zap, color: "green" },
    { label: "Pasif (7+ gün)", value: stats.passiveUsers, icon: UserX, color: "red" },
    { label: "Toplam Klinik", value: stats.totalClinics, icon: Building2, color: "purple" },
    { label: "Bugün Giriş", value: stats.todayLogins, icon: LogIn, color: "orange" },
  ];

  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: "bg-[#EEF2FF]", icon: "text-[#6366F1]", text: "text-[#4F46E5]" },
    green: { bg: "bg-green-50", icon: "text-green-600", text: "text-green-700" },
    red: { bg: "bg-red-50", icon: "text-red-500", text: "text-red-600" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", text: "text-purple-700" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", text: "text-orange-700" },
  };

  const maxModuleViews = stats.topModules[0]?.views || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-[#6366F1]" />
            Admin Panel
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Kullanıcı istatistikleri ve modül kullanım analizi
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/users"
            className="flex items-center gap-2 rounded-xl bg-[#6366F1] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4F46E5]"
          >
            <UserPlus className="h-4 w-4" />
            Kullanıcılar
          </Link>
          <Link
            href="/admin/activity"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <BarChart3 className="h-4 w-4" />
            Aktivite
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const colors = colorMap[card.color];
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5"
            >
              <div className={`rounded-xl ${colors.bg} p-3`}>
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-2xl font-bold ${colors.text}`}>{card.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── En Çok Kullanılan Modüller ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <TrendingUp className="h-4 w-4 text-[#6366F1]" />
            <h3 className="font-semibold text-gray-900">En Çok Kullanılan Modüller</h3>
            <span className="ml-auto text-xs text-gray-400">Son 30 gün</span>
          </div>
          <div className="p-6 space-y-3">
            {stats.topModules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Henüz modül kullanım verisi yok
              </p>
            ) : (
              stats.topModules.slice(0, 12).map((mod, i) => {
                const pct = (mod.views / maxModuleViews) * 100;
                const color = MODULE_COLORS[i % MODULE_COLORS.length];
                return (
                  <div key={mod.module} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {MODULE_LABELS[mod.module] || mod.module}
                      </span>
                      <span className="text-xs text-gray-500">
                        {mod.views} görüntüleme
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* ── Kullanıcı Bazlı Kullanım ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-gray-100 bg-white"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <Eye className="h-4 w-4 text-[#6366F1]" />
            <h3 className="font-semibold text-gray-900">Kullanıcı Aktivitesi</h3>
            <span className="ml-auto text-xs text-gray-400">Son 30 gün</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {stats.userAnalytics.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Henüz kullanıcı aktivite verisi yok
              </p>
            ) : (
              stats.userAnalytics.slice(0, 30).map((ua) => (
                <button
                  key={ua.userId}
                  onClick={() => setSelectedUser(selectedUser?.userId === ua.userId ? null : ua)}
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

                  {/* Expanded — modül detayları */}
                  {selectedUser?.userId === ua.userId && (
                    <div className="mt-3 space-y-1.5 rounded-lg bg-gray-50 p-3">
                      {ua.modules.map((m, j) => (
                        <div key={m.module} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: MODULE_COLORS[j % MODULE_COLORS.length] }}
                            />
                            <span className="text-gray-600">
                              {MODULE_LABELS[m.module] || m.module}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-800">{m.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
