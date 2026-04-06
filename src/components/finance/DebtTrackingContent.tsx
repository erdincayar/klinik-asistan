"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, ArrowDownRight, ArrowUpRight, Wallet, CreditCard,
  Banknote, Building2, MoreHorizontal, Trash2, DollarSign, Calendar,
  ChevronDown, X, Search, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

/* ──────────── Types ──────────── */

interface DebtPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  paidAt: string;
}

interface Debt {
  id: string;
  direction: string;
  contactName: string;
  description: string | null;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
  patientId: string | null;
  patient: { id: string; name: string; phone: string | null } | null;
  payments: DebtPayment[];
  createdAt: string;
}

interface Summary {
  receivableTotal: number;
  receivableRemaining: number;
  payableTotal: number;
  payableRemaining: number;
  openCount: number;
}

/* ──────────── Helpers ──────────── */

const fmtTL = (kurus: number) =>
  (kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

const PAYMENT_METHODS = [
  { value: "CASH", label: "Nakit", icon: Banknote },
  { value: "CARD", label: "Kart", icon: CreditCard },
  { value: "TRANSFER", label: "Havale/EFT", icon: Building2 },
  { value: "OTHER", label: "Diğer", icon: MoreHorizontal },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Açık", color: "bg-red-100 text-red-700" },
  PARTIAL: { label: "Kısmi", color: "bg-orange-100 text-orange-700" },
  PAID: { label: "Ödendi", color: "bg-green-100 text-green-700" },
};

/* ──────────── Component ──────────── */

export default function DebtTrackingContent() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "RECEIVABLE" | "PAYABLE">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "OPEN" | "PARTIAL" | "PAID">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createDir, setCreateDir] = useState<"RECEIVABLE" | "PAYABLE">("RECEIVABLE");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Payment dialog
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // Expanded detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDebts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.set("direction", filter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/debts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDebts(data.debts || []);
        setSummary(data.summary || null);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [filter, statusFilter]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  async function handleCreate() {
    if (!formName.trim() || !formAmount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: createDir,
          contactName: formName.trim(),
          description: formDesc.trim() || null,
          totalAmount: Math.round(parseFloat(formAmount) * 100),
          dueDate: formDueDate || null,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormName(""); setFormDesc(""); setFormAmount(""); setFormDueDate("");
        fetchDebts();
      }
    } catch { /* silent */ } finally { setSaving(false); }
  }

  async function handlePayment() {
    if (!payDebt || !payAmount) return;
    setPayLoading(true);
    try {
      const res = await fetch(`/api/debts/${payDebt.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(parseFloat(payAmount) * 100),
          paymentMethod: payMethod,
          notes: payNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setPayDebt(null);
        setPayAmount(""); setPayNotes("");
        fetchDebts();
      }
    } catch { /* silent */ } finally { setPayLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/debts/${id}`, { method: "DELETE" });
    fetchDebts();
  }

  const filtered = searchQuery.trim()
    ? debts.filter((d) => d.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
    : debts;

  return (
    <div className="space-y-6 mt-4">
      {/* Summary Cards */}
      {summary && (() => {
        const receivablePaid = summary.receivableTotal - summary.receivableRemaining;
        const payablePaid = summary.payableTotal - summary.payableRemaining;
        return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {/* Alacak Bölümü */}
          <div className="rounded-xl border border-green-100 bg-green-50/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownRight className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-gray-600">Alacaklar</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Toplam</span>
                <span className="font-semibold text-gray-700">{fmtTL(summary.receivableTotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Tahsil Edilen</span>
                <span className="font-semibold text-emerald-600">{fmtTL(receivablePaid)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-green-200 pt-1.5">
                <span className="text-gray-500">Kalan</span>
                <span className="font-bold text-green-700">{fmtTL(summary.receivableRemaining)}</span>
              </div>
            </div>
          </div>
          {/* Borç Bölümü */}
          <div className="rounded-xl border border-red-100 bg-red-50/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold text-gray-600">Borçlar</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Toplam</span>
                <span className="font-semibold text-gray-700">{fmtTL(summary.payableTotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Ödenen</span>
                <span className="font-semibold text-emerald-600">{fmtTL(payablePaid)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-red-200 pt-1.5">
                <span className="text-gray-500">Kalan</span>
                <span className="font-bold text-red-600">{fmtTL(summary.payableRemaining)}</span>
              </div>
            </div>
          </div>
          {/* Net Bakiye + Açık Kayıt */}
          <div className="col-span-2 lg:col-span-1 rounded-xl border border-[#E0E7FF] bg-[#EEF2FF]/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-[#6366F1]" />
              <span className="text-xs font-semibold text-gray-600">Net Bakiye</span>
            </div>
            <p className={cn("text-2xl font-bold", summary.receivableRemaining - summary.payableRemaining >= 0 ? "text-green-700" : "text-red-600")}>
              {fmtTL(summary.receivableRemaining - summary.payableRemaining)}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
              <Calendar className="h-3.5 w-3.5 text-orange-500" />
              <span>{summary.openCount} açık kayıt</span>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "RECEIVABLE", "PAYABLE"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f ? "bg-[#6366F1] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {f === "all" ? "Tümü" : f === "RECEIVABLE" ? "Alacaklar" : "Borçlar"}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {(["all", "OPEN", "PARTIAL", "PAID"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {s === "all" ? "Tüm Durum" : STATUS_CONFIG[s].label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kişi ara..."
              className="rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-xs w-40 focus:border-[#6366F1] outline-none"
            />
          </div>
          <button
            onClick={() => { setCreateDir("RECEIVABLE"); setShowCreate(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
          >
            <Plus className="h-3.5 w-3.5" /> Alacak
          </button>
          <button
            onClick={() => { setCreateDir("PAYABLE"); setShowCreate(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            <Plus className="h-3.5 w-3.5" /> Borç
          </button>
        </div>
      </div>

      {/* Debt List */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#6366F1]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((debt) => {
              const remaining = debt.totalAmount - debt.paidAmount;
              const pct = debt.totalAmount > 0 ? (debt.paidAmount / debt.totalAmount) * 100 : 0;
              const isExpanded = expandedId === debt.id;
              const isReceivable = debt.direction === "RECEIVABLE";
              const sc = STATUS_CONFIG[debt.status] || STATUS_CONFIG.OPEN;

              return (
                <div key={debt.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : debt.id)}
                    className="flex items-center gap-4 px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Direction indicator */}
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isReceivable ? "bg-green-50" : "bg-red-50"
                    )}>
                      {isReceivable
                        ? <ArrowDownRight className="h-5 w-5 text-green-600" />
                        : <ArrowUpRight className="h-5 w-5 text-red-500" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{debt.contactName}</span>
                        <Badge className={cn("text-[10px]", sc.color)}>{sc.label}</Badge>
                      </div>
                      {debt.description && (
                        <p className="text-xs text-gray-400 truncate">{debt.description}</p>
                      )}
                      {debt.dueDate && (
                        <p className="text-[11px] text-gray-400 mt-0.5">Vade: {fmtDate(debt.dueDate)}</p>
                      )}
                    </div>

                    {/* Amount + Progress */}
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-bold", isReceivable ? "text-green-700" : "text-red-600")}>
                        {fmtTL(remaining)}
                      </p>
                      <p className="text-[11px] text-gray-400">{fmtTL(debt.totalAmount)}</p>
                      <div className="mt-1 w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {debt.status !== "PAID" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPayDebt(debt);
                            setPayAmount(String(remaining / 100));
                            setPayMethod("CASH");
                            setPayNotes("");
                          }}
                          className="rounded-lg bg-[#6366F1] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#4F46E5]"
                        >
                          Ödeme
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(debt.id); }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </div>

                  {/* Expanded — Payment History */}
                  {isExpanded && debt.payments.length > 0 && (
                    <div className="bg-gray-50/50 px-6 py-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500">Ödeme Geçmişi</p>
                      {debt.payments.map((p) => {
                        const pm = PAYMENT_METHODS.find((m) => m.value === p.paymentMethod);
                        const PmIcon = pm?.icon || DollarSign;
                        return (
                          <div key={p.id} className="flex items-center gap-3 text-xs">
                            <PmIcon className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-600">{fmtDate(p.paidAt)}</span>
                            <span className="font-medium text-gray-900">{fmtTL(p.amount)}</span>
                            <Badge className="text-[9px]">{pm?.label || p.paymentMethod}</Badge>
                            {p.notes && <span className="text-gray-400 truncate">{p.notes}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createDir === "RECEIVABLE" ? "Yeni Alacak Kaydı" : "Yeni Borç Kaydı"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Kişi / Firma Adı *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Kişi veya firma adı"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Açıklama</label>
              <input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Açıklama (opsiyonel)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tutar (TL) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Vade Tarihi</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] outline-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              İptal
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !formName.trim() || !formAmount}
              className={cn("rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
                createDir === "RECEIVABLE" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!payDebt} onOpenChange={(v) => { if (!v) setPayDebt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme Kaydet — {payDebt?.contactName}</DialogTitle>
          </DialogHeader>
          {payDebt && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Toplam</span>
                  <span className="font-semibold">{fmtTL(payDebt.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ödenen</span>
                  <span className="font-semibold text-green-600">{fmtTL(payDebt.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-500 font-medium">Kalan</span>
                  <span className="font-bold text-red-600">{fmtTL(payDebt.totalAmount - payDebt.paidAmount)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Ödeme Tutarı (TL) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Ödeme Yöntemi *</label>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setPayMethod(m.value)}
                        className={cn("flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors",
                          payMethod === m.value
                            ? "border-[#6366F1] bg-[#EEF2FF] text-[#6366F1]"
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Not</label>
                <input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ödeme notu (opsiyonel)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6366F1] outline-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setPayDebt(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              İptal
            </button>
            <button
              onClick={handlePayment}
              disabled={payLoading || !payAmount || parseFloat(payAmount) <= 0}
              className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 flex items-center gap-1.5"
            >
              {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Ödemeyi Kaydet
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
