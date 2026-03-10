"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Trash2,
  Send,
  QrCode,
  CheckCircle,
  Loader2,
  Link as LinkIcon,
  X,
  Copy,
  Check,
  Target,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  Phone,
  Coins,
  HardDrive,
  Zap,
  Crown,
  CreditCard,
} from "lucide-react";
import { TREATMENT_CATEGORIES } from "@/lib/types";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ClinicSettings {
  clinicName: string;
  phone: string;
  address: string;
  vatRate: number;
  storageLimitMB?: number;
  storageUsedMB?: number;
  storagePlan?: string;
  plan?: string;
}

interface TokenBalanceData {
  balance: number;
  totalUsed: number;
  totalBought: number;
}

interface TokenTransactionData {
  id: string;
  type: string;
  amount: number;
  action: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

interface Reminder {
  id: string;
  treatmentCategory: string;
  intervalDays: number;
  messageTemplate: string;
  isActive: boolean;
}

interface TelegramLink {
  code: string;
  link: string;
  expiresAt: string;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className || ""}`} />;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings>({
    clinicName: "",
    phone: "",
    address: "",
    vatRate: 20,
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New reminder form
  const [newReminder, setNewReminder] = useState({
    treatmentCategory: "",
    intervalDays: "",
    messageTemplate: "",
  });
  const [reminderSaving, setReminderSaving] = useState(false);

  // Meta Ads
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [metaForm, setMetaForm] = useState({ appId: "", accessToken: "", adAccountId: "" });
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaTesting, setMetaTesting] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{ success: boolean; name?: string; error?: string } | null>(null);
  const [metaError, setMetaError] = useState("");
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [metaHowTo, setMetaHowTo] = useState(false);
  const [metaTokenExpiresAt, setMetaTokenExpiresAt] = useState<string | null>(null);

  // WhatsApp
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState("");
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappTesting, setWhatsappTesting] = useState(false);
  const [whatsappError, setWhatsappError] = useState("");

  // Token & Storage
  const [tokenBalance, setTokenBalance] = useState<TokenBalanceData | null>(null);
  const [tokenHistory, setTokenHistory] = useState<TokenTransactionData[]>([]);

  // Payment
  const [paytrToken, setPaytrToken] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState("");

  // Telegram
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramLink, setTelegramLink] = useState<TelegramLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, remindersRes, tokensRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/settings/reminders"),
          fetch("/api/settings/tokens"),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings({
            clinicName: data.clinicName || "",
            phone: data.phone || "",
            address: data.address || "",
            vatRate: data.vatRate ?? 20,
            storageLimitMB: data.storageLimitMB,
            storageUsedMB: data.storageUsedMB,
            storagePlan: data.storagePlan,
            plan: data.plan,
          });
          if (data.metaConnected) {
            setMetaConnected(true);
            setMetaAdAccountId(data.metaAdAccountId || "");
            setMetaTokenExpiresAt(data.metaTokenExpiresAt || null);
          }
          if (data.whatsappConnected) {
            setWhatsappConnected(true);
            setWhatsappPhone(data.whatsappPhone || "");
          }
        }

        if (remindersRes.ok) {
          const data = await remindersRes.json();
          setReminders(data);
        }

        if (tokensRes.ok) {
          const tokenData = await tokensRes.json();
          setTokenBalance(tokenData.balance);
          setTokenHistory(tokenData.history || []);
        }
      } catch {
        setError("Ayarlar yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Check telegram status
  const checkTelegramStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/telegram/status");
      if (res.ok) {
        const data = await res.json();
        setTelegramConnected(data.connected);
        if (data.connected && showTelegramModal) {
          setShowTelegramModal(false);
          setTelegramLink(null);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setTelegramLoading(false);
    }
  }, [showTelegramModal]);

  useEffect(() => {
    checkTelegramStatus();
  }, [checkTelegramStatus]);

  // Poll telegram status every 5 seconds when modal is open
  useEffect(() => {
    if (!showTelegramModal) return;
    const interval = setInterval(checkTelegramStatus, 5000);
    return () => clearInterval(interval);
  }, [showTelegramModal, checkTelegramStatus]);

  // Countdown timer
  useEffect(() => {
    if (!telegramLink) return;
    const expiresAt = new Date(telegramLink.expiresAt).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setTelegramLink(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [telegramLink]);

  async function handleGenerateTelegramLink() {
    try {
      const res = await fetch("/api/settings/telegram/generate-link", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramLink(data);
        // Generate QR code
        const dataUrl = await QRCode.toDataURL(data.link, {
          width: 200,
          margin: 2,
          color: { dark: "#1e40af", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
        setShowTelegramModal(true);
      }
    } catch {
      setError("Telegram bağlantı kodu oluşturulamadı");
    }
  }

  async function handleDisconnectTelegram() {
    try {
      const res = await fetch("/api/settings/telegram/status", {
        method: "DELETE",
      });
      if (res.ok) {
        setTelegramConnected(false);
      }
    } catch {
      // Silently fail
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Ayarlar kaydedilemedi");
      setSuccess("Ayarlar kaydedildi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault();
    setReminderSaving(true);

    try {
      const res = await fetch("/api/settings/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentCategory: newReminder.treatmentCategory,
          intervalDays: Number(newReminder.intervalDays),
          messageTemplate: newReminder.messageTemplate,
          isActive: true,
        }),
      });

      if (!res.ok) throw new Error("Hatırlatma eklenemedi");
      const created = await res.json();
      setReminders([...reminders, created]);
      setNewReminder({ treatmentCategory: "", intervalDays: "", messageTemplate: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setReminderSaving(false);
    }
  }

  async function handleToggleReminder(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/settings/reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        setReminders(
          reminders.map((r) =>
            r.id === id ? { ...r, isActive: !isActive } : r
          )
        );
      }
    } catch {
      // Silently fail toggle
    }
  }

  async function handleDeleteReminder(id: string) {
    try {
      const res = await fetch(`/api/settings/reminders/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setReminders(reminders.filter((r) => r.id !== id));
      }
    } catch {
      // Silently fail delete
    }
  }

  function getCategoryLabel(value: string): string {
    return TREATMENT_CATEGORIES.find((c) => c.value === value)?.label || value;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePayment(paymentType: string, packageId: string) {
    const loadingKey = `${paymentType}_${packageId}`;
    setPaymentLoading(loadingKey);
    try {
      const res = await fetch("/api/payment/paytr/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType, packageId }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setPaytrToken(data.token);
        setShowPaymentModal(true);
      } else {
        setError(data.error || "Ödeme başlatılamadı");
      }
    } catch {
      setError("Ödeme başlatılamadı");
    } finally {
      setPaymentLoading("");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clinic Settings */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <SettingsIcon className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">İşletme Bilgileri</h2>
        </div>
        <form onSubmit={handleSaveSettings} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">İşletme Adı</label>
              <input
                value={settings.clinicName}
                onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                placeholder="İşletme adı"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Telefon</label>
              <input
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                placeholder="Telefon"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Adres</label>
            <textarea
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              rows={2}
              className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              placeholder="Adres"
            />
          </div>
          <div className="w-32">
            <label className="mb-1.5 block text-xs font-medium text-gray-600">KDV Oranı (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.vatRate}
              onChange={(e) => setSettings({ ...settings, vatRate: Number(e.target.value) })}
              className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </motion.div>

      {/* Meta Ads Connection */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Target className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Meta Reklam Bağlantısı</h2>
        </div>
        <div className="p-6">
          {metaConnected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-green-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Meta Hesabı: Bağlı</p>
                    <p className="text-xs text-green-600">Reklam Hesabı: {metaAdAccountId}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/ads/disconnect", { method: "DELETE" });
                      if (res.ok) {
                        setMetaConnected(false);
                        setMetaAdAccountId("");
                        setMetaTokenExpiresAt(null);
                      }
                    } catch { /* silent */ }
                  }}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  Bağlantıyı Kaldır
                </button>
              </div>
              {(() => {
                if (!metaTokenExpiresAt) return null;
                const expiresAt = new Date(metaTokenExpiresAt);
                const now = new Date();
                const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft <= 0;
                const isExpiringSoon = daysLeft > 0 && daysLeft <= 10;

                if (!isExpired && !isExpiringSoon) {
                  return (
                    <p className="text-xs text-gray-400 px-1">
                      Token suresi: {expiresAt.toLocaleDateString("tr-TR")} ({daysLeft} gun kaldi)
                    </p>
                  );
                }

                return (
                  <div className={`flex items-center justify-between rounded-xl px-5 py-4 ${isExpired ? "bg-red-50" : "bg-amber-50"}`}>
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`h-5 w-5 ${isExpired ? "text-red-600" : "text-amber-600"}`} />
                      <div>
                        <p className={`text-sm font-semibold ${isExpired ? "text-red-800" : "text-amber-800"}`}>
                          {isExpired
                            ? "Meta token suresi dolmus!"
                            : `Meta token ${daysLeft} gun sonra dolacak`}
                        </p>
                        <p className={`text-xs ${isExpired ? "text-red-600" : "text-amber-600"}`}>
                          {isExpired
                            ? "Yeni token ile tekrar baglanti kurun"
                            : "Yenilemek icin baglantiyi kesip tekrar baglayin"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch("/api/ads/disconnect", { method: "DELETE" });
                          setMetaConnected(false);
                          setMetaAdAccountId("");
                          setMetaTokenExpiresAt(null);
                        } catch { /* silent */ }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                        isExpired
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Yenile
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Meta App ID</label>
                  <input
                    value={metaForm.appId}
                    onChange={(e) => setMetaForm({ ...metaForm, appId: e.target.value })}
                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    placeholder="123456789..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Ad Account ID</label>
                  <input
                    value={metaForm.adAccountId}
                    onChange={(e) => setMetaForm({ ...metaForm, adAccountId: e.target.value })}
                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    placeholder="act_123456789..."
                  />
                  <p className="mt-1 text-[11px] text-gray-400">act_ prefix ile birlikte girin</p>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Access Token</label>
                <div className="relative">
                  <input
                    type={showMetaToken ? "text" : "password"}
                    value={metaForm.accessToken}
                    onChange={(e) => setMetaForm({ ...metaForm, accessToken: e.target.value })}
                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    placeholder="EAA..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowMetaToken(!showMetaToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {metaTestResult && (
                <div className={`rounded-xl px-4 py-3 text-sm ${metaTestResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {metaTestResult.success ? (
                    <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Bağlantı başarılı{metaTestResult.name ? ` — ${metaTestResult.name}` : ""}</span>
                  ) : (
                    <span>{metaTestResult.error || "Bağlantı hatası"}</span>
                  )}
                </div>
              )}
              {metaError && <p className="text-sm text-red-500">{metaError}</p>}

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!metaForm.appId || !metaForm.accessToken || !metaForm.adAccountId) {
                      setMetaError("Tüm alanları doldurun");
                      return;
                    }
                    setMetaSaving(true);
                    setMetaError("");
                    try {
                      const res = await fetch("/api/ads/connect", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(metaForm),
                      });
                      if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error);
                      }
                      setMetaConnected(true);
                      setMetaAdAccountId(metaForm.adAccountId.startsWith("act_") ? metaForm.adAccountId : `act_${metaForm.adAccountId}`);
                      setMetaForm({ appId: "", accessToken: "", adAccountId: "" });
                    } catch (err) {
                      setMetaError(err instanceof Error ? err.message : "Bağlantı hatası");
                    } finally {
                      setMetaSaving(false);
                    }
                  }}
                  disabled={metaSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {metaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Bağlantıyı Kaydet
                </button>
                <button
                  onClick={async () => {
                    if (!metaForm.appId || !metaForm.accessToken || !metaForm.adAccountId) {
                      setMetaError("Önce tüm alanları doldurun");
                      return;
                    }
                    setMetaTesting(true);
                    setMetaError("");
                    setMetaTestResult(null);
                    try {
                      // Save first, then test
                      await fetch("/api/ads/connect", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(metaForm),
                      });
                      const res = await fetch("/api/ads/test-connection", { method: "POST" });
                      const data = await res.json();
                      setMetaTestResult(data);
                      if (data.success) {
                        setMetaConnected(true);
                        setMetaAdAccountId(metaForm.adAccountId.startsWith("act_") ? metaForm.adAccountId : `act_${metaForm.adAccountId}`);
                      } else {
                        // Remove connection if test fails
                        await fetch("/api/ads/disconnect", { method: "DELETE" });
                      }
                    } catch {
                      setMetaTestResult({ success: false, error: "Test hatası" });
                    } finally {
                      setMetaTesting(false);
                    }
                  }}
                  disabled={metaTesting}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {metaTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Bağlantıyı Test Et
                </button>
              </div>

              {/* How-to accordion */}
              <button
                onClick={() => setMetaHowTo(!metaHowTo)}
                className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                <span>Nasıl yapılır? Token alma adımları</span>
                {metaHowTo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {metaHowTo && (
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600 space-y-2">
                  <p><strong>1.</strong> developers.facebook.com adresine gidin ve bir uygulama oluşturun.</p>
                  <p><strong>2.</strong> Uygulama Dashboard → Settings → Basic → App ID&apos;yi kopyalayın.</p>
                  <p><strong>3.</strong> Tools → Graph API Explorer → Token oluşturun (ads_management, ads_read izinleri).</p>
                  <p><strong>4.</strong> Business Settings → Ad Accounts → Hesap ID&apos;nizi kopyalayın (act_ ile başlar).</p>
                  <p><strong>5.</strong> Uzun süreli token için: Settings → Advanced → System Users → token oluşturun.</p>
                  <p className="flex items-center gap-1 text-blue-600">
                    <ExternalLink className="h-3 w-3" />
                    <a href="https://developers.facebook.com/docs/marketing-apis" target="_blank" rel="noopener noreferrer" className="underline">
                      Meta Marketing API Dokümantasyonu
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Telegram Connection */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Send className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Telegram Bağlantısı</h2>
        </div>
        <div className="p-6">
          {telegramLoading ? (
            <Skeleton className="h-20" />
          ) : telegramConnected ? (
            <div className="flex items-center justify-between rounded-xl bg-green-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Telegram Bağlı</p>
                  <p className="text-xs text-green-600">Bot başarıyla bağlandı</p>
                </div>
              </div>
              <button
                onClick={handleDisconnectTelegram}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Bağlantıyı Kaldır
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <p className="mb-1 text-sm font-medium text-gray-800">Telegram ile Bağlan</p>
              <p className="mb-4 text-xs text-gray-500">
                Telegram botunu bağlayarak mesaj ile işlem yapın
              </p>
              <button
                onClick={handleGenerateTelegramLink}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <QrCode className="h-4 w-4" />
                Telegram Bağla
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Telegram Modal */}
      {showTelegramModal && telegramLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowTelegramModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Telegram Bağla</h3>
              <button
                onClick={() => setShowTelegramModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="h-48 w-48 rounded-xl" />
              )}
            </div>

            {/* Link */}
            <div className="mb-4 rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-xs text-gray-500">veya bu linki kullanın:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate text-xs text-blue-600">
                  {telegramLink.link}
                </code>
                <button
                  onClick={() => copyToClipboard(telegramLink.link)}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-200"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <LinkIcon className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-500">
                Kod geçerliliği:{" "}
                <span className={`font-semibold ${countdown < 60 ? "text-red-500" : "text-gray-800"}`}>
                  {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
                </span>
              </span>
            </div>

            <p className="mt-3 text-center text-[11px] text-gray-400">
              QR kodu telefonunuzla okutun veya linki Telegram&apos;da açın
            </p>
          </motion.div>
        </div>
      )}

      {/* WhatsApp Connection */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-semibold text-gray-900">WhatsApp Bağlantısı</h2>
        </div>
        <div className="p-6">
          {whatsappConnected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-green-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">WhatsApp: Bağlı</p>
                    <p className="text-xs text-green-600">Numara: {whatsappPhone}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/whatsapp/disconnect", { method: "DELETE" });
                      if (res.ok) {
                        setWhatsappConnected(false);
                        setWhatsappPhone("");
                      }
                    } catch { /* silent */ }
                  }}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  Bağlantıyı Kaldır
                </button>
              </div>
              <button
                onClick={async () => {
                  setWhatsappTesting(true);
                  setWhatsappError("");
                  try {
                    const res = await fetch("/api/whatsapp/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        to: whatsappPhone,
                        message: "✅ Poby WhatsApp bağlantı testi başarılı!",
                      }),
                    });
                    const data = await res.json();
                    if (!data.success) {
                      setWhatsappError(data.message || "Test mesajı gönderilemedi");
                    }
                  } catch {
                    setWhatsappError("Test mesajı gönderilemedi");
                  } finally {
                    setWhatsappTesting(false);
                  }
                }}
                disabled={whatsappTesting}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {whatsappTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Test Mesajı Gönder
              </button>
              {whatsappError && (
                <p className="text-xs text-red-500">{whatsappError}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="mb-1 text-sm font-medium text-gray-800">WhatsApp ile Bağlan</p>
                <p className="mb-4 text-xs text-gray-500">
                  WhatsApp Business API ile mesaj alın ve gönderin
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Telefon Numarası
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={whatsappPhoneInput}
                      onChange={(e) => setWhatsappPhoneInput(e.target.value)}
                      placeholder="+905551234567"
                      className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!whatsappPhoneInput.trim()) {
                        setWhatsappError("Telefon numarası girin");
                        return;
                      }
                      setWhatsappSaving(true);
                      setWhatsappError("");
                      try {
                        const res = await fetch("/api/whatsapp/connect", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phone: whatsappPhoneInput.trim() }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setWhatsappConnected(true);
                          setWhatsappPhone(data.phone);
                          setWhatsappPhoneInput("");
                        } else {
                          setWhatsappError(data.error || "Bağlantı hatası");
                        }
                      } catch {
                        setWhatsappError("Bağlantı kurulamadı");
                      } finally {
                        setWhatsappSaving(false);
                      }
                    }}
                    disabled={whatsappSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {whatsappSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Bağlan
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  WhatsApp Business API ile kullanılan numara (ülke kodu ile)
                </p>
              </div>
              {whatsappError && (
                <p className="text-sm text-red-500">{whatsappError}</p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Subscription Plans */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.09 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Crown className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-900">Abonelik Planları</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { id: "STARTER", name: "Başlangıç", price: "₺499", tokens: "50K", storage: "1 GB", features: ["AI Asistan", "Temel Raporlar"] },
              { id: "PRO", name: "Profesyonel", price: "₺999", tokens: "200K", storage: "5 GB", popular: true, features: ["Gelişmiş AI", "WhatsApp", "Reklam"] },
              { id: "BUSINESS", name: "İşletme", price: "₺1.999", tokens: "500K", storage: "20 GB", features: ["Sınırsız AI", "Öncelikli Destek", "API"] },
            ].map((plan) => {
              const isCurrent = settings.plan === plan.id;
              const planOrder = ["STARTER", "PRO", "BUSINESS"];
              const currentIndex = planOrder.indexOf(settings.plan || "STARTER");
              const planIndex = planOrder.indexOf(plan.id);
              const isUpgrade = planIndex > currentIndex;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border p-5 ${
                    plan.popular
                      ? "border-blue-200 bg-blue-50/30 ring-1 ring-blue-100"
                      : isCurrent
                      ? "border-green-200 bg-green-50/30"
                      : "border-gray-100"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-semibold text-white">
                      Popüler
                    </span>
                  )}
                  <p className="text-base font-bold text-gray-900">{plan.name}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {plan.price}<span className="text-xs font-normal text-gray-400">/ay</span>
                  </p>
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    <p>{plan.tokens} token/ay</p>
                    <p>{plan.storage} depolama</p>
                    {plan.features.map((f) => (
                      <p key={f} className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {f}
                      </p>
                    ))}
                  </div>
                  <div className="mt-4">
                    {isCurrent ? (
                      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-100 px-3 py-2 text-xs font-semibold text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Mevcut Plan
                      </span>
                    ) : isUpgrade ? (
                      <button
                        onClick={() => handlePayment("SUBSCRIPTION", plan.id)}
                        disabled={paymentLoading === `SUBSCRIPTION_${plan.id}`}
                        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        {paymentLoading === `SUBSCRIPTION_${plan.id}` ? (
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        ) : (
                          "Yükselt"
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex w-full items-center justify-center rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-400">
                        Mevcut planınız daha üst
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Token Management */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Coins className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-900">Token Yönetimi</h2>
        </div>
        <div className="p-6 space-y-6">
          {tokenBalance && (
            <>
              {/* Balance Card */}
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Token Bakiyesi</span>
                  <span className="text-xs text-gray-500">
                    Toplam: {(tokenBalance.totalBought + 50000).toLocaleString("tr-TR")}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-3">
                  {tokenBalance.balance.toLocaleString("tr-TR")} token
                </p>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      tokenBalance.balance < 5000
                        ? "bg-red-500"
                        : tokenBalance.balance < 20000
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, (tokenBalance.balance / (tokenBalance.totalBought + 50000)) * 100)}%`,
                    }}
                  />
                </div>
                {tokenBalance.totalUsed > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Toplam kullanılan: {tokenBalance.totalUsed.toLocaleString("tr-TR")} token
                  </p>
                )}
              </div>

              {/* Token Packages */}
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3">Token Paketleri</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { id: "TOKEN_100K", name: "Başlangıç", tokens: 100000, price: 79 },
                    { id: "TOKEN_500K", name: "Popüler", tokens: 500000, price: 349, popular: true },
                    { id: "TOKEN_1500K", name: "İşletme", tokens: 1500000, price: 899 },
                  ].map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`rounded-xl border p-4 text-center ${
                        pkg.popular
                          ? "border-blue-200 bg-blue-50/50 ring-1 ring-blue-100"
                          : "border-gray-100"
                      }`}
                    >
                      {pkg.popular && (
                        <span className="mb-2 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          Popüler
                        </span>
                      )}
                      <p className="text-sm font-semibold text-gray-900">{pkg.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pkg.tokens.toLocaleString("tr-TR")} token
                      </p>
                      <p className="mt-2 text-lg font-bold text-gray-900">
                        ₺{pkg.price}
                      </p>
                      <button
                        onClick={() => handlePayment("TOKEN_PACKAGE", pkg.id)}
                        disabled={paymentLoading === `TOKEN_PACKAGE_${pkg.id}`}
                        className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        {paymentLoading === `TOKEN_PACKAGE_${pkg.id}` ? (
                          <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Satın Al"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage History */}
              {tokenHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-800 mb-3">Kullanım Geçmişi</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 font-medium text-gray-500">Tarih</th>
                          <th className="pb-2 font-medium text-gray-500">İşlem</th>
                          <th className="pb-2 font-medium text-gray-500 text-right">Miktar</th>
                          <th className="pb-2 font-medium text-gray-500 text-right">Bakiye</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tokenHistory.slice(0, 20).map((tx) => (
                          <tr key={tx.id} className="border-b border-gray-50">
                            <td className="py-2 text-gray-600">
                              {new Date(tx.createdAt).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-2 text-gray-700">{tx.description || tx.action}</td>
                            <td className={`py-2 text-right font-medium ${tx.type === "USE" ? "text-red-600" : "text-green-600"}`}>
                              {tx.type === "USE" ? "-" : "+"}{tx.amount.toLocaleString("tr-TR")}
                            </td>
                            <td className="py-2 text-right text-gray-600">
                              {tx.balanceAfter.toLocaleString("tr-TR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Storage */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <HardDrive className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Depolama</h2>
        </div>
        <div className="p-6 space-y-6">
          {(() => {
            const used = settings.storageUsedMB || 0;
            const limit = settings.storageLimitMB || 1024;
            const pct = Math.min(100, (used / limit) * 100);
            const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500";
            return (
              <div className="rounded-xl bg-gray-50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Kullanılan Alan</span>
                  <span className="text-xs text-gray-500">{used} MB / {limit} MB</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Plan: {settings.storagePlan === "free" ? "Ücretsiz" : settings.storagePlan}
                </p>
              </div>
            );
          })()}

          <div>
            <h3 className="text-sm font-medium text-gray-800 mb-3">Ek Depolama Paketleri</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "STORAGE_5GB", name: "+5 GB", price: 14 },
                { id: "STORAGE_20GB", name: "+20 GB", price: 54 },
                { id: "STORAGE_50GB", name: "+50 GB", price: 135 },
              ].map((pkg) => (
                <div key={pkg.id} className="rounded-xl border border-gray-100 p-4 text-center">
                  <p className="text-sm font-semibold text-gray-900">{pkg.name}</p>
                  <p className="mt-2 text-lg font-bold text-gray-900">₺{pkg.price}<span className="text-xs font-normal text-gray-400">/ay</span></p>
                  <button
                    onClick={() => handlePayment("STORAGE_PACKAGE", pkg.id)}
                    disabled={paymentLoading === `STORAGE_PACKAGE_${pkg.id}`}
                    className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {paymentLoading === `STORAGE_PACKAGE_${pkg.id}` ? (
                      <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Satın Al"
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reminder Rules */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Hatırlatma Kuralları</h2>
          <p className="text-xs text-gray-500 mt-0.5">Tedavi sonrası hatırlatma kuralları oluşturun</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Existing reminders */}
          {reminders.length > 0 && (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {getCategoryLabel(reminder.treatmentCategory)}
                      </span>
                      <span className="text-xs text-gray-500">
                        - {reminder.intervalDays} gün sonra
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{reminder.messageTemplate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleReminder(reminder.id, reminder.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        reminder.isActive ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          reminder.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="h-px bg-gray-100" />

          {/* New reminder form */}
          <form onSubmit={handleAddReminder} className="space-y-4">
            <h4 className="text-sm font-medium text-gray-800">Yeni Hatırlatma</h4>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Kategori</label>
              <select
                value={newReminder.treatmentCategory}
                onChange={(e) => setNewReminder({ ...newReminder, treatmentCategory: e.target.value })}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                <option value="">Kategori seçin...</option>
                {TREATMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Gün Sayısı</label>
              <input
                type="number"
                min="1"
                value={newReminder.intervalDays}
                onChange={(e) => setNewReminder({ ...newReminder, intervalDays: e.target.value })}
                required
                placeholder="Örnek: 30"
                className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Mesaj Şablonu</label>
              <textarea
                value={newReminder.messageTemplate}
                onChange={(e) => setNewReminder({ ...newReminder, messageTemplate: e.target.value })}
                required
                placeholder="Örnek: Sayın {musteri}, {tedavi} işleminizin üzerinden {gun} gün geçmiştir."
                rows={3}
                className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>

            <button
              type="submit"
              disabled={reminderSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {reminderSaving ? "Ekleniyor..." : "Hatırlatma Ekle"}
            </button>
          </form>
        </div>
      </motion.div>

      {/* PayTR iFrame Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg p-0">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Güvenli Ödeme</h3>
          </div>
          {paytrToken && (
            <iframe
              src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
              className="w-full border-0"
              style={{ height: "500px" }}
              allow="payment"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
