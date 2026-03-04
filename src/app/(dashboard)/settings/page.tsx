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
} from "lucide-react";
import { TREATMENT_CATEGORIES } from "@/lib/types";
import QRCode from "qrcode";

interface ClinicSettings {
  clinicName: string;
  phone: string;
  address: string;
  vatRate: number;
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
        const [settingsRes, remindersRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/settings/reminders"),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings({
            clinicName: data.clinicName || "",
            phone: data.phone || "",
            address: data.address || "",
            vatRate: data.vatRate ?? 20,
          });
          if (data.metaConnected) {
            setMetaConnected(true);
            setMetaAdAccountId(data.metaAdAccountId || "");
            setMetaTokenExpiresAt(data.metaTokenExpiresAt || null);
          }
        }

        if (remindersRes.ok) {
          const data = await remindersRes.json();
          setReminders(data);
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

      {/* Reminder Rules */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
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
    </div>
  );
}
