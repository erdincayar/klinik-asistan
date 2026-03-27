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
  BellRing,
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

/* ──────────────────────── MODULE CONFIG ──────────────────────── */

const LOCKED_MODULES = ["marketing", "ai_assistant"];

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  moduleSlug?: string;
  permKey?: string;
}

/* ──────────────────────── DATA ──────────────────────── */

const navItems: NavItem[] = [
  { href: "/dashboard",    label: "Genel Bakış",      icon: LayoutDashboard, moduleSlug: "base",         permKey: "dashboard" },
  { href: "/patients",     label: "Müşteriler",       icon: Users,           moduleSlug: "customers",    permKey: "customers" },
  { href: "/appointments", label: "Randevular",       icon: Calendar,        moduleSlug: "appointments", permKey: "appointments" },
  { href: "/finance",      label: "Finans",           icon: DollarSign,      moduleSlug: "finance",      permKey: "finance" },
  { href: "/inventory",    label: "Stok/Envanter",    icon: Package,         moduleSlug: "inventory",    permKey: "inventory" },
  { href: "/employees",    label: "Çalışanlar",       icon: UserCog,         moduleSlug: "employees",    permKey: "employees" },
  { href: "/hr",           label: "İnsan Kaynakları", icon: ClipboardList,   moduleSlug: "employees",    permKey: "hr" },
  { href: "/marketing",    label: "Pazarlama",        icon: Megaphone,       moduleSlug: "marketing",    permKey: "marketing" },
  { href: "/messaging",    label: "Mesajlaşma",       icon: MessageCircle,   moduleSlug: "messaging",    permKey: "messaging" },
  { href: "/ai-assistant", label: "AI Asistan",       icon: Bot,             moduleSlug: "ai_assistant", permKey: "ai_assistant" },
  { href: "/reports",      label: "Raporlar",         icon: BarChart3,       moduleSlug: "reports",      permKey: "reports" },
  { href: "/alarmlar",     label: "Alarmlar",         icon: BellRing,        moduleSlug: "alarms",       permKey: "alarms" },
  { href: "/reminders",    label: "Hatırlatmalar",    icon: Bell,            moduleSlug: "alarms",       permKey: "reminders" },
  { href: "/billing",      label: "Abonelik",         icon: CreditCard },
];

