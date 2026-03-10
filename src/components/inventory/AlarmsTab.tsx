"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { StockAlarm, Product, ALARM_TYPE_BADGE, CURRENCIES } from "./constants";

const ALARM_TYPES = [
  { value: "STOCK", label: "Stok Seviyesi" },
  { value: "PROFIT_MARGIN", label: "Kâr Marjı" },
  { value: "CURRENCY", label: "Döviz Kuru" },
];

export default function AlarmsTab() {
  const [alarms, setAlarms] = useState<StockAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<StockAlarm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockAlarm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAlarms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stock-alarms");
      if (!res.ok) throw new Error("Alarmlar alınamadı");
      const data = await res.json();
      setAlarms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlarms(); }, []);

  const handleToggleActive = async (alarm: StockAlarm) => {
    const newValue = !alarm.isActive;
    setAlarms((prev) => prev.map((a) => a.id === alarm.id ? { ...a, isActive: newValue } : a));
    try {
      const res = await fetch(`/api/stock-alarms/${alarm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newValue }),
      });
      if (!res.ok) {
        setAlarms((prev) => prev.map((a) => a.id === alarm.id ? { ...a, isActive: !newValue } : a));
      }
    } catch {
      setAlarms((prev) => prev.map((a) => a.id === alarm.id ? { ...a, isActive: !newValue } : a));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stock-alarms/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme hatası");
      setAlarms((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditTarget(null); setShowDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Alarm
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-gray-500">Yükleniyor...</p>
          ) : error ? (
            <p className="p-6 text-red-500">{error}</p>
          ) : alarms.length === 0 ? (
            <p className="p-6 text-gray-500">Henüz alarm tanımlanmadı</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Eşik</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead className="text-center">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alarms.map((alarm) => {
                  const typeBadge = ALARM_TYPE_BADGE[alarm.type] || ALARM_TYPE_BADGE.STOCK;
                  return (
                    <TableRow key={alarm.id}>
                      <TableCell className="font-medium">{alarm.name}</TableCell>
                      <TableCell>
                        <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{alarm.product?.name || "Tümü"}</TableCell>
                      <TableCell className="text-right">
                        {alarm.type === "PROFIT_MARGIN" ? `%${alarm.threshold}` : alarm.type === "CURRENCY" ? `${alarm.threshold} ${alarm.currency || ""}` : alarm.threshold}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleActive(alarm)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${alarm.isActive ? "bg-green-500" : "bg-gray-300"}`}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                            style={{ transform: alarm.isActive ? "translateX(18px)" : "translateX(2px)" }}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setEditTarget(alarm); setShowDialog(true); }}
                            className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(alarm)}
                            className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alarm dialog (create/edit) */}
      <AlarmDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        editTarget={editTarget}
        onSuccess={fetchAlarms}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alarmı Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> alarmını silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>İptal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlarmDialog({
  open, onOpenChange, editTarget, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: StockAlarm | null;
  onSuccess: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    name: "", type: "STOCK", productId: "", threshold: 0, currency: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/products?active=true")
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setProducts(data); })
        .catch(() => {});

      if (editTarget) {
        setForm({
          name: editTarget.name,
          type: editTarget.type,
          productId: editTarget.productId || "",
          threshold: editTarget.threshold,
          currency: editTarget.currency || "",
        });
      } else {
        setForm({ name: "", type: "STOCK", productId: "", threshold: 0, currency: "" });
      }
    }
  }, [open, editTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const body = {
        name: form.name,
        type: form.type,
        productId: form.productId || null,
        threshold: form.threshold,
        currency: form.type === "CURRENCY" ? form.currency || null : null,
      };

      const url = editTarget ? `/api/stock-alarms/${editTarget.id}` : "/api/stock-alarms";
      const method = editTarget ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Kaydetme hatası");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editTarget ? "Alarmı Düzenle" : "Yeni Alarm"}</DialogTitle>
          <DialogDescription>Stok alarmı tanımlayın</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alarmName">Alarm Adı</Label>
            <Input id="alarmName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alarmType">Tür</Label>
            <select id="alarmType" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {ALARM_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>
          {form.type !== "CURRENCY" && (
            <div className="space-y-2">
              <Label htmlFor="alarmProduct">Ürün (opsiyonel)</Label>
              <select id="alarmProduct" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Tüm ürünler</option>
                {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="alarmThreshold">
              Eşik Değeri {form.type === "PROFIT_MARGIN" ? "(%)" : form.type === "CURRENCY" ? "(kur)" : "(adet)"}
            </Label>
            <Input id="alarmThreshold" type="number" min={0} step={form.type === "CURRENCY" ? "0.01" : "1"}
              value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} required />
          </div>
          {form.type === "CURRENCY" && (
            <div className="space-y-2">
              <Label htmlFor="alarmCurrency">Para Birimi</Label>
              <select id="alarmCurrency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Seçin</option>
                {CURRENCIES.filter((c) => c.value !== "TRY").map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
