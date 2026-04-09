"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Search,
  type LucideIcon,
} from "lucide-react";
import { ToastProvider, Toaster, useToast } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import PobySVG from "@/components/PobySVG";

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

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Genel",
    items: [
      { href: "/dashboard",    label: "Genel Bakış",      icon: LayoutDashboard, moduleSlug: "base",         permKey: "dashboard" },
    ],
  },
  {
    label: "Müşteriler",
    items: [
      { href: "/patients",     label: "Müşteriler",       icon: Users,           moduleSlug: "customers",    permKey: "customers" },
    ],
  },
  {
    label: "İşletme",
    items: [
      { href: "/appointments", label: "Randevular",       icon: Calendar,        moduleSlug: "appointments", permKey: "appointments" },
      { href: "/employees",    label: "Çalışanlar",       icon: UserCog,         moduleSlug: "employees",    permKey: "employees" },
      { href: "/hr",           label: "Belgeler",         icon: ClipboardList,   moduleSlug: "employees",    permKey: "hr" },
    ],
  },
  {
    label: "Finans",
    items: [
      { href: "/finance",      label: "Finans",           icon: DollarSign,      moduleSlug: "finance",      permKey: "finance" },
      { href: "/reports",      label: "Raporlar",         icon: BarChart3,       moduleSlug: "reports",      permKey: "reports" },
    ],
  },
  {
    label: "Stok",
    items: [
      { href: "/inventory",    label: "Stok/Envanter",    icon: Package,         moduleSlug: "inventory",    permKey: "inventory" },
    ],
  },
  {
    label: "Pazarlama",
    items: [
      { href: "/marketing",    label: "Pazarlama",        icon: Megaphone,       moduleSlug: "marketing",    permKey: "marketing" },
    ],
  },
  {
    label: "İletişim",
    items: [
      { href: "/messaging",    label: "Mesajlaşma",       icon: MessageCircle,   moduleSlug: "messaging",    permKey: "messaging" },
      { href: "/ai-assistant", label: "Poby Asistan",     icon: Bot,             moduleSlug: "ai_assistant", permKey: "ai_assistant" },
    ],
  },
  {
    label: "Bildirimler",
    items: [
      { href: "/alarmlar",     label: "Alarmlar",         icon: BellRing,        moduleSlug: "alarms",       permKey: "alarms" },
      { href: "/reminders",    label: "Hatırlatmalar",    icon: Bell,            moduleSlug: "alarms",       permKey: "reminders" },
    ],
  },
  {
    label: "Ayarlar",
    items: [
      { href: "/billing",      label: "Abonelik",         icon: CreditCard },
    ],
  },
];

// Flat list for backward compatibility (DnD, order, etc.)
const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

// Build group label lookup: href → group label
const navGroupLabels = new Map<string, string>();
navGroups.forEach((g) => {
  if (g.items.length > 0) navGroupLabels.set(g.items[0].href, g.label);
});

const adminNavItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/marketing", label: "Content Studio", icon: Sparkles },
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
  "/hr": "Belgeler",
  "/alarmlar": "Alarmlar",
  "/reminders": "Hatırlatmalar",
  "/billing": "Abonelik",
  "/billing/moduller": "Modüllerim",
  "/settings": "Ayarlar",
  "/admin": "Admin Panel",
  "/admin/users": "Kullanıcı Yönetimi",
  "/admin/marketing": "Content Studio",
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
          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-30 cursor-not-allowed ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <div className="relative shrink-0">
            <Icon className="h-5 w-5 text-[#6C7293]" />
            <Lock className="absolute -right-1 -top-1 h-2.5 w-2.5 text-[#6C7293]" />
          </div>
          <span className={collapsed ? "lg:hidden" : "text-[#6C7293]"}>
            {item.label}
          </span>
          {isYakinda && !collapsed && (
            <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-[#6C7293]">
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
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-[rgba(99,102,241,0.12)] text-white"
            : "text-[#8E8EA0] hover:bg-white/5 hover:text-white"
        } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${
            isActive ? "text-[#818CF8]" : "text-[#8E8EA0] group-hover:text-white"
          }`}
        />
        <span className={collapsed ? "lg:hidden" : ""}>
          {item.label}
        </span>

        {/* Active indicator */}
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#6366F1]"
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

  // Sector config for dynamic sidebar labels
  const [sectorLabels, setSectorLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.sectorConfig) return;
        const c = data.sectorConfig;
        const labels: Record<string, string> = {};
        if (c.customerPlural) labels["/patients"] = c.customerPlural;
        if (c.appointmentPlural) labels["/appointments"] = c.appointmentPlural;
        if (c.employeePlural) labels["/employees"] = c.employeePlural;
        setSectorLabels(labels);
      })
      .catch(() => {});
  }, []);

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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#1E1E2D] transition-all duration-300 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"} w-[260px]`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            {collapsed ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6366F1]">
                <span className="text-sm font-bold text-white">P</span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <PobySVG inverted className="h-6 w-auto" />
              </div>
            )}
          </Link>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8E8EA0] transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-1.5 text-[#8E8EA0] transition-colors hover:bg-white/10 hover:text-white lg:block"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                  // Override label from sector config
                  const displayItem = sectorLabels[item.href]
                    ? { ...item, label: sectorLabels[item.href] }
                    : item;
                  const isActive =
                    pathname === displayItem.href ||
                    pathname.startsWith(displayItem.href + "/");
                  const isYakinda = !!displayItem.moduleSlug && LOCKED_MODULES.includes(displayItem.moduleSlug);
                  const isNotSubscribed = !unlockAll && !!displayItem.moduleSlug && !activeModules.includes(displayItem.moduleSlug);
                  const isLocked = isYakinda || isNotSubscribed;
                  return (
                    <div key={displayItem.href}>
                      {navGroupLabels.has(displayItem.href) && (
                        <div className="mt-4 pt-2 first:mt-0 first:pt-0">
                          {!collapsed && (
                            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#6C7293]">
                              {navGroupLabels.get(displayItem.href)}
                            </p>
                          )}
                          {collapsed && <div className="border-t border-white/[0.06] mx-2 mb-1" />}
                        </div>
                      )}
                      <div className="relative">
                        <SortableNavItem
                          item={displayItem}
                          isActive={isActive}
                          isLocked={isLocked}
                          isYakinda={isYakinda}
                          collapsed={collapsed}
                          onClose={onClose}
                          onLockedClick={() => handleLockedClick(displayItem)}
                        />
                        {displayItem.href === "/alarmlar" && unreadAlarmCount > 0 && !isLocked && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white">
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
          {((session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "SUPERADMIN") && (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6C7293]">
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
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[rgba(99,102,241,0.12)] text-white"
                          : "text-[#8E8EA0] hover:bg-white/5 hover:text-white"
                      } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive ? "text-[#818CF8]" : "text-[#8E8EA0] group-hover:text-white"
                        }`}
                      />
                      <span className={collapsed ? "lg:hidden" : ""}>
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-admin-active"
                          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#6366F1]"
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
        <div className="shrink-0 border-t border-white/[0.06] px-3 py-3">
          {/* Fixed Settings link */}
          <div className="mb-2">
            <Link
              href="/settings"
              onClick={onClose}
              title={collapsed ? "Ayarlar" : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "bg-[rgba(99,102,241,0.12)] text-white"
                  : "text-[#8E8EA0] hover:bg-white/5 hover:text-white"
              } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
            >
              <Settings
                className={`h-5 w-5 shrink-0 ${
                  pathname === "/settings" || pathname.startsWith("/settings/")
                    ? "text-[#818CF8]"
                    : "text-[#8E8EA0] group-hover:text-white"
                }`}
              />
              <span className={collapsed ? "lg:hidden" : ""}>Ayarlar</span>
              {(pathname === "/settings" || pathname.startsWith("/settings/")) && (
                <motion.div
                  layoutId="sidebar-settings-active"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#6366F1]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          </div>

          {/* Plan badge */}
          {!collapsed && (
            <div className="mb-3 rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6366F1]/20">
                  <Sparkles className="h-4 w-4 text-[#818CF8]" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white">
                    {activeModules.length} modül aktif
                  </span>
                  <p className="text-[11px] text-[#8E8EA0]">
                    {subscriptionStatus === "trial" && trialEnd
                      ? `Deneme: ${Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000))} gün kaldı`
                      : subscriptionStatus === "suspended"
                        ? "Abonelik askıda"
                        : "Abonelik aktif"}
                  </p>
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mb-3 flex justify-center">
              <div className="rounded-lg bg-[#6366F1]/20 p-2" title={`${activeModules.length} modül aktif`}>
                <Sparkles className="h-4 w-4 text-[#818CF8]" />
              </div>
            </div>
          )}

          {/* User */}
          <div
            className={`flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] text-xs font-semibold text-white">
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
                  <p className="truncate text-[11px] text-[#8E8EA0]">
                    {session?.user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg p-1.5 text-[#8E8EA0] transition-colors hover:bg-white/10 hover:text-red-400"
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

/* ──────────────────────── TRIAL BANNER ──────────────────────── */

function TrialBanner({ status, trialEnd }: { status: string; trialEnd?: string | null }) {
  if (status === "active") return null;

  if (status === "suspended") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-red-700 font-medium">Aboneliğiniz askıya alındı. Hizmetlerin devam etmesi için ödeme yöntemini güncelleyin.</span>
        <Link href="/billing" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
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
        isUrgent ? "bg-red-50 border-red-200" : "bg-[#EEF2FF] border-[#E0E7FF]"
      }`}>
        <span className={isUrgent ? "text-red-700 font-medium" : "text-[#4F46E5] font-medium"}>
          Deneme süreniz: {daysLeft} gün kaldı
        </span>
        <Link href="/billing" className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
          isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-[#6366F1] hover:bg-[#4F46E5]"
        }`}>
          {isUrgent ? "Hemen Aktif Et" : "Planımı Aktif Et"}
        </Link>
      </div>
    );
  }
  return null;
}

