"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { Product, StockMovement, TYPE_BADGE, getUnitLabel } from "./constants";

export default function MovementsTab() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const qs = params.toString();
      const res = await fetch(`/api/stock-movements${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Hareketler alınamadı");
      const data = await res.json();
      setMovements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [startDate, endDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Başlangıç</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bitiş</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowStockIn(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Stok Girişi
          </Button>
          <Button onClick={() => setShowStockOut(true)} variant="destructive">
            <Plus className="mr-2 h-4 w-4" />
            Stok Çıkışı
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-gray-500">Yükleniyor...</p>
          ) : error ? (
            <p className="p-6 text-red-500">{error}</p>
          ) : movements.length === 0 ? (
            <p className="p-6 text-gray-500">Stok hareketi bulunamadı</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Birim Fiyat</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Toplam</TableHead>
                  <TableHead className="hidden md:table-cell">Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const typeBadge = TYPE_BADGE[m.type] || TYPE_BADGE.ADJUSTMENT;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.date)}</TableCell>
                      <TableCell className="font-medium">{m.product?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.quantity} {m.product?.unit ? getUnitLabel(m.product.unit) : ""}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{formatCurrency(m.unitPrice)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{formatCurrency(m.totalPrice)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{m.description || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StockMovementDialog open={showStockIn} onOpenChange={setShowStockIn} type="IN" onSuccess={fetchMovements} />
      <StockMovementDialog open={showStockOut} onOpenChange={setShowStockOut} type="OUT" onSuccess={fetchMovements} />
    </div>
  );
}

function StockMovementDialog({
  open, onOpenChange, type, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "IN" | "OUT";
  onSuccess: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    productId: "", quantity: 1, unitPrice: 0, description: "", reference: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/products?active=true")
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setProducts(data); })
        .catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type, unitPrice: toKurus(form.unitPrice) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Hareket oluşturulamadı");
      }
      onOpenChange(false);
      setForm({ productId: "", quantity: 1, unitPrice: 0, description: "", reference: "", date: new Date().toISOString().split("T")[0] });
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
          <DialogTitle>{type === "IN" ? "Stok Girişi" : "Stok Çıkışı"}</DialogTitle>
          <DialogDescription>{type === "IN" ? "Stoğa ürün girişi yapın" : "Stoktan ürün çıkışı yapın"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Ürün</Label>
            <select id="productId" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Ürün seçin...</option>
              {products.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.sku})</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Miktar</Label>
              <Input id="quantity" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Birim Fiyat (TL)</Label>
              <Input id="unitPrice" type="number" min={0} step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opsiyonel açıklama..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Referans / Fatura No</Label>
              <Input id="reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Opsiyonel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={saving} className={type === "IN" ? "bg-green-600 hover:bg-green-700" : ""} variant={type === "OUT" ? "destructive" : "default"}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
