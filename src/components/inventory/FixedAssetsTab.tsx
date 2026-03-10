"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, toKurus } from "@/lib/utils";
import {
  FixedAsset, FIXED_ASSET_CATEGORIES, FIXED_ASSET_STATUSES, ASSET_STATUS_BADGE,
} from "./constants";

export default function FixedAssetsTab() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<FixedAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FixedAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/fixed-assets");
      if (!res.ok) throw new Error("Demirbaşlar alınamadı");
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fixed-assets/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme hatası");
      setAssets((prev) => prev.filter((a) => a.id !== deleteTarget.id));
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
          <Plus className="mr-2 h-4 w-4" /> Yeni Demirbaş
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-gray-500">Yükleniyor...</p>
          ) : error ? (
            <p className="p-6 text-red-500">{error}</p>
          ) : assets.length === 0 ? (
            <p className="p-6 text-gray-500">Henüz demirbaş kaydı yok</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                    <TableHead>Seri No</TableHead>
                    <TableHead className="text-center">Durum</TableHead>
                    <TableHead className="hidden md:table-cell">Notlar</TableHead>
                    <TableHead className="text-center">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => {
                    const catLabel = FIXED_ASSET_CATEGORIES.find((c) => c.value === asset.category)?.label || asset.category;
                    const statusLabel = FIXED_ASSET_STATUSES.find((s) => s.value === asset.status)?.label || asset.status;
                    const statusClass = ASSET_STATUS_BADGE[asset.status] || ASSET_STATUS_BADGE.ACTIVE;
                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{catLabel}</TableCell>
                        <TableCell>{asset.purchaseDate ? formatDate(asset.purchaseDate) : "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(asset.purchasePrice)}</TableCell>
                        <TableCell className="text-muted-foreground">{asset.serialNumber || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={statusClass}>{statusLabel}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                          {asset.notes || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setEditTarget(asset); setShowDialog(true); }}
                              className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(asset)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset dialog (create/edit) */}
      <AssetDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        editTarget={editTarget}
        onSuccess={fetchAssets}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demirbaşı Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> demirbaşını silmek istediğinize emin misiniz?
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

function AssetDialog({
  open, onOpenChange, editTarget, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: FixedAsset | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "", category: "DIGER", purchaseDate: "", purchasePrice: 0,
    serialNumber: "", status: "ACTIVE", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (editTarget) {
        setForm({
          name: editTarget.name,
          category: editTarget.category,
          purchaseDate: editTarget.purchaseDate ? editTarget.purchaseDate.split("T")[0] : "",
          purchasePrice: editTarget.purchasePrice / 100,
          serialNumber: editTarget.serialNumber || "",
          status: editTarget.status,
          notes: editTarget.notes || "",
        });
      } else {
        setForm({
          name: "", category: "DIGER", purchaseDate: "", purchasePrice: 0,
          serialNumber: "", status: "ACTIVE", notes: "",
        });
      }
    }
  }, [open, editTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const body = {
        name: form.name,
        category: form.category,
        purchaseDate: form.purchaseDate || null,
        purchasePrice: toKurus(form.purchasePrice),
        serialNumber: form.serialNumber || null,
        status: form.status,
        notes: form.notes || null,
      };

      const url = editTarget ? `/api/fixed-assets/${editTarget.id}` : "/api/fixed-assets";
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
          <DialogTitle>{editTarget ? "Demirbaş Düzenle" : "Yeni Demirbaş"}</DialogTitle>
          <DialogDescription>Demirbaş kaydı {editTarget ? "düzenleyin" : "oluşturun"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assetName">Ad</Label>
            <Input id="assetName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assetCategory">Kategori</Label>
              <select id="assetCategory" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {FIXED_ASSET_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetStatus">Durum</Label>
              <select id="assetStatus" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {FIXED_ASSET_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assetDate">Alış Tarihi</Label>
              <Input id="assetDate" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetPrice">Alış Fiyatı (₺)</Label>
              <Input id="assetPrice" type="number" min={0} step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assetSerial">Seri Numarası</Label>
            <Input id="assetSerial" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Opsiyonel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assetNotes">Notlar</Label>
            <Textarea id="assetNotes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opsiyonel..." />
          </div>
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
