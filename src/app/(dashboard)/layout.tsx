"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Package,
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
  Megaphone,
  Shield,
  Activity,
  CreditCard,
  Lock,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { ToastProvider, Toaster, useToast } from "@/components/ui/toast";

/* ──────────────────────── PLAN CONFIG ──────────────────────── */

type PlanTier = "BASIC" | "PRO" | "BUSINESS";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  minPlan: PlanTier;
}

const PLAN_LEVELS: Record<PlanTier, number> = {
  BASIC: 0,
  PRO: 1,
  BUSINESS: 2,
};

const PLAN_LABELS: Record<PlanTier, string> = {
  BASIC: "Başlangıç",
  PRO: "Pro",
  BUSINESS: "İşletme",
};

function hasAccess(userPlan: PlanTier, requiredPlan: PlanTier): boolean {
  return PLAN_LEVELS[userPlan] >= PLAN_LEVELS[requiredPlan];
}

/* ──────────────────────── DATA ──────────────────────── */

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard, minPlan: "BASIC" },
  { href: "/patients", label: "Müşteriler", icon: Users, minPlan: "BASIC" },
  { href: "/appointments", label: "Randevular", icon: Calendar, minPlan: "BASIC" },
  { href: "/finance", label: "Finans", icon: DollarSign, minPlan: "BASIC" },
  { href: "/inventory", label: "Stok/Envanter", icon: Package, minPlan: "PRO" },
  { href: "/employees", label: "Çalışanlar", icon: UserCog, minPlan: "PRO" },
  { href: "/hr", label: "İnsan Kaynakları", icon: ClipboardList, minPlan: "PRO" },
  { href: "/marketing", label: "Pazarlama", icon: Megaphone, minPlan: "BUSINESS" },
  { href: "/messaging", label: "Mesajlaşma", icon: MessageCircle, minPlan: "PRO" },
  { href: "/ai-assistant", label: "AI Asistan", icon: Bot, minPlan: "PRO" },
  { href: "/reports", label: "Raporlar", icon: BarChart3, minPlan: "BUSINESS" },
  { href: "/reminders", label: "Hatırlatmalar", icon: Bell, minPlan: "PRO" },
  { href: "/billing", label: "Abonelik", icon: CreditCard, minPlan: "BASIC" },
];

const adminNavItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/activity", label: "Aktivite Log", icon: Activity },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Genel Bakış",
  "/patients": "Müşteriler",
  "/patients/new": "Yeni Müşteri",
  "/customers/import": "Veri Aktarımı",
  "/appointments": "Randevular",
  "/appointments/new": "Yeni Randevu",
  "/finance": "Finans",
  "/finance/new-income": "Yeni Gelir",
  "/finance/new-expense": "Yeni Gider",
  "/inventory": "Stok/Envanter",
  "/invoice-upload": "Fatura Yükleme",
  "/financial-reports": "Mali Tablo",
  "/marketing": "Pazarlama",
  "/social-media": "Sosyal Medya",
  "/messaging": "Mesajlaşma",
  "/ai-assistant": "AI Asistan",
  "/whatsapp": "WhatsApp",
  "/reports": "Raporlar",
  "/employees": "Çalışanlar",
  "/hr": "İnsan Kaynakları",
  "/reminders": "Hatırlatmalar",
  "/billing": "Abonelik",
  "/settings": "Ayarlar",
  "/admin": "Admin Panel",
  "/admin/users": "Kullanıcı Yönetimi",
  "/admin/activity": "Aktivite Logları",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/patients/")) return "Müşteri Detayı";
  return "Poby";
}

/* ──────────────────────── LOCAL STORAGE ORDER ──────────────────────── */

const SIDEBAR_ORDER_KEY = "poby-sidebar-order";

function getSavedOrder(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(SIDEBAR_ORDER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveOrder(hrefs: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(hrefs));
  } catch {
    // ignore
  }
}

/* ──────────────────────── SORTABLE NAV ITEM ──────────────────────── */

