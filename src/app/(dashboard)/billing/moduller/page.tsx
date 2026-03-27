"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  UserCog,
  Package,
  BellRing,
  BarChart3,
  MessageCircle,
  Megaphone,
  Bot,
  Lock,
  Plus,
  Minus,
  Check,
  Loader2,
  HardDrive,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ModulePrice {
  price: number;
  name: string;
  icon: string;
  desc: string;
}

interface StoragePlan {
  name: string;
  sizeMB: number;
  price: number;
  desc: string;
}

interface PlanData {
  id: string;
  status: string;
  trialEnd: string | null;
  activeModules: string[];
  extraUsers: number;
  storagePlan: string;
  storageUsedMb: number;
  monthlyTotal: number;
  discountRate: number;
  cardLast4: string | null;
  cardBrand: string | null;
  nextBillingDate: string | null;
  pricing: {
    subtotal: number;
    discount: number;
    discountRate: number;
    total: number;
    kdv: number;
    totalWithKdv: number;
  };
  modulePrices: Record<string, ModulePrice>;
  storagePlans: Record<string, StoragePlan>;
  lockedModules: string[];
}

/* ------------------------------------------------------------------ */
/*  Icon map                                                          */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  UserCog,
  Package,
  BellRing,
  BarChart3,
  MessageCircle,
  Megaphone,
  Bot,
};

/* ------------------------------------------------------------------ */
/*  Locked-module meta (not returned from API prices)                 */
/* ------------------------------------------------------------------ */

const LOCKED_MODULE_META: Record<
  string,
  { name: string; icon: string; desc: string }
> = {
  marketing: {
    name: "Pazarlama",
    icon: "Megaphone",
    desc: "Kampanya ve pazarlama araclari",
  },
  ai_assistant: {
    name: "AI Asistan",
    icon: "Bot",
    desc: "Yapay zeka destekli asistan",
  },
};

/* ------------------------------------------------------------------ */
/*  Price helpers (mirrors server-side calculateTotal)                */
/* ------------------------------------------------------------------ */

const EXTRA_USER_PRICE = 4900;

function calculateTotal(
  modules: string[],
  extraUsers: number,
  storagePlan: string,
  modulePrices: Record<string, ModulePrice>,
  storagePlans: Record<string, StoragePlan>
) {
  let subtotal = 0;
  for (const mod of modules) {
    const mp = modulePrices[mod];
    if (mp) subtotal += mp.price;
  }

  subtotal += extraUsers * EXTRA_USER_PRICE;

  if (storagePlan && storagePlan !== "free") {
    const sp = storagePlans[storagePlan];
    if (sp) subtotal += sp.price;
  }

  const paidModules = modules.filter(
    (m) => modulePrices[m]?.price > 0
  ).length;

  let discountRate = 0;
  if (paidModules >= 7) discountRate = 25;
  else if (paidModules >= 5) discountRate = 15;
  else if (paidModules >= 3) discountRate = 10;

  const discount = Math.round(subtotal * (discountRate / 100));
  const total = subtotal - discount;
  const kdv = Math.round(total * 20 / 100);
  const totalWithKdv = total + kdv;

  return { subtotal, discount, discountRate, total, kdv, totalWithKdv };
}

