"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CatalogProductLite {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  technicalSpecs: Record<string, unknown> | null;
  imageStoragePath: string | null;
  status: string;
}

export interface PhotoOption {
  id: string;
  storagePath: string;
  originalName: string;
  /** fileId-based raw URL for thumbnails */
  thumbUrl: string;
}

interface Props {
  open: boolean;
  product: CatalogProductLite | null;
  photoOptions: PhotoOption[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function ProductEditModal({
  open,
  product,
  photoOptions,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<CatalogProductLite | null>(null);
  const [specsText, setSpecsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setForm({ ...product });
      const specs = product.technicalSpecs || {};
      setSpecsText(
        Object.entries(specs)
          .map(([k, v]) => `${k}: ${v ?? ""}`)
          .join("\n")
      );
    }
  }, [product]);

  if (!open || !form) return null;

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);

    // Parse specsText (k: v per line) into object
    const specs: Record<string, string> = {};
    for (const raw of specsText.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key) specs[key] = val;
    }

    try {
      const res = await fetch(`/api/admin/catalog/products/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          price: form.price,
          currency: form.currency,
          technicalSpecs: specs,
          imageStoragePath: form.imageStoragePath,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kaydetme hatası");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!form) return;
    if (!window.confirm("Bu ürünü silmek istiyor musunuz?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalog/products/${form.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Silme hatası");
      onDeleted();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Ürünü Düzenle</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          {/* Left: metadata */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Ürün Adı</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Kategori</Label>
              <Input
                value={form.category ?? ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1"
                placeholder="örn: Doğal Taş"
              />
            </div>

            <div>
              <Label className="text-xs">Açıklama</Label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fiyat</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Para Birimi</Label>
                <select
                  value={form.currency ?? "TRY"}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Teknik Özellikler</Label>
              <textarea
                value={specsText}
                onChange={(e) => setSpecsText(e.target.value)}
                rows={6}
                placeholder={"boyut: 60x60cm\nagirlik: 2.5kg\nmalzeme: granit"}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Her satıra bir özellik: <code>anahtar: değer</code>
              </p>
            </div>
          </div>

          {/* Right: image picker */}
          <div className="space-y-3">
            <Label className="text-xs">Ürün Görseli</Label>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="aspect-square rounded-lg bg-white ring-1 ring-inset ring-gray-200 overflow-hidden flex items-center justify-center">
                {form.imageStoragePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      photoOptions.find((p) => p.storagePath === form.imageStoragePath)
                        ?.thumbUrl || ""
                    }
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-gray-400">Görsel seçilmedi</span>
                )}
              </div>

              {photoOptions.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] text-gray-500">
                    Projedeki fotoğraflar:
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {photoOptions.map((po) => {
                      const selected = po.storagePath === form.imageStoragePath;
                      return (
                        <button
                          key={po.id}
                          type="button"
                          onClick={() =>
                            setForm({ ...form, imageStoragePath: po.storagePath })
                          }
                          className={`aspect-square rounded-lg overflow-hidden ring-2 transition-all ${
                            selected
                              ? "ring-indigo-500"
                              : "ring-transparent hover:ring-gray-300"
                          }`}
                          title={po.originalName}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={po.thumbUrl}
                            alt={po.originalName}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                  {form.imageStoragePath && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, imageStoragePath: null })
                      }
                      className="mt-2 text-[11px] text-gray-500 hover:text-red-500"
                    >
                      Görseli kaldır
                    </button>
                  )}
                </>
              )}
            </div>

            <div>
              <Label className="text-xs">Durum</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="DRAFT">Taslak</option>
                <option value="REVIEWED">İncelendi</option>
                <option value="APPROVED">Onaylandı</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50/50 px-6 py-3 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={remove}
            disabled={deleting || saving}
            className="text-red-600 hover:bg-red-50"
          >
            {deleting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Sil
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              İptal
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