// Nav group boundaries for visual separation
const NAV_GROUP_BREAKS = new Set(["/inventory", "/messaging"]);

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
  "/alarmlar": "Alarmlar",
  "/reminders": "Hatırlatmalar",
  "/billing": "Abonelik",
  "/billing/moduller": "Modüllerim",
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
  isYakinda,
  collapsed,
  onClose,
  onLockedClick,
}: {
  item: NavItem;
  isActive: boolean;
  isLocked: boolean;
  isYakinda?: boolean;
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
          title={collapsed ? `${item.label} (${isYakinda ? "Yakında" : "Kilitli"})` : undefined}
          className={`group relative flex w-full items-center gap-3 rounded-[2px] px-3 py-2.5 text-[13px] uppercase tracking-wider font-medium opacity-30 cursor-not-allowed ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <div className="relative shrink-0">
            <Icon className="h-[18px] w-[18px] text-[#666]" />
            <Lock className="absolute -right-1 -top-1 h-2.5 w-2.5 text-[#666]" />
          </div>
          <span className={collapsed ? "lg:hidden" : "text-[#666]"}>
            {item.label}
          </span>
          {isYakinda && !collapsed && (
            <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#666]">
              Yakında
            </span>
          )}
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
        className={`group relative flex items-center gap-3 rounded-[2px] px-3 py-2.5 text-[13px] uppercase tracking-wider font-medium transition-all duration-200 ${
          isActive
            ? "bg-[rgba(190,58,33,0.2)] text-white border-l-[3px] border-[#BE3A21]"
            : "text-[#AAA] hover:bg-white/5 hover:text-white"
        } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
      >
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            isActive ? "text-white" : "text-[#AAA] group-hover:text-white"
          }`}
        />
        <span className={collapsed ? "lg:hidden" : ""}>
          {item.label}
        </span>

        {/* Active indicator */}
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#BE3A21]"
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

  // Active modules from billing
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("active");
  const [trialEnd, setTrialEnd] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/modules")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.activeModules) setActiveModules(d.activeModules);
        if (d?.status) setSubscriptionStatus(d.status);
        if (d?.trialEnd) setTrialEnd(d.trialEnd);
      })
      .catch(() => {});
  }, []);

  // Employee permissions (for non-admin users who are linked as employees)
  const [employeePerms, setEmployeePerms] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (unlockAll) return;
    // Fetch current user's employee record permissions
    fetch("/api/employees/me/permissions")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.permissions) setEmployeePerms(d.permissions);
      })
      .catch(() => {});
  }, [unlockAll]);

  // Unread alarm count
  const [unreadAlarmCount, setUnreadAlarmCount] = useState(0);

  useEffect(() => {
    fetch("/api/alarms/logs/unread-count")
      .then((r) => r.ok ? r.json() : { count: 0 })
      .then((d) => setUnreadAlarmCount(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

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

  const handleLockedClick = useCallback((item: NavItem) => {
    const isYakinda = item.moduleSlug && LOCKED_MODULES.includes(item.moduleSlug);
    if (isYakinda) {
      toast({
        title: "Yakında",
        description: `${item.label} modülü yakında kullanıma açılacak.`,
      });
    } else {
      toast({
        title: "Modül aktif değil",
        description: "Bu modül planınıza dahil değil. Abonelik sayfasından ekleyebilirsiniz.",
        variant: "destructive",
      });
    }
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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#2B2B2B] transition-all duration-300 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : "lg:w-[240px]"} w-[240px]`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#1A1A1A] px-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            {collapsed ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#BE3A21]">
                <span className="text-sm font-extrabold text-white">P</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#BE3A21]">
                  <span className="text-sm font-extrabold text-white">P</span>
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white">
                  poby<span className="text-[#BE3A21]">.</span>
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#AAA] transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-1.5 text-[#AAA] transition-colors hover:bg-white/10 hover:text-white lg:block"
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
                {orderedItems.filter((item) => {
                  // Hide items where employee has "none" permission
                  if (!unlockAll && employeePerms && item.permKey && employeePerms[item.permKey] === "none") {
                    return false;
                  }
                  return true;
                }).map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const isYakinda = !!item.moduleSlug && LOCKED_MODULES.includes(item.moduleSlug);
                  const isNotSubscribed = !unlockAll && !!item.moduleSlug && !activeModules.includes(item.moduleSlug);
                  const isLocked = isYakinda || isNotSubscribed;
                  return (
                    <div key={item.href}>
                      {NAV_GROUP_BREAKS.has(item.href) && (
                        <div className="border-t border-white/10 mt-3 pt-3" />
                      )}
                      <div className="relative">
                        <SortableNavItem
                          item={item}
                          isActive={isActive}
                          isLocked={isLocked}
                          isYakinda={isYakinda}
                          collapsed={collapsed}
                          onClose={onClose}
                          onLockedClick={() => handleLockedClick(item)}
                        />
                        {item.href === "/alarmlar" && unreadAlarmCount > 0 && !isLocked && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {unreadAlarmCount > 99 ? "99+" : unreadAlarmCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* Admin Section - only visible to ADMIN role */}
          {(session?.user as any)?.role === "ADMIN" && (
            <div className="mt-4 border-t border-white/10 pt-4">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#555]">
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
                      className={`group relative flex items-center gap-3 rounded-[2px] px-3 py-2.5 text-[13px] uppercase tracking-wider font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[rgba(190,58,33,0.2)] text-white border-l-[3px] border-[#BE3A21]"
                          : "text-[#AAA] hover:bg-white/5 hover:text-white"
                      } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          isActive ? "text-white" : "text-[#AAA] group-hover:text-white"
                        }`}
                      />
                      <span className={collapsed ? "lg:hidden" : ""}>
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-admin-active"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#BE3A21]"
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
        <div className="shrink-0 border-t border-white/10 px-3 py-3">
          {/* Fixed Settings link */}
          <div className="mb-2">
            <Link
              href="/settings"
              onClick={onClose}
              title={collapsed ? "Ayarlar" : undefined}
              className={`group relative flex items-center gap-3 rounded-[2px] px-3 py-2.5 text-[13px] uppercase tracking-wider font-medium transition-all duration-200 ${
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "bg-[rgba(190,58,33,0.2)] text-white border-l-[3px] border-[#BE3A21]"
                  : "text-[#AAA] hover:bg-white/5 hover:text-white"
              } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
            >
              <Settings
                className={`h-[18px] w-[18px] shrink-0 ${
                  pathname === "/settings" || pathname.startsWith("/settings/")
                    ? "text-white"
                    : "text-[#AAA] group-hover:text-white"
                }`}
              />
              <span className={collapsed ? "lg:hidden" : ""}>Ayarlar</span>
              {(pathname === "/settings" || pathname.startsWith("/settings/")) && (
                <motion.div
                  layoutId="sidebar-settings-active"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#BE3A21]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          </div>

          {/* Plan badge */}
          {!collapsed && (
            <div className="mb-3 rounded-[4px] bg-white/5 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#BE3A21]" />
                <span className="text-xs font-semibold text-white">
                  {activeModules.length} modül aktif
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#AAA]">
                {subscriptionStatus === "trial" && trialEnd
                  ? `Deneme: ${Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000))} gün kaldı`
                  : subscriptionStatus === "suspended"
                    ? "Abonelik askıda"
                    : "Abonelik aktif"}
              </p>
            </div>
          )}
          {collapsed && (
            <div className="mb-3 flex justify-center">
              <div className="rounded-lg bg-white/10 p-2" title={`${activeModules.length} modül aktif`}>
                <Sparkles className="h-4 w-4 text-[#BE3A21]" />
              </div>
            </div>
          )}

          {/* User */}
          <div
            className={`flex items-center gap-3 rounded-[4px] bg-white/5 px-2 py-2 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#BE3A21] text-xs font-semibold text-white">
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
                  <p className="truncate text-sm font-medium text-white">
                    {session?.user?.name || "Kullanıcı"}
                  </p>
                  <p className="truncate text-[11px] text-[#777]">
                    {session?.user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg p-1.5 text-[#AAA] transition-colors hover:bg-white/10 hover:text-red-400"
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

/* ──────────────────────── TRIAL BANNER ──────────────────────── */

function TrialBanner({ status, trialEnd }: { status: string; trialEnd?: string | null }) {
  if (status === "active") return null;

  if (status === "suspended") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-red-700 font-medium">Aboneliğiniz askıya alındı. Hizmetlerin devam etmesi için ödeme yöntemini güncelleyin.</span>
        <Link href="/billing" className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">
          Ödeme Yöntemini Güncelle
        </Link>
      </div>
    );
  }

  if (status === "trial" && trialEnd) {
    const daysLeft = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000));
    const isUrgent = daysLeft <= 3;
    return (
      <div className={`border-b px-4 py-2.5 flex items-center justify-between text-sm ${
        isUrgent ? "bg-red-50 border-red-200" : "bg-[#FFF5F3] border-[#FDEDEC]"
      }`}>
        <span className={isUrgent ? "text-red-700 font-medium" : "text-[#9B2D18]"}>
          {isUrgent ? "🔴" : "⏱"} Deneme süreniz: {daysLeft} gün kaldı
        </span>
        <Link href="/billing" className={`rounded-[2px] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white ${
          isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-[#BE3A21] hover:bg-[#9B2D18]"
        }`}>
          {isUrgent ? "Hemen Aktif Et" : "Planımı Aktif Et"}
        </Link>
      </div>
    );
  }
  return null;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const { data: session } = useSession();

  // Subscription status for trial banner
  const [subStatus, setSubStatus] = useState("active");
  const [subTrialEnd, setSubTrialEnd] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/modules")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.status) setSubStatus(d.status);
        if (d?.trialEnd) setSubTrialEnd(d.trialEnd);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-[#F9F9F9]">
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Trial / Subscription Banner */}
        <TrialBanner status={subStatus} trialEnd={subTrialEnd} />

        {/* Top header */}
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#E8E8E8] bg-white px-6">
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
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#BE3A21]" />
            </button>

            {/* User (desktop) */}
            <div className="hidden items-center gap-3 rounded-[4px] px-3 py-1.5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#BE3A21] text-xs font-semibold text-white">
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

            {/* Logout (tablet only, sidebar has its own) */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:block lg:hidden"
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:p-6">
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
