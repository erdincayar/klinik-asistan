"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Check,
  Package,
  Users,
  Cake,
  DollarSign,
  X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/* ──────────────────────── TYPES ──────────────────────── */

interface Alarm {
  id: string;
  name: string;
  type: string;
  conditions: Record<string, any>;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  _count?: { logs: number };
}

interface AlarmLog {
  id: string;
  alarmId: string;
  message: string;
  entityId: string | null;
  entityName: string | null;
  isRead: boolean;
  createdAt: string;
  alarm?: { name: string; type: string };
}

interface Product {
  id: string;
  name: string;
}

/* ──────────────────────── HELPERS ──────────────────────── */

const typeConfig: Record<string, { label: string; icon: typeof Package; color: string }> = {
  STOCK: { label: "Stok", icon: Package, color: "bg-blue-50 text-blue-700" },
  CUSTOMER_VISIT: { label: "Müşteri Ziyareti", icon: Users, color: "bg-purple-50 text-purple-700" },
  CUSTOMER_BIRTHDAY: { label: "Doğum Günü", icon: Cake, color: "bg-pink-50 text-pink-700" },
  FINANCE: { label: "Finans", icon: DollarSign, color: "bg-green-50 text-green-700" },
};

function getConditionSummary(type: string, conditions: Record<string, any>): string {
  switch (type) {
    case "STOCK":
      return `Eşik: ${conditions.thresholdQuantity ?? "?"} adet${conditions.productId ? " (belirli ürün)" : " (tüm ürünler)"}`;
    case "CUSTOMER_VISIT":
      return `Sıklık katı: ${conditions.multiplier ?? 2}x`;
    case "CUSTOMER_BIRTHDAY":
      return `${conditions.daysBefore ?? 3} gün öncesinden`;
    default:
      return "";
  }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-100", className)} />;
}

/* ──────────────────────── MAIN ──────────────────────── */

export default function AlarmsPageWrapper() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="animate-pulse rounded-xl bg-gray-100 h-24" /><div className="animate-pulse rounded-xl bg-gray-100 h-96" /></div>}>
      <AlarmsPage />
    </Suspense>
  );
}

