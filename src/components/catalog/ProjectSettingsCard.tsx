"use client";

import { useState } from "react";
import { Pencil, Save, Loader2, Sparkles, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

const OUTPUT_TYPES = [
  { value: "PDF_CATALOG", label: "PDF Katalog" },
  { value: "PRICE_LIST", label: "Fiyat Listesi" },
  { value: "BROCHURE", label: "Broşür" },
  { value: "SOCIAL_POST", label: "Sosyal Medya Postu" },
  { value: "CUSTOM", label: "Özel" },
];

interface CuratorReport {
  selectedCodes?: string[];
  orderedCodes?: string[];
  fakeNameCodes?: string[];
  notes?: string;
  warnings?: string[];
  renderHint?: string;
}

interface Props {
  projectId: string;
  status: string;
  userPrompt: string | null;
  outputType: string;
  name: string;
  curatorReport?: CuratorReport | null;
  onSaved: () => void;
  onReanalyze: () => void;
}

export default function ProjectSettingsCard({
  projectId,
  status,
  userPrompt,
  outputType,
  name,
  curatorReport,
  onSaved,
  onReanalyze,
}: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name,
    userPrompt: userPrompt || "",
    outputType,
  });

  const locked = status === "ANALYZING" || status === "GENERATING";

  async function save(reanalyzeAfter: boolean) {
    if (!form.userPrompt.trim()) {
      toast({
        title: "Eksik",
        description: "İstek metni boş bırakılamaz",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/catalog/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          userPrompt: form.userPrompt.trim(),
          outputType: form.outputType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kaydedilemedi");

      toast({ title: "Kaydedildi", description: "Proje ayarları güncellendi." });
      setEditing(false);
      onSaved();
      if (reanalyzeAfter) {
        // Üst seviyeye delege et — analyze tetikler ve refresh yapar
        setTimeout(onReanalyze, 200);
      }
    } catch (e: any) {
      toast({
        title: "Hata",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-gray-400">
              İstek (kataloğun nasıl olacağı)
            </div>
            {!editing ? (
              <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                {userPrompt?.trim() || (
                  <span className="italic text-gray-400">
                    İstek girilmemiş — düzenleyip yaz, sonra yeniden analiz et.
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                <div>
                  <Label className="text-xs">Proje Adı</Label>
                  <Input
                    className="mt-1"
                    value={form.name}
                    maxLength={200}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Çıktı Tipi</Label>
                  <select
                    value={form.outputType}
                    onChange={(e) => setForm({ ...form, outputType: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {OUTPUT_TYPES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">İstek (Prompt)</Label>
                    <span className="text-[11px] text-gray-400">
                      {form.userPrompt.length} / 5000
                    </span>
                  </div>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={6}
                    maxLength={5000}
                    value={form.userPrompt}
                    onChange={(e) => setForm({ ...form, userPrompt: e.target.value })}
                    placeholder="Örn: 9 ürün seç, fiyatları KDV dahil göster, kategoriye göre grupla."
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Net yaz: kaç ürün istediğini, hangi kriterleri uygulayacağını,
                    nasıl bir format olacağını belirt. AI Curator bu metni
                    yorumlayıp ürünleri ona göre filtreler/sıralar.
                  </p>
                </div>
              </div>
            )}
          </div>

          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              disabled={locked}
              onClick={() => setEditing(true)}
              title={locked ? "Önceki işlem tamamlanmalı" : undefined}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Düzenle
            </Button>
          ) : (
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setForm({
                    name,
                    userPrompt: userPrompt || "",
                    outputType,
                  });
                  setEditing(false);
                }}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                İptal
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => save(false)}
              >
                {saving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Kaydet
              </Button>
              <Button
                size="sm"
                variant="default"
                disabled={saving}
                onClick={() => save(true)}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Kaydet & Yeniden Analiz
              </Button>
            </div>
          )}
        </div>

        {/* Curator Raporu */}
        {!editing && curatorReport && curatorReport.notes && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-xs text-violet-900">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <Sparkles className="h-3.5 w-3.5" /> AI Curator
            </div>
            <div>{curatorReport.notes}</div>
            {curatorReport.fakeNameCodes && curatorReport.fakeNameCodes.length > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-amber-800">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Şüpheli ürün adları: {curatorReport.fakeNameCodes.join(", ")}{" "}
                  — Excel&apos;de gerçek ürün ismi olmayabilir.
                </span>
              </div>
            )}
            {curatorReport.warnings && curatorReport.warnings.length > 0 && (
              <ul className="mt-2 ml-5 list-disc space-y-0.5">
                {curatorReport.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
