"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Cake, DollarSign, Zap, SlidersHorizontal, Loader2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface BulkAlarmDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface PreviewCustomer {
  id: string;
  name: string;
  treatmentCount?: number;
  avgInterval?: number | null;
  thresholdDays?: number;
  mode?: string;
}

interface PreviewData {
  total: number;
  smartCount?: number;
  defaultCount?: number;
  customers: PreviewCustomer[];
}

const STEPS = ["Tür Seç", "Koşul Ayarla", "Önizleme"];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < currentStep
                  ? "bg-blue-600 text-white"
                  : i === currentStep
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-400",
              )}
            >
              {i < currentStep ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className={cn("text-[10px] font-medium", i <= currentStep ? "text-gray-700" : "text-gray-400")}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-px w-8 mb-4", i < currentStep ? "bg-blue-600" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BulkAlarmDrawer({ open, onOpenChange, onComplete }: BulkAlarmDrawerProps) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<"CUSTOMER_VISIT" | "CUSTOMER_BIRTHDAY" | null>(null);

  // Conditions
  const [mode, setMode] = useState<"smart" | "manual">("smart");
  const [multiplier, setMultiplier] = useState(2);
  const [defaultThreshold, setDefaultThreshold] = useState(60);
  const [thresholdDays, setThresholdDays] = useState(60);
  const [daysBefore, setDaysBefore] = useState(3);
  const [groupName, setGroupName] = useState("");

  // Preview
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Create
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [createResult, setCreateResult] = useState<{ created: number; total: number } | null>(null);

  const reset = useCallback(() => {
    setStep(0);
    setType(null);
    setMode("smart");
    setMultiplier(2);
    setDefaultThreshold(60);
    setThresholdDays(60);
    setDaysBefore(3);
    setGroupName("");
    setPreview(null);
    setLoadingPreview(false);
    setCreating(false);
    setProgress(0);
    setDone(false);
    setCreateResult(null);
  }, []);

  function handleClose(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  function handleSelectType(t: "CUSTOMER_VISIT" | "CUSTOMER_BIRTHDAY") {
    setType(t);
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
    if (t === "CUSTOMER_VISIT") {
      setGroupName(`Toplu Ziyaret Alarmı - ${dateStr}`);
    } else {
      setGroupName(`Toplu Doğum Günü Alarmı - ${dateStr}`);
    }
    setStep(1);
  }

  async function handleLoadPreview() {
    if (!type) return;
    setLoadingPreview(true);
    try {
      const params = new URLSearchParams({ type });
      if (type === "CUSTOMER_VISIT") {
        params.set("mode", mode);
        params.set("multiplier", String(multiplier));
        params.set("defaultThreshold", String(defaultThreshold));
        params.set("thresholdDays", String(thresholdDays));
      } else {
        params.set("daysBefore", String(daysBefore));
      }
      const res = await fetch(`/api/alarms/bulk-preview?${params.toString()}`);
      if (res.ok) {
        setPreview(await res.json());
        setStep(2);
      }
    } catch { /* silent */ }
    setLoadingPreview(false);
  }

  async function handleCreate() {
    if (!type || !groupName.trim()) return;
    setCreating(true);
    setProgress(10);

    // Animate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85));
    }, 200);

    try {
      const body: any = { type, groupName: groupName.trim(), mode };
      if (type === "CUSTOMER_VISIT") {
        body.multiplier = multiplier;
        body.defaultThreshold = defaultThreshold;
        body.thresholdDays = thresholdDays;
      } else {
        body.daysBefore = daysBefore;
      }

      const res = await fetch("/api/alarms/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      clearInterval(interval);

      if (res.ok) {
        const data = await res.json();
        setCreateResult({ created: data.total, total: data.total });
        setProgress(100);
        setDone(true);
        onComplete();
      } else {
        setProgress(0);
        setCreating(false);
      }
    } catch {
      clearInterval(interval);
      setProgress(0);
      setCreating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:!max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Toplu Alarm Oluştur</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <StepIndicator currentStep={step} />

          <AnimatePresence mode="wait">
            {/* Step 0: Type Selection */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-sm text-gray-500 mb-4">Tüm müşterilerinize uygulanacak alarm türünü seçin.</p>

                <button
                  onClick={() => handleSelectType("CUSTOMER_VISIT")}
                  className="w-full rounded-xl border-2 border-gray-100 p-4 text-left transition-all hover:border-purple-200 hover:bg-purple-50/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Müşteri Ziyareti</p>
                      <p className="text-xs text-gray-500">Ziyaret sıklığına göre kayıp müşteri uyarısı</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectType("CUSTOMER_BIRTHDAY")}
                  className="w-full rounded-xl border-2 border-gray-100 p-4 text-left transition-all hover:border-pink-200 hover:bg-pink-50/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
                      <Cake className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Doğum Günü</p>
                      <p className="text-xs text-gray-500">Doğum günü yaklaşan müşterileri hatırlat</p>
                    </div>
                  </div>
                </button>

                <div className="w-full rounded-xl border-2 border-gray-100 p-4 opacity-40 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Finans</p>
                      <p className="text-xs text-gray-500">Yakında eklenecek</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Conditions */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {type === "CUSTOMER_VISIT" && (
                  <>
                    {/* Smart/Manual toggle */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-gray-600">Mod</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setMode("smart")}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all",
                            mode === "smart"
                              ? "border-blue-500 bg-blue-50/50"
                              : "border-gray-100 hover:border-gray-200",
                          )}
                        >
                          <Zap className={cn("h-4 w-4", mode === "smart" ? "text-blue-600" : "text-gray-400")} />
                          <div>
                            <p className={cn("text-xs font-semibold", mode === "smart" ? "text-blue-700" : "text-gray-700")}>Akıllı</p>
                            <p className="text-[10px] text-gray-400">Kişiye özel</p>
                          </div>
                        </button>
                        <button
                          onClick={() => setMode("manual")}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all",
                            mode === "manual"
                              ? "border-blue-500 bg-blue-50/50"
                              : "border-gray-100 hover:border-gray-200",
                          )}
                        >
                          <SlidersHorizontal className={cn("h-4 w-4", mode === "manual" ? "text-blue-600" : "text-gray-400")} />
                          <div>
                            <p className={cn("text-xs font-semibold", mode === "manual" ? "text-blue-700" : "text-gray-700")}>Manuel</p>
                            <p className="text-[10px] text-gray-400">Sabit gün</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {mode === "smart" ? (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-600">Sıklık Katı</label>
                          <Input
                            type="number"
                            min={1}
                            step={0.5}
                            value={multiplier}
                            onChange={(e) => setMultiplier(Number(e.target.value))}
                          />
                          <p className="mt-1 text-[10px] text-gray-400">
                            Ortalama ziyaret aralığının kaç katı geçince uyarılsın
                          </p>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-600">Varsayılan Eşik (gün)</label>
                          <Input
                            type="number"
                            min={1}
                            value={defaultThreshold}
                            onChange={(e) => setDefaultThreshold(Number(e.target.value))}
                          />
                          <p className="mt-1 text-[10px] text-gray-400">
                            3&apos;ten az ziyareti olan müşteriler için varsayılan eşik
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">Eşik (gün)</label>
                        <Input
                          type="number"
                          min={1}
                          value={thresholdDays}
                          onChange={(e) => setThresholdDays(Number(e.target.value))}
                        />
                        <p className="mt-1 text-[10px] text-gray-400">
                          Tüm müşteriler için sabit eşik süresi
                        </p>
                      </div>
                    )}
                  </>
                )}

                {type === "CUSTOMER_BIRTHDAY" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Kaç Gün Önce Uyar</label>
                    <Input
                      type="number"
                      min={0}
                      value={daysBefore}
                      onChange={(e) => setDaysBefore(Number(e.target.value))}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Grup Adı</label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Toplu Alarm Grubu"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="gap-1.5">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Geri
                  </Button>
                  <Button
                    onClick={handleLoadPreview}
                    disabled={loadingPreview || !groupName.trim()}
                    className="flex-1 gap-1.5"
                  >
                    {loadingPreview ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    Önizleme
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Preview & Create */}
            {step === 2 && !done && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {preview && (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-blue-50 p-3 text-center">
                        <p className="text-xl font-bold text-blue-700">{preview.total}</p>
                        <p className="text-[10px] font-medium text-blue-600">Toplam Müşteri</p>
                      </div>
                      {type === "CUSTOMER_VISIT" && preview.smartCount !== undefined && (
                        <>
                          <div className="rounded-xl bg-purple-50 p-3 text-center">
                            <p className="text-xl font-bold text-purple-700">{preview.smartCount}</p>
                            <p className="text-[10px] font-medium text-purple-600">Akıllı Eşik</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Customer List */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        Müşteri Listesi ({preview.customers.length})
                      </p>
                      <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-gray-100 p-2">
                        {preview.customers.slice(0, 100).map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-gray-50">
                            <span className="font-medium text-gray-700">{c.name}</span>
                            <div className="flex items-center gap-2">
                              {c.thresholdDays && (
                                <span className="text-gray-400">{c.thresholdDays} gün</span>
                              )}
                              {c.mode && (
                                <span className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[9px] font-semibold",
                                  c.mode === "smart"
                                    ? "bg-purple-50 text-purple-600"
                                    : c.mode === "default"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-gray-100 text-gray-500",
                                )}>
                                  {c.mode === "smart" ? "Akıllı" : c.mode === "default" ? "Varsayılan" : "Manuel"}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {preview.customers.length > 100 && (
                          <p className="text-center text-[10px] text-gray-400 py-1">
                            ve {preview.customers.length - 100} müşteri daha...
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Progress Bar (during creation) */}
                {creating && (
                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className="h-full bg-blue-600 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-center text-xs text-gray-500">Alarmlar oluşturuluyor...</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={creating} className="gap-1.5">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Geri
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 gap-1.5"
                  >
                    {creating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {creating ? "Oluşturuluyor..." : "Alarmları Kur"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Done */}
            {done && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-8"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">Tamamlandı!</p>
                <p className="text-sm text-gray-500">
                  {createResult?.total} müşteri için alarm oluşturuldu.
                </p>
                <Button onClick={() => handleClose(false)} className="mt-2">
                  Kapat
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