function AlarmsPage() {
  const searchParams = useSearchParams();
  const prefillHandled = useRef(false);

  const [tab, setTab] = useState<"alarms" | "logs">("alarms");
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [logs, setLogs] = useState<AlarmLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  // Stats
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayTriggered, setTodayTriggered] = useState(0);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("STOCK");
  const [formConditions, setFormConditions] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Products for stock alarm
  const [products, setProducts] = useState<Product[]>([]);

  // Log filters
  const [logTypeFilter, setLogTypeFilter] = useState("all");
  const [logUnreadOnly, setLogUnreadOnly] = useState(false);

  // Pre-fill from URL params (customer detail → alarm creation)
  const [prefillCustomerId, setPrefillCustomerId] = useState<string | null>(null);
  const [prefillCustomerName, setPrefillCustomerName] = useState<string | null>(null);

  const fetchAlarms = useCallback(async () => {
    try {
      const res = await fetch("/api/alarms");
      if (res.ok) setAlarms(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (logUnreadOnly) params.set("isRead", "false");
      if (logTypeFilter !== "all") params.set("type", logTypeFilter);
      const res = await fetch(`/api/alarms/logs?${params.toString()}`);
      if (res.ok) setLogs(await res.json());
    } catch { /* silent */ }
  }, [logTypeFilter, logUnreadOnly]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alarms/logs/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchAlarms(), fetchLogs(), fetchUnreadCount()]);
      setLoading(false);
    }
    init();
  }, [fetchAlarms, fetchLogs, fetchUnreadCount]);

  // Handle URL prefill after loading
  useEffect(() => {
    if (loading || prefillHandled.current) return;
    const newAlarm = searchParams.get("newAlarm");
    if (newAlarm === "customer_visit") {
      prefillHandled.current = true;
      const customerId = searchParams.get("customerId");
      const customerName = searchParams.get("customerName");
      setPrefillCustomerId(customerId);
      setPrefillCustomerName(customerName);
      setEditingAlarm(null);
      setFormName(customerName ? `${customerName} - Ziyaret Alarmı` : "Müşteri Ziyaret Alarmı");
      setFormType("CUSTOMER_VISIT");
      setFormConditions({ multiplier: 2, customerId: customerId || undefined });
      setShowDialog(true);
    }
  }, [loading, searchParams]);

  useEffect(() => {
    // Calculate today triggered
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setTodayTriggered(logs.filter((l) => new Date(l.createdAt) >= today).length);
  }, [logs]);

  // Re-fetch logs when filter changes
  useEffect(() => {
    fetchLogs();
  }, [logTypeFilter, logUnreadOnly, fetchLogs]);

  async function handleCheck() {
    setChecking(true);
    try {
      await fetch("/api/alarms/check");
      await Promise.all([fetchAlarms(), fetchLogs(), fetchUnreadCount()]);
    } catch { /* silent */ }
    setChecking(false);
  }

  function openCreateDialog() {
    setEditingAlarm(null);
    setFormName("");
    setFormType("STOCK");
    setFormConditions({});
    setShowDialog(true);
    // Fetch products for stock alarm
    fetch("/api/products")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setProducts(Array.isArray(data) ? data : data.products || []))
      .catch(() => {});
  }

  function openEditDialog(alarm: Alarm) {
    setEditingAlarm(alarm);
    setFormName(alarm.name);
    setFormType(alarm.type);
    setFormConditions(alarm.conditions);
    setShowDialog(true);
    if (alarm.type === "STOCK") {
      fetch("/api/products")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setProducts(Array.isArray(data) ? data : data.products || []))
        .catch(() => {});
    }
  }

  async function handleSaveAlarm() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingAlarm) {
        await fetch(`/api/alarms/${editingAlarm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, conditions: formConditions }),
        });
      } else {
        await fetch("/api/alarms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, type: formType, conditions: formConditions }),
        });
      }
      await fetchAlarms();
      setShowDialog(false);
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleToggleAlarm(alarm: Alarm) {
    try {
      await fetch(`/api/alarms/${alarm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !alarm.isActive }),
      });
      setAlarms((prev) =>
        prev.map((a) => (a.id === alarm.id ? { ...a, isActive: !a.isActive } : a)),
      );
    } catch { /* silent */ }
  }

  async function handleDeleteAlarm(alarmId: string) {
    if (!confirm("Bu alarmı silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/alarms/${alarmId}`, { method: "DELETE" });
      setAlarms((prev) => prev.filter((a) => a.id !== alarmId));
    } catch { /* silent */ }
  }

  async function handleMarkRead(logId: string) {
    try {
      await fetch(`/api/alarms/logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, isRead: true } : l)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }

  const activeAlarmCount = alarms.filter((a) => a.isActive).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-gray-100 bg-white p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <BellRing className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400">Aktif Alarm</p>
              <p className="text-xl font-bold text-gray-900">{activeAlarmCount}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl border border-gray-100 bg-white p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400">Bugün Tetiklenen</p>
              <p className="text-xl font-bold text-gray-900">{todayTriggered}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl border border-gray-100 bg-white p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400">Okunmamış</p>
              <p className="text-xl font-bold text-gray-900">{unreadCount}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tab Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("alarms")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "alarms"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          Alarmlarım
        </button>
        <button
          onClick={() => setTab("logs")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "logs"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          Alarm Geçmişi
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {tab === "alarms" ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Alarm Kuralları</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheck}
                    disabled={checking}
                    className="gap-1.5"
                  >
                    {checking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {checking ? "Kontrol ediliyor..." : "Şimdi Kontrol Et"}
                  </Button>
                  <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Yeni Alarm
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {alarms.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <div className="text-center">
                    <BellRing className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm text-gray-500">Henüz alarm tanımlanmamış</p>
                    <button
                      onClick={openCreateDialog}
                      className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      İlk alarmınızı oluşturun
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {alarms.map((alarm) => {
                    const tc = typeConfig[alarm.type] || typeConfig.STOCK;
                    const Icon = tc.icon;
                    return (
                      <div
                        key={alarm.id}
                        className={cn(
                          "rounded-xl border px-4 py-3 transition-colors",
                          alarm.isActive ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tc.color.split(" ")[0])}>
                              <Icon className={cn("h-4 w-4", tc.color.split(" ")[1])} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{alarm.name}</span>
                                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", tc.color)}>
                                  {tc.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                {getConditionSummary(alarm.type, alarm.conditions)}
                                {alarm.lastTriggeredAt && (
                                  <> &middot; Son: {formatDate(alarm.lastTriggeredAt)}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={alarm.isActive}
                                onChange={() => handleToggleAlarm(alarm)}
                                className="peer sr-only"
                              />
                              <div className="h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
                            </label>
                            <button
                              onClick={() => openEditDialog(alarm)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              title="Düzenle"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteAlarm(alarm.id)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Alarm Geçmişi</CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={logTypeFilter}
                    onChange={(e) => setLogTypeFilter(e.target.value)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="all">Tüm Türler</option>
                    <option value="STOCK">Stok</option>
                    <option value="CUSTOMER_VISIT">Müşteri Ziyareti</option>
                    <option value="CUSTOMER_BIRTHDAY">Doğum Günü</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={logUnreadOnly}
                      onChange={(e) => setLogUnreadOnly(e.target.checked)}
                      className="rounded"
                    />
                    Okunmamış
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <p className="text-sm text-gray-400">Alarm geçmişi boş</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const tc = log.alarm ? typeConfig[log.alarm.type] : null;
                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-4 py-3",
                          log.isRead ? "border-gray-100 bg-white" : "border-blue-100 bg-blue-50/30",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-900">
                              {log.alarm?.name || "Alarm"}
                            </span>
                            {tc && (
                              <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", tc.color)}>
                                {tc.label}
                              </span>
                            )}
                            {!log.isRead && (
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{log.message}</p>
                          <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(log.createdAt)}</p>
                        </div>
                        {!log.isRead && (
                          <button
                            onClick={() => handleMarkRead(log.id)}
                            className="ml-3 shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                          >
                            <Check className="mr-1 inline h-3 w-3" />
                            Okundu
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAlarm ? "Alarm Düzenle" : "Yeni Alarm"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Alarm Adı</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Örn: Stok Düşük Uyarısı"
              />
            </div>

            {!editingAlarm && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Tür</label>
                <select
                  value={formType}
                  onChange={(e) => {
                    setFormType(e.target.value);
                    setFormConditions({});
                  }}
                  className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                >
                  <option value="STOCK">Stok</option>
                  <option value="CUSTOMER_VISIT">Müşteri Ziyareti</option>
                  <option value="CUSTOMER_BIRTHDAY">Doğum Günü</option>
                  <option value="FINANCE" disabled>Finans (Yakında)</option>
                </select>
              </div>
            )}

            {/* Condition fields based on type */}
            {formType === "STOCK" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Ürün (opsiyonel)</label>
                  <select
                    value={formConditions.productId || ""}
                    onChange={(e) =>
                      setFormConditions((prev) => ({ ...prev, productId: e.target.value || undefined }))
                    }
                    className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  >
                    <option value="">Tüm Ürünler</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Eşik Miktar</label>
                  <Input
                    type="number"
                    min={0}
                    value={formConditions.thresholdQuantity ?? 5}
                    onChange={(e) =>
                      setFormConditions((prev) => ({ ...prev, thresholdQuantity: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
            )}

            {formType === "CUSTOMER_VISIT" && (
              <div className="space-y-3">
                {prefillCustomerName && formConditions.customerId && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Müşteri</label>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{prefillCustomerName}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Sıklık Katı</label>
                  <Input
                    type="number"
                    min={1}
                    step={0.5}
                    value={formConditions.multiplier ?? 2}
                    onChange={(e) =>
                      setFormConditions((prev) => ({ ...prev, multiplier: Number(e.target.value) }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Ortalama ziyaret aralığının kaç katı geçince uyarılsın
                  </p>
                </div>
              </div>
            )}

            {formType === "CUSTOMER_BIRTHDAY" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Kaç Gün Önce Uyar</label>
                <Input
                  type="number"
                  min={0}
                  value={formConditions.daysBefore ?? 3}
                  onChange={(e) =>
                    setFormConditions((prev) => ({ ...prev, daysBefore: Number(e.target.value) }))
                  }
                />
              </div>
            )}

            {formType === "FINANCE" && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3">
                <Bell className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">Finans alarmları yakında eklenecek</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveAlarm} disabled={saving || !formName.trim() || formType === "FINANCE"}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : editingAlarm ? (
                "Güncelle"
              ) : (
                "Oluştur"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