/* ──────────────────────── MAIN CONTENT ──────────────────────── */

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; createdAt: string; isRead: boolean }[]>([]);
  const [notiLoading, setNotiLoading] = useState(false);
  const [topBarUnreadCount, setTopBarUnreadCount] = useState(0);

  // Fetch unread count for top bar bell
  useEffect(() => {
    fetch("/api/alarms/logs/unread-count")
      .then((r) => r.ok ? r.json() : { count: 0 })
      .then((d) => setTopBarUnreadCount(d.count ?? 0))
      .catch(() => {});
  }, []);
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

  // Trial expired check — redirect non-admin users to /expired
  const router2 = useRouter();
  useEffect(() => {
    if (!session?.user) return;
    const role = (session.user as any)?.role;
    if (role === "ADMIN" || role === "SUPERADMIN") return; // Admin muaf
    if ((session.user as any)?.isDemo) return; // Demo muaf

    const sessionSubStatus = (session.user as any)?.subStatus;
    const sessionTrialEnd = (session.user as any)?.trialEnd;

    // Check from session first
    if (sessionSubStatus === "suspended" || sessionSubStatus === "cancelled") {
      router2.replace("/expired");
      return;
    }
    if (sessionSubStatus === "trial" && sessionTrialEnd) {
      const daysLeft = Math.ceil((new Date(sessionTrialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        router2.replace("/expired");
        return;
      }
    }
  }, [session, router2]);

  // Log page views for analytics
  useEffect(() => {
    fetch("/api/activity/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pathname }),
    }).catch(() => {});
  }, [pathname]);

  // Close search/notifications on route change
  useEffect(() => {
    setShowSearch(false);
    setShowNotifications(false);
  }, [pathname]);

  const router = useRouter();

  // Fetch notifications (alarm logs)
  function handleOpenNotifications() {
    if (showNotifications) {
      setShowNotifications(false);
      return;
    }
    setShowNotifications(true);
    setShowSearch(false);
    setNotiLoading(true);
    fetch("/api/alarms/logs?limit=10")
      .then((r) => r.ok ? r.json() : { logs: [] })
      .then((d) => setNotifications((d.logs || []).map((l: any) => ({ id: l.id, message: l.message, createdAt: l.createdAt, isRead: l.isRead }))))
      .catch(() => {})
      .finally(() => setNotiLoading(false));
  }

  // Search navigation
  const SEARCH_PAGES = [
    { label: "Genel Bakış", href: "/dashboard", keys: "dashboard genel bakış ana sayfa" },
    { label: "Müşteriler", href: "/patients", keys: "müşteri hasta customer" },
    { label: "Randevular", href: "/appointments", keys: "randevu appointment takvim" },
    { label: "Finans", href: "/finance", keys: "finans gelir gider para" },
    { label: "Stok/Envanter", href: "/inventory", keys: "stok envanter ürün product" },
    { label: "Çalışanlar", href: "/employees", keys: "çalışan personel employee" },
    { label: "Belgeler", href: "/hr", keys: "belge hr insan kaynakları onam" },
    { label: "Pazarlama", href: "/marketing", keys: "pazarlama marketing reklam" },
    { label: "Mesajlaşma", href: "/messaging", keys: "mesaj telegram whatsapp" },
    { label: "AI Asistan", href: "/ai-assistant", keys: "ai yapay zeka asistan bot" },
    { label: "Raporlar", href: "/reports", keys: "rapor analiz istatistik" },
    { label: "Alarmlar", href: "/alarmlar", keys: "alarm uyarı bildirim notification" },
    { label: "Hatırlatmalar", href: "/reminders", keys: "hatırlatma reminder" },
    { label: "Abonelik", href: "/billing", keys: "abonelik fatura ödeme billing" },
    { label: "Ayarlar", href: "/settings", keys: "ayar setting profil" },
  ];

  const searchResults = searchQuery.trim()
    ? SEARCH_PAGES.filter((p) => p.keys.includes(searchQuery.toLowerCase()) || p.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="flex h-screen bg-[#F4F6FA]">
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Trial / Subscription Banner */}
        <TrialBanner status={subStatus} trialEnd={subTrialEnd} />

        {/* Top header — sticky on mobile */}
        <header className="sticky top-0 z-30 flex h-12 sm:h-16 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-3 sm:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-[#6C7293] transition-colors hover:bg-[#F3F4F6] hover:text-[#1A1A2E] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm sm:text-lg font-semibold text-[#1A1A2E]">
              {pageTitle}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              onClick={() => { setShowSearch(!showSearch); setShowNotifications(false); setSearchQuery(""); }}
              className={`rounded-lg p-2 transition-colors ${showSearch ? "bg-[#EEF2FF] text-[#6366F1]" : "text-[#6C7293] hover:bg-[#F3F4F6] hover:text-[#1A1A2E]"}`}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <button
              onClick={handleOpenNotifications}
              className={`relative rounded-lg p-2 transition-colors ${showNotifications ? "bg-[#EEF2FF] text-[#6366F1]" : "text-[#6C7293] hover:bg-[#F3F4F6] hover:text-[#1A1A2E]"}`}
            >
              <Bell className="h-5 w-5" />
              {topBarUnreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EF4444]" />
              )}
            </button>

            {/* Divider */}
            <div className="mx-2 h-8 w-px bg-[#E5E7EB] hidden sm:block" />

            {/* User (desktop) */}
            <div className="hidden items-center gap-3 rounded-lg px-2 py-1.5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#818CF8] text-xs font-semibold text-white">
                {(session?.user?.name || "K")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <span className="text-sm font-medium text-[#1A1A2E]">
                {session?.user?.name || "Kullanıcı"}
              </span>
            </div>

            {/* Logout (tablet only, sidebar has its own) */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden rounded-lg p-2 text-[#6C7293] transition-colors hover:bg-red-50 hover:text-red-500 sm:block lg:hidden"
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Search overlay */}
        {showSearch && (
          <div className="border-b border-[#E5E7EB] bg-white px-6 py-3 shadow-sm">
            <div className="mx-auto max-w-xl relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    router.push(searchResults[0].href);
                    setShowSearch(false);
                  }
                  if (e.key === "Escape") setShowSearch(false);
                }}
                placeholder="Sayfa veya modül ara..."
                className="w-full rounded-lg border border-gray-200 bg-[#F9FAFB] pl-10 pr-4 py-2.5 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none"
              />
              {searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">Sonuç bulunamadı</p>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={r.href}
                        onClick={() => { router.push(r.href); setShowSearch(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#EEF2FF] transition-colors text-left"
                      >
                        <Search className="h-3.5 w-3.5 text-gray-400" />
                        {r.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications dropdown */}
        {showNotifications && (
          <div className="absolute right-4 sm:right-6 top-16 z-50 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Bildirimler</h3>
              <div className="flex items-center gap-3">
                {notifications.some(n => !n.isRead) && (
                  <button
                    onClick={async () => {
                      await fetch("/api/alarms/logs/mark-all-read", { method: "POST" }).catch(() => {});
                      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                      setTopBarUnreadCount(0);
                    }}
                    className="text-[11px] font-medium text-gray-500 hover:text-[#6366F1]"
                  >
                    Tümünü Okundu İşaretle
                  </button>
                )}
                <button
                  onClick={() => router.push("/alarmlar")}
                  className="text-xs font-medium text-[#6366F1] hover:underline"
                >
                  Tümünü Gör
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Bildirim yok</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={async () => {
                      if (!n.isRead) {
                        await fetch(`/api/alarms/logs/${n.id}/read`, { method: "POST" }).catch(() => {});
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
                        setTopBarUnreadCount(prev => Math.max(0, prev - 1));
                      }
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${n.isRead ? "bg-white" : "bg-[#EEF2FF]/30"}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6366F1]" />}
                      <div className="min-w-0">
                        <p className="text-gray-700">{n.message}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {(showSearch || showNotifications) && (
          <div className="fixed inset-0 z-40" onClick={() => { setShowSearch(false); setShowNotifications(false); }} />
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-y-auto px-3 py-3 sm:px-6 sm:py-4 pb-20 lg:pb-4">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" as const }}
            className="flex-1"
          >
            {children}
          </motion.div>
          {/* Footer logo — always at bottom */}
          <div className="flex items-center justify-center py-6 mt-auto pt-8 border-t border-gray-100">
            <PobySVG className="h-4 w-auto opacity-20" />
          </div>
        </main>

        {/* ── Mobile Bottom Navigation ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-lg lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center justify-around px-1">
            {[
              { href: "/dashboard", label: "Ana Sayfa", icon: LayoutDashboard },
              { href: "/patients", label: "Müşteriler", icon: Users },
              { href: "/appointments", label: "Randevular", icon: Calendar },
              { href: "/finance", label: "Finans", icon: DollarSign },
              { href: "/settings", label: "Ayarlar", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors ${
                    isActive ? "text-[#6366F1]" : "text-gray-400"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-[#6366F1]" : "text-gray-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
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
        <ConfirmProvider>
          <DashboardContent>{children}</DashboardContent>
        </ConfirmProvider>
        <Toaster />
      </ToastProvider>
    </SessionProvider>
  );
}