function SortableNavItem({
  item,
  isActive,
  isLocked,
  collapsed,
  onClose,
  onLockedClick,
}: {
  item: NavItem;
  isActive: boolean;
  isLocked: boolean;
  collapsed: boolean;
  onClose: () => void;
  onLockedClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.href });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  const Icon = item.icon;

  if (isLocked) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
      >
        <button
          type="button"
          onClick={onLockedClick}
          title={collapsed ? `${item.label} (Kilitli)` : undefined}
          className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium opacity-40 cursor-not-allowed ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <div className="relative shrink-0">
            <Icon className="h-[18px] w-[18px] text-gray-400" />
            <Lock className="absolute -right-1 -top-1 h-2.5 w-2.5 text-gray-500" />
          </div>
          <span className={collapsed ? "lg:hidden" : "text-gray-400"}>
            {item.label}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <Link
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
    </div>
  );
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
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const clinicPlan = ((session?.user as any)?.clinicPlan || "PRO") as PlanTier;
  const userRole = (session?.user as any)?.role || "";
  const userEmail = session?.user?.email || "";
  const isDemo = (session?.user as any)?.isDemo || false;

  // Admin, demo, veya özel hesaplarda tüm modüller açık
  const unlockAll =
    status === "loading" ||
    userRole === "ADMIN" ||
    userRole === "SUPERADMIN" ||
    userRole === "DEMO" ||
    isDemo ||
    userEmail === "admin@poby.ai";

  // Sortable order
  const [orderedItems, setOrderedItems] = useState<NavItem[]>(navItems);

  useEffect(() => {
    const saved = getSavedOrder();
    if (saved) {
      const itemMap = new Map(navItems.map((item) => [item.href, item]));
      const sorted: NavItem[] = [];
      for (const href of saved) {
        const item = itemMap.get(href);
        if (item) {
          sorted.push(item);
          itemMap.delete(href);
        }
      }
      // Append any new items not in saved order
      Array.from(itemMap.values()).forEach((item) => {
        sorted.push(item);
      });
      setOrderedItems(sorted);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedItems((items) => {
        const oldIndex = items.findIndex((i) => i.href === active.id);
        const newIndex = items.findIndex((i) => i.href === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        saveOrder(newItems.map((i) => i.href));
        return newItems;
      });
    }
  }, []);

  const handleLockedClick = useCallback(() => {
    toast({
      title: "Erişim kısıtlı",
      description: "Bu özellik planınıza dahil değil. Yükseltmek için iletişime geçin.",
      variant: "destructive",
    });
  }, [toast]);

  const itemIds = useMemo(() => orderedItems.map((i) => i.href), [orderedItems]);

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
              <span className="text-lg font-extrabold text-blue-600">Po</span>
            ) : (
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-blue-600">Po</span>
                <span className="text-gray-800">by</span>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-0.5">
                {orderedItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const isLocked = !unlockAll && !hasAccess(clinicPlan, item.minPlan);
                  return (
                    <SortableNavItem
                      key={item.href}
                      item={item}
                      isActive={isActive}
                      isLocked={isLocked}
                      collapsed={collapsed}
                      onClose={onClose}
                      onLockedClick={handleLockedClick}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

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

        {/* Settings + Plan badge + User section */}
        <div className="shrink-0 border-t border-gray-100 px-3 py-3">
          {/* Fixed Settings link */}
          <div className="mb-2">
            <Link
              href="/settings"
              onClick={onClose}
              title={collapsed ? "Ayarlar" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
            >
              <Settings
                className={`h-[18px] w-[18px] shrink-0 ${
                  pathname === "/settings" || pathname.startsWith("/settings/")
                    ? "text-blue-600"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              />
              <span className={collapsed ? "lg:hidden" : ""}>Ayarlar</span>
              {(pathname === "/settings" || pathname.startsWith("/settings/")) && (
                <motion.div
                  layoutId="sidebar-settings-active"
                  className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-600"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          </div>

          {/* Plan badge */}
          {!collapsed && (
            <div className="mb-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">
                  {PLAN_LABELS[clinicPlan] || "Pro"} Plan
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-blue-500">
                {clinicPlan === "BUSINESS"
                  ? "Tüm özellikler aktif"
                  : clinicPlan === "PRO"
                    ? "Pro özellikler aktif"
                    : "Temel özellikler aktif"}
              </p>
            </div>
          )}
          {collapsed && (
            <div className="mb-3 flex justify-center">
              <div className="rounded-lg bg-blue-50 p-2" title={`${PLAN_LABELS[clinicPlan] || "Pro"} Plan`}>
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
      <ToastProvider>
        <DashboardContent>{children}</DashboardContent>
        <Toaster />
      </ToastProvider>
    </SessionProvider>
  );
}
