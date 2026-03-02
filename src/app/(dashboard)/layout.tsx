"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Package,
  FileText,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  MessageCircle,
  Bell,
  BarChart3,
  UserCog,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Upload,
  TrendingUp,
  Megaphone,
  Share2,
  Shield,
  Activity,
} from "lucide-react";

/* ──────────────────────── DATA ──────────────────────── */

const navItems = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/patients", label: "Hastalar", icon: Users },
  { href: "/appointments", label: "Randevular", icon: Calendar },
  { href: "/finance", label: "Finans", icon: DollarSign },
  { href: "/invoices", label: "Faturalar", icon: FileText },
  { href: "/invoice-upload", label: "Fatura OCR", icon: Upload },
  { href: "/financial-reports", label: "Mali Tablo", icon: TrendingUp },
  { href: "/inventory", label: "Stok/Envanter", icon: Package },
  { href: "/marketing", label: "Pazarlama", icon: Megaphone },
  { href: "/social-media", label: "Sosyal Medya", icon: Share2 },
  { href: "/ai-assistant", label: "AI Asistan", icon: Bot },
  { href: "/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/employees", label: "Çalışanlar", icon: UserCog },
  { href: "/reminders", label: "Hatırlatmalar", icon: Bell },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

const adminNavItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/activity", label: "Aktivite Log", icon: Activity },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Genel Bakış",
  "/patients": "Hastalar",
  "/patients/new": "Yeni Hasta",
  "/appointments": "Randevular",
  "/appointments/new": "Yeni Randevu",
  "/finance": "Finans",
  "/finance/new-income": "Yeni Gelir",
  "/finance/new-expense": "Yeni Gider",
  "/inventory": "Stok/Envanter",
  "/invoices": "Faturalar",
  "/invoice-upload": "Fatura OCR",
  "/financial-reports": "Mali Tablo",
  "/marketing": "Pazarlama",
  "/social-media": "Sosyal Medya",
  "/ai-assistant": "AI Asistan",
  "/whatsapp": "WhatsApp",
  "/reports": "Raporlar",
  "/employees": "Çalışanlar",
  "/reminders": "Hatırlatmalar",
  "/settings": "Ayarlar",
  "/admin": "Admin Panel",
  "/admin/users": "Kullanıcı Yönetimi",
  "/admin/activity": "Aktivite Logları",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/patients/")) return "Hasta Detay";
  return "inPobi";
}

/* ──────────────────────── SIDEBAR ──────────────────────── */

function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : "lg:w-64"} w-64`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            {collapsed ? (
              <span className="text-lg font-extrabold text-blue-600">iP</span>
            ) : (
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-blue-600">in</span>
                <span className="text-gray-800">Pobi</span>
              </span>
            )}
          </Link>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:block"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <span className={collapsed ? "lg:hidden" : ""}>
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-600"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Admin Section - only visible to ADMIN role */}
          {(session?.user as any)?.role === "ADMIN" && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Yönetim
                </p>
              )}
              <div className="space-y-0.5">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-red-50 text-red-700"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          isActive ? "text-red-600" : "text-gray-400 group-hover:text-gray-600"
                        }`}
                      />
                      <span className={collapsed ? "lg:hidden" : ""}>
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-admin-active"
                          className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-red-600"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Plan badge + User section */}
        <div className="shrink-0 border-t border-gray-100 px-3 py-3">
          {/* Plan badge */}
          {!collapsed && (
            <div className="mb-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">
                  Pro Plan
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-blue-500">
                Tüm özellikler aktif
              </p>
            </div>
          )}
          {collapsed && (
            <div className="mb-3 flex justify-center">
              <div className="rounded-lg bg-blue-50 p-2" title="Pro Plan">
                <Sparkles className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          )}

          {/* User */}
          <div
            className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {(session?.user?.name || "K")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {session?.user?.name || "Kullanıcı"}
                  </p>
                  <p className="truncate text-[11px] text-gray-400">
                    {session?.user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Çıkış Yap"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ──────────────────────── MAIN CONTENT ──────────────────────── */

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const { data: session } = useSession();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {pageTitle}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" />
            </button>

            {/* User (desktop) */}
            <div className="hidden items-center gap-3 rounded-xl px-3 py-1.5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {(session?.user?.name || "K")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {session?.user?.name || "Kullanıcı"}
              </span>
            </div>

            {/* Logout (desktop) */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:block"
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" as const }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

/* ──────────────────────── LAYOUT EXPORT ──────────────────────── */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  );
}
