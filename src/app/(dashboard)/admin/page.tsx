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
} from "lucide-react";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalClinics: number;
  todayLogins: number;
}

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  clinicId: string | null;
  clinic: { id: string; name: string; sector?: string } | null;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/users"),
        ]);

        if (statsRes.status === 403 || usersRes.status === 403) {
          router.push("/dashboard");
          return;
        }

        const statsData = await statsRes.json();
        const usersData = await usersRes.json();
        setStats(statsData);
        setUsers(usersData);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Toplam Kullanıcı",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "blue",
      href: "/admin/users",
    },
    {
      label: "Aktif Kullanıcı",
      value: stats?.activeUsers || 0,
      icon: Activity,
      color: "green",
      href: "/admin/users",
    },
    {
      label: "Toplam Klinik",
      value: stats?.totalClinics || 0,
      icon: Building2,
      color: "purple",
      href: "/admin/users",
    },
    {
      label: "Bugün Giriş",
      value: stats?.todayLogins || 0,
      icon: LogIn,
      color: "orange",
      href: "/admin/activity",
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700" },
    green: { bg: "bg-green-50", icon: "text-green-600", text: "text-green-700" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", text: "text-purple-700" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", text: "text-orange-700" },
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-700";
      case "DEMO":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-blue-600" />
            Admin Panel
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Sistem yönetimi ve kullanıcı kontrolleri
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/users"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const colors = colorMap[card.color];
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={card.href}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className={`rounded-xl ${colors.bg} p-3`}>
                  <Icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {card.value}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Son Kullanıcılar</h3>
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Tümünü gör <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3">Kullanıcı</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">Klinik</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3">Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.slice(0, 10).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadge(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {user.clinic?.name || "-"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        user.isActive ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          user.isActive ? "bg-green-500" : "bg-red-400"
                        }`}
                      />
                      {user.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
