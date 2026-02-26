"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TREATMENT_CATEGORIES } from "@/lib/types";

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
        }

        if (remindersRes.ok) {
          const data = await remindersRes.json();
          setReminders(data);
        }
      } catch {
        setError("Ayarlar y\u00fcklenemedi");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
      setError(err instanceof Error ? err.message : "Bir hata olu\u015ftu");
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

      if (!res.ok) throw new Error("Hat\u0131rlatma eklenemedi");
      const created = await res.json();
      setReminders([...reminders, created]);
      setNewReminder({ treatmentCategory: "", intervalDays: "", messageTemplate: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata olu\u015ftu");
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

  if (loading) return <div className="text-gray-500">Y\u00fckleniyor...</div>;

  return (
    <div className="space-y-6">
      {/* Clinic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Klinik Bilgileri</CardTitle>
          <CardDescription>Klinik ayarlar\u0131n\u0131z\u0131 y\u00f6netin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Klinik Ad\u0131</Label>
              <Input
                id="clinicName"
                value={settings.clinicName}
                onChange={(e) =>
                  setSettings({ ...settings, clinicName: e.target.value })
                }
                placeholder="Klinik ad\u0131"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) =>
                  setSettings({ ...settings, phone: e.target.value })
                }
                placeholder="Klinik telefonu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) =>
                  setSettings({ ...settings, address: e.target.value })
                }
                placeholder="Klinik adresi"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatRate">KDV Oran\u0131 (%)</Label>
              <Input
                id="vatRate"
                type="number"
                min="0"
                max="100"
                value={settings.vatRate}
                onChange={(e) =>
                  setSettings({ ...settings, vatRate: Number(e.target.value) })
                }
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Reminder Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Hat\u0131rlatma Kurallar\u0131</CardTitle>
          <CardDescription>
            Tedavi sonras\u0131 hat\u0131rlatma kurallar\u0131 olu\u015fturun
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing reminders */}
          {reminders.length > 0 && (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getCategoryLabel(reminder.treatmentCategory)}
                      </span>
                      <span className="text-sm text-gray-500">
                        - {reminder.intervalDays} g\u00fcn sonra
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {reminder.messageTemplate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleToggleReminder(reminder.id, reminder.isActive)
                      }
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* New reminder form */}
          <form onSubmit={handleAddReminder} className="space-y-4">
            <h4 className="font-medium">Yeni Hat\u0131rlatma</h4>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <select
                value={newReminder.treatmentCategory}
                onChange={(e) =>
                  setNewReminder({
                    ...newReminder,
                    treatmentCategory: e.target.value,
                  })
                }
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Kategori se\u00e7in...</option>
                {TREATMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>G\u00fcn Say\u0131s\u0131</Label>
              <Input
                type="number"
                min="1"
                value={newReminder.intervalDays}
                onChange={(e) =>
                  setNewReminder({
                    ...newReminder,
                    intervalDays: e.target.value,
                  })
                }
                required
                placeholder="\u00d6rnek: 30"
              />
            </div>

            <div className="space-y-2">
              <Label>Mesaj \u015eablonu</Label>
              <Textarea
                value={newReminder.messageTemplate}
                onChange={(e) =>
                  setNewReminder({
                    ...newReminder,
                    messageTemplate: e.target.value,
                  })
                }
                required
                placeholder="\u00d6rnek: Say\u0131n {hasta}, {tedavi} i\u015fleminizin \u00fczerinden {gun} g\u00fcn ge\u00e7mi\u015ftir."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={reminderSaving}>
              {reminderSaving ? "Ekleniyor..." : "Hat\u0131rlatma Ekle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
