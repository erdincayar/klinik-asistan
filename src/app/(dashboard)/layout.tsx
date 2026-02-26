"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  Stethoscope,
  MessageCircle,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Genel Bakis", icon: LayoutDashboard },
  { href: "/patients", label: "Hastalar", icon: Users },
  { href: "/appointments", label: "Randevular", icon: Calendar },
  { href: "/finance", label: "Finans", icon: DollarSign },
  { href: "/ai-assistant", label: "AI Asistan", icon: Bot },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/reminders", label: "Hatirlatmalar", icon: Bell },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <Stethoscope className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-gray-900">KlinikAsistan</span>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 truncate">
              {session?.user?.name || "Kullanici"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-gray-500 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    "/dashboard": "Genel Bakis",
    "/patients": "Hastalar",
    "/patients/new": "Yeni Hasta",
    "/appointments": "Randevular",
    "/appointments/new": "Yeni Randevu",
    "/finance": "Finans",
    "/finance/new-income": "Yeni Gelir",
    "/finance/new-expense": "Yeni Gider",
    "/ai-assistant": "AI Asistan",
    "/whatsapp": "WhatsApp",
    "/reminders": "Hatirlatmalar",
    "/settings": "Ayarlar",
  };
  for (const [path, title] of Object.entries(titles)) {
    if (pathname === path) return title;
  }
  if (pathname.startsWith("/patients/")) return "Hasta Detay";
  return "KlinikAsistan";
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

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