function fmt(amount: number) {
  return (amount / 100).toLocaleString("tr-TR");
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ModullerPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<PlanData | null>(null);

  // Editable state
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [extraUsers, setExtraUsers] = useState(0);
  const [storagePlan, setStoragePlan] = useState("free");

  /* ---- fetch on mount ---- */
  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/modules");
      if (!res.ok) throw new Error("Fetch failed");
      const data: PlanData = await res.json();
      setPlan(data);
      setActiveModules(data.activeModules);
      setExtraUsers(data.extraUsers);
      setStoragePlan(data.storagePlan);
    } catch {
      toast({
        title: "Hata",
        description: "Plan bilgileri yüklenemedi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  /* ---- derived pricing ---- */
  const pricing = useMemo(() => {
    if (!plan) return { subtotal: 0, discount: 0, discountRate: 0, total: 0, kdv: 0, totalWithKdv: 0 };
    return calculateTotal(
      activeModules,
      extraUsers,
      storagePlan,
      plan.modulePrices,
      plan.storagePlans
    );
  }, [activeModules, extraUsers, storagePlan, plan]);

  /* ---- helpers ---- */
  const alwaysIncluded = (slug: string) =>
    slug === "base" || slug === "messaging";

  const addModule = (slug: string) => {
    if (!activeModules.includes(slug)) {
      setActiveModules((prev) => [...prev, slug]);
    }
  };

  const removeModule = (slug: string) => {
    if (alwaysIncluded(slug)) return;
    setActiveModules((prev) => prev.filter((m) => m !== slug));
  };

  /* ---- save ---- */
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/billing/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeModules, extraUsers, storagePlan }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Kaydetme başarısız");
      }
      toast({
        title: "Kaydedildi",
        description: "Modül değişiklikleri başarıyla güncellendi.",
      });
      await fetchPlan();
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message || "Bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ---- loading state ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#BE3A21]" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="py-20 text-center text-gray-500">
        Plan bilgisi bulunamadı.
      </div>
    );
  }

  const { modulePrices, storagePlans, lockedModules } = plan;

  // Separate modules into active vs available
  const availableModules = Object.keys(modulePrices).filter(
    (slug) => !activeModules.includes(slug) && !lockedModules.includes(slug)
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modül Yönetimi</h1>
        <p className="text-sm text-gray-500">
          İhtiyacınıza göre modül ekleyin veya kaldırın. Fiyatlar anlık
          güncellenir.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ==================== LEFT COLUMN ==================== */}
        <div className="flex-1 space-y-6">
          {/* ---------- Active Modules ---------- */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="mb-3 text-lg font-semibold">Aktif Modüller</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeModules.map((slug) => {
                const mod = modulePrices[slug];
                if (!mod) return null;
                const Icon = ICON_MAP[mod.icon] || LayoutDashboard;
                const included = alwaysIncluded(slug);

                return (
                  <motion.div
                    key={slug}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between rounded-[4px] border border-[#FDEDEC] bg-[#FFF5F3]/60 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#FDEDEC]">
                        <Icon className="h-5 w-5 text-[#BE3A21]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{mod.name}</p>
                        <p className="text-xs text-gray-500">
                          {mod.price > 0 ? `${fmt(mod.price)} TL/ay + KDV` : "Dahil"}
                        </p>
                      </div>
                    </div>

                    {included ? (
                      <span className="rounded-full bg-[#FDEDEC] px-2.5 py-0.5 text-xs font-medium text-[#9B2D18]">
                        Dahil
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeModule(slug)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Kaldır
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* ---------- Available Modules ---------- */}
          {availableModules.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h2 className="mb-3 text-lg font-semibold">
                Eklenebilir Modüller
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availableModules.map((slug) => {
                  const mod = modulePrices[slug];
                  if (!mod) return null;
                  const Icon = ICON_MAP[mod.icon] || LayoutDashboard;

                  return (
                    <div
                      key={slug}
                      className="flex items-center justify-between rounded-[4px] border border-gray-200 bg-white p-4 transition hover:border-[#FDEDEC]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-gray-100">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{mod.name}</p>
                          <p className="text-xs text-gray-500">
                            {mod.price > 0
                              ? `${fmt(mod.price)} TL/ay + KDV`
                              : "Ücretsiz"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addModule(slug)}
                        className="flex items-center gap-1 rounded-lg border border-[#FDEDEC] bg-white px-3 py-1.5 text-xs font-medium text-[#BE3A21] transition hover:bg-[#FFF5F3]"
                      >
                        Ekle <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ---------- Locked Modules ---------- */}
          {lockedModules.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h2 className="mb-3 text-lg font-semibold">Yakında Gelecek</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lockedModules.map((slug) => {
                  const meta = LOCKED_MODULE_META[slug];
                  if (!meta) return null;
                  const Icon = ICON_MAP[meta.icon] || Lock;

                  return (
                    <div
                      key={slug}
                      className="flex items-center justify-between rounded-[4px] border border-gray-200 bg-gray-50 p-4 opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-gray-200">
                          <Icon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            {meta.name}
                          </p>
                          <p className="text-xs text-gray-400">{meta.desc}</p>
                        </div>
                      </div>

                      <span className="flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                        <Lock className="h-3 w-3" /> Yakında
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ---------- Extra Users ---------- */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <h2 className="mb-3 text-lg font-semibold">Ek Kullanıcılar</h2>
            <div className="flex items-center gap-4 rounded-[4px] border border-gray-200 bg-white p-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Ek Kullanıcı Sayısı</p>
                <p className="text-xs text-gray-500">
                  Her ek kullanıcı {fmt(EXTRA_USER_PRICE)} TL/ay + KDV
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExtraUsers((p) => Math.max(0, p - 1))}
                  disabled={extraUsers === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">
                  {extraUsers}
                </span>
                <button
                  type="button"
                  onClick={() => setExtraUsers((p) => p + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.section>

          {/* ---------- Storage Plan ---------- */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <h2 className="mb-3 text-lg font-semibold">
              <HardDrive className="mr-1.5 inline-block h-5 w-5 text-gray-500" />
              Depolama Planı
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(storagePlans).map(([key, sp]) => {
                const isSelected = storagePlan === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStoragePlan(key)}
                    className={`flex items-center justify-between rounded-[4px] border p-4 text-left transition ${
                      isSelected
                        ? "border-[#BE3A21] bg-[#FFF5F3] ring-1 ring-[#BE3A21]"
                        : "border-gray-200 bg-white hover:border-[#FDEDEC]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{sp.name}</p>
                      <p className="text-xs text-gray-500">{sp.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {sp.price > 0 ? `${fmt(sp.price)} TL/ay + KDV` : "Ücretsiz"}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-[#BE3A21]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>
        </div>

        {/* ==================== RIGHT COLUMN (Summary) ==================== */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="lg:w-80"
        >
          <div className="sticky top-24 space-y-4 rounded-[4px] border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold">Aylık Maliyet Özeti</h3>

            {/* Module lines */}
            <div className="space-y-2 text-sm">
              {activeModules.map((slug) => {
                const mod = modulePrices[slug];
                if (!mod) return null;
                return (
                  <div key={slug} className="flex justify-between">
                    <span className="text-gray-600">{mod.name}</span>
                    <span className="font-medium">
                      {mod.price > 0 ? `${fmt(mod.price)} TL` : "Dahil"}
                    </span>
                  </div>
                );
              })}

              {extraUsers > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Ek Kullanıcı (x{extraUsers})
                  </span>
                  <span className="font-medium">
                    {fmt(extraUsers * EXTRA_USER_PRICE)} TL
                  </span>
                </div>
              )}

              {storagePlan !== "free" && storagePlans[storagePlan] && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Depolama ({storagePlans[storagePlan].name})
                  </span>
                  <span className="font-medium">
                    {fmt(storagePlans[storagePlan].price)} TL
                  </span>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ara Toplam (KDV Hariç)</span>
              <span>{fmt(pricing.subtotal)} TL</span>
            </div>

            {/* Discount */}
            {pricing.discountRate > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>İndirim (%{pricing.discountRate})</span>
                <span>-{fmt(pricing.discount)} TL</span>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* KDV Hariç Toplam */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">KDV Hariç Toplam</span>
              <span>{fmt(pricing.total)} TL</span>
            </div>

            {/* KDV */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">KDV (%20)</span>
              <span>+{fmt(pricing.kdv)} TL</span>
            </div>

            <hr className="border-gray-200" />

            {/* Genel Toplam */}
            <div className="flex justify-between">
              <span className="font-semibold">Genel Toplam (KDV Dahil)</span>
              <span className="text-xl font-bold text-[#BE3A21]">
                {fmt(pricing.totalWithKdv)} TL/ay
              </span>
            </div>

            {pricing.discountRate > 0 && (
              <p className="text-xs text-green-600">
                {pricing.discountRate >= 25
                  ? "7+ modül ile maksimum %25 indirim uygulandı!"
                  : pricing.discountRate >= 15
                    ? "5+ modül ile %15 indirim uygulandı!"
                    : "3+ modül ile %10 indirim uygulandı!"}
              </p>
            )}

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#2B2B2B] py-3 text-sm font-semibold text-white transition hover:bg-[#3A3A3A] disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Değişiklikleri Kaydet"
              )}
            </button>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
