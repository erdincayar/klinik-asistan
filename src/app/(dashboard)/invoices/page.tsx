"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, FileText, Send, Download, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate, toKurus, fromKurus } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";

// --- Types ---

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "EFATURA" | "EARSIV";
  status: "DRAFT" | "SENT" | "APPROVED" | "CANCELLED";
  customerName: string;
  customerTaxNumber: string | null;
  customerTaxOffice: string | null;
  customerAddress: string | null;
  customerEmail: string | null;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  notes: string | null;
  items: InvoiceItem[];
  createdAt: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

// --- Constants ---

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Taslak", className: "bg-gray-100 text-gray-800" },
  SENT: { label: "Gönderildi", className: "bg-blue-100 text-blue-800" },
  APPROVED: { label: "Onaylandı", className: "bg-green-100 text-green-800" },
  CANCELLED: { label: "İptal", className: "bg-red-100 text-red-800" },
};

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  EFATURA: { label: "e-Fatura", className: "bg-purple-100 text-purple-800" },
  EARSIV: { label: "e-Arşiv", className: "bg-orange-100 text-orange-800" },
};

const TURKISH_MONTHS = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

// --- Main Page ---

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Faturalar</h1>
        <p className="text-muted-foreground">
          e-Fatura ve e-Arşiv fatura yönetimi
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Faturalar</TabsTrigger>
          <TabsTrigger value="create">Yeni Fatura</TabsTrigger>
          <TabsTrigger value="summary">Fatura Özeti</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <InvoiceListTab
            onNewInvoice={() => setActiveTab("create")}
          />
        </TabsContent>
        <TabsContent value="create">
          <CreateInvoiceTab
            onSuccess={() => setActiveTab("list")}
          />
        </TabsContent>
        <TabsContent value="summary">
          <InvoiceSummaryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// TAB 1: Invoice List
// ============================================================

function InvoiceListTab({ onNewInvoice }: { onNewInvoice: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const qs = params.toString();
      const res = await fetch(`/api/invoices${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Faturalar alınamadı");
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(fetchInvoices, 300);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const handleSend = async (invoiceId: string) => {
    try {
      setSendingId(invoiceId);
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Fatura gönderilemedi");
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderim hatası");
    } finally {
      setSendingId(null);
    }
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!res.ok) throw new Error("PDF indirilemedi");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fatura-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF indirme hatası");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Müşteri ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tüm Türler</option>
            <option value="EFATURA">e-Fatura</option>
            <option value="EARSIV">e-Arşiv</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tüm Durumlar</option>
            <option value="DRAFT">Taslak</option>
            <option value="SENT">Gönderildi</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="CANCELLED">İptal</option>
          </select>
          <div className="flex gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Başlangıç</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Bitiş</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>
        <Button onClick={onNewInvoice}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Fatura
        </Button>
      </div>

      {/* Invoice table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-gray-500">Yükleniyor...</p>
          ) : error ? (
            <p className="p-6 text-red-500">{error}</p>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Henüz fatura bulunmuyor</p>
              <Button className="mt-4" variant="outline" onClick={onNewInvoice}>
                <Plus className="mr-2 h-4 w-4" />
                İlk Faturanızı Oluşturun
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura No</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead className="hidden sm:table-cell">Tarih</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const statusBadge = STATUS_BADGE[invoice.status] || STATUS_BADGE.DRAFT;
                  const typeBadge = TYPE_BADGE[invoice.type] || TYPE_BADGE.EFATURA;
                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <Badge className={typeBadge.className}>
                          {typeBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.grandTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {invoice.status === "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={sendingId === invoice.id}
                              onClick={() => handleSend(invoice.id)}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPdf(invoice.id)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
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

      {/* Invoice detail dialog */}
      <Dialog
        open={selectedInvoice !== null}
        onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Fatura #{selectedInvoice.invoiceNumber}</DialogTitle>
                <DialogDescription>
                  {TYPE_BADGE[selectedInvoice.type]?.label} - {STATUS_BADGE[selectedInvoice.status]?.label}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Müşteri:</span>{" "}
                    {selectedInvoice.customerName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Düzenleme Tarihi:</span>{" "}
                    {formatDate(selectedInvoice.issueDate)}
                  </div>
                  {selectedInvoice.customerTaxNumber && (
                    <div>
                      <span className="text-muted-foreground">Vergi No:</span>{" "}
                      {selectedInvoice.customerTaxNumber}
                    </div>
                  )}
                  {selectedInvoice.customerTaxOffice && (
                    <div>
                      <span className="text-muted-foreground">Vergi Dairesi:</span>{" "}
                      {selectedInvoice.customerTaxOffice}
                    </div>
                  )}
                  {selectedInvoice.dueDate && (
                    <div>
                      <span className="text-muted-foreground">Vade Tarihi:</span>{" "}
                      {formatDate(selectedInvoice.dueDate)}
                    </div>
                  )}
                  {selectedInvoice.customerEmail && (
                    <div>
                      <span className="text-muted-foreground">E-posta:</span>{" "}
                      {selectedInvoice.customerEmail}
                    </div>
                  )}
                </div>

                {/* Items */}
                {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold text-sm">Fatura Kalemleri</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Açıklama</TableHead>
                          <TableHead className="text-right">Miktar</TableHead>
                          <TableHead className="text-right">Birim Fiyat</TableHead>
                          <TableHead className="text-right">KDV %</TableHead>
                          <TableHead className="text-right">Toplam</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right">%{item.vatRate}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.lineTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-4 space-y-1 text-sm text-right">
                  <div>
                    <span className="text-muted-foreground">Alt Toplam:</span>{" "}
                    <span className="font-medium">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">KDV Tutarı:</span>{" "}
                    <span className="font-medium">{formatCurrency(selectedInvoice.vatTotal)}</span>
                  </div>
                  <div className="text-base">
                    <span className="text-muted-foreground">Genel Toplam:</span>{" "}
                    <span className="font-bold">{formatCurrency(selectedInvoice.grandTotal)}</span>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Not:</p>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// TAB 2: Create Invoice
// ============================================================

interface InvoiceItemForm {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

function CreateInvoiceTab({ onSuccess }: { onSuccess: () => void }) {
  const [invoiceType, setInvoiceType] = useState<"EFATURA" | "EARSIV">("EFATURA");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerTaxNumber, setCustomerTaxNumber] = useState("");
  const [customerTaxOffice, setCustomerTaxOffice] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItemForm[]>([
    { description: "", quantity: 1, unitPrice: 0, vatRate: 20 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/patients")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPatients(data);
        else if (data.patients) setPatients(data.patients);
      })
      .catch(() => {});
  }, []);

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (patientId) {
      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        setCustomerName(`${patient.firstName} ${patient.lastName}`);
      }
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, vatRate: 20 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calculateLineTotal = (item: InvoiceItemForm): number => {
    const base = toKurus(item.unitPrice) * item.quantity;
    const vat = Math.round(base * item.vatRate / 100);
    return base + vat;
  };

  const subtotal = items.reduce(
    (sum, item) => sum + toKurus(item.unitPrice) * item.quantity,
    0
  );

  const vatTotal = items.reduce(
    (sum, item) => sum + Math.round(toKurus(item.unitPrice) * item.quantity * item.vatRate / 100),
    0
  );

  const grandTotal = subtotal + vatTotal;

  const handleSubmit = async (sendAfterCreate: boolean) => {
    if (!customerName.trim()) {
      setError("Müşteri adı zorunludur");
      return;
    }
    if (items.some((item) => !item.description.trim())) {
      setError("Tüm kalemlerin açıklaması zorunludur");
      return;
    }
    if (items.some((item) => item.quantity <= 0 || item.unitPrice <= 0)) {
      setError("Miktar ve birim fiyat sıfırdan büyük olmalıdır");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body = {
        type: invoiceType,
        customerName: customerName.trim(),
        customerTaxNumber: customerTaxNumber.trim() || null,
        customerTaxOffice: customerTaxOffice.trim() || null,
        customerAddress: customerAddress.trim() || null,
        customerEmail: customerEmail.trim() || null,
        issueDate,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
        items: items.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: toKurus(item.unitPrice),
          vatRate: item.vatRate,
        })),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fatura oluşturulamadı");
      }

      const created = await res.json();

      if (sendAfterCreate && created.id) {
        const sendRes = await fetch(`/api/invoices/${created.id}/send`, {
          method: "POST",
        });
        if (!sendRes.ok) {
          throw new Error("Fatura oluşturuldu ancak gönderilemedi");
        }
      }

      // Reset form
      setInvoiceType("EFATURA");
      setSelectedPatientId("");
      setCustomerName("");
      setCustomerTaxNumber("");
      setCustomerTaxOffice("");
      setCustomerAddress("");
      setCustomerEmail("");
      setIssueDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setNotes("");
      setItems([{ description: "", quantity: 1, unitPrice: 0, vatRate: 20 }]);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invoice Type */}
      <Card>
        <CardHeader>
          <CardTitle>Fatura Türü</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={invoiceType === "EFATURA" ? "default" : "outline"}
              onClick={() => setInvoiceType("EFATURA")}
              className={invoiceType === "EFATURA" ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              e-Fatura
            </Button>
            <Button
              variant={invoiceType === "EARSIV" ? "default" : "outline"}
              onClick={() => setInvoiceType("EARSIV")}
              className={invoiceType === "EARSIV" ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              e-Arşiv
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bilgileri</CardTitle>
          <CardDescription>Fatura kesilecek müşteri bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientSelect">Mevcut Hastadan Seç</Label>
            <select
              id="patientSelect"
              value={selectedPatientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Hasta seçin (opsiyonel)...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Ad / Ünvan *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">E-posta</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerTaxNumber">Vergi No</Label>
              <Input
                id="customerTaxNumber"
                value={customerTaxNumber}
                onChange={(e) => setCustomerTaxNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerTaxOffice">Vergi Dairesi</Label>
              <Input
                id="customerTaxOffice"
                value={customerTaxOffice}
                onChange={(e) => setCustomerTaxOffice(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerAddress">Adres</Label>
            <Input
              id="customerAddress"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <CardTitle>Fatura Kalemleri</CardTitle>
          <CardDescription>En az 1 kalem eklemeniz gerekir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Desktop table view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Açıklama</TableHead>
                  <TableHead className="text-right w-[12%]">Miktar</TableHead>
                  <TableHead className="text-right w-[18%]">Birim Fiyat (TL)</TableHead>
                  <TableHead className="text-right w-[12%]">KDV %</TableHead>
                  <TableHead className="text-right w-[20%]">Satır Toplamı</TableHead>
                  <TableHead className="w-[8%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Açıklama"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.vatRate}
                        onChange={(e) => updateItem(index, "vatRate", Number(e.target.value))}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(calculateLineTotal(item))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-4">
            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Kalem {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Açıklama</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Miktar</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Birim Fiyat</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">KDV %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.vatRate}
                        onChange={(e) => updateItem(index, "vatRate", Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm font-medium">
                    Toplam: {formatCurrency(calculateLineTotal(item))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button variant="outline" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Kalem Ekle
          </Button>

          {/* Summary */}
          <div className="border-t pt-4 space-y-2 text-right">
            <div className="text-sm">
              <span className="text-muted-foreground">Alt Toplam:</span>{" "}
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">KDV Tutarı:</span>{" "}
              <span className="font-medium">{formatCurrency(vatTotal)}</span>
            </div>
            <div className="text-lg">
              <span className="text-muted-foreground">Genel Toplam:</span>{" "}
              <span className="font-bold">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates and Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Tarih ve Notlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Düzenleme Tarihi</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Vade Tarihi</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Fatura ile ilgili notlar..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Error and Actions */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => handleSubmit(false)}
        >
          <FileText className="mr-2 h-4 w-4" />
          {saving ? "Kaydediliyor..." : "Taslak Kaydet"}
        </Button>
        <Button
          disabled={saving}
          onClick={() => handleSubmit(true)}
        >
          <Send className="mr-2 h-4 w-4" />
          {saving ? "Gönderiliyor..." : "Oluştur ve Gönder"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// TAB 3: Invoice Summary
// ============================================================

function InvoiceSummaryTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const res = await fetch("/api/invoices");
        if (!res.ok) throw new Error("Fatura verileri alınamadı");
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : data.invoices || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) return <p className="text-gray-500">Yükleniyor...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthInvoices = invoices.filter((inv) => {
    const d = new Date(inv.issueDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisYearInvoices = invoices.filter((inv) => {
    const d = new Date(inv.issueDate);
    return d.getFullYear() === currentYear;
  });

  const thisMonthTotal = thisMonthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const thisYearTotal = thisYearInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const averageAmount = invoices.length > 0
    ? Math.round(invoices.reduce((sum, inv) => sum + inv.grandTotal, 0) / invoices.length)
    : 0;
  const totalCount = invoices.length;

  // Type distribution for pie chart
  const efaturaCount = invoices.filter((inv) => inv.type === "EFATURA").length;
  const earsivCount = invoices.filter((inv) => inv.type === "EARSIV").length;
  const pieData = [
    { name: "e-Fatura", value: efaturaCount, fill: "#8b5cf6" },
    { name: "e-Arşiv", value: earsivCount, fill: "#f97316" },
  ].filter((d) => d.value > 0);

  // Monthly trend for bar chart
  const monthlyData = TURKISH_MONTHS.map((monthName, index) => {
    const monthInvoices = invoices.filter((inv) => {
      const d = new Date(inv.issueDate);
      return d.getMonth() === index && d.getFullYear() === currentYear;
    });
    const total = monthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    return { month: monthName, total };
  });

  // Status distribution
  const draftCount = invoices.filter((inv) => inv.status === "DRAFT").length;
  const sentCount = invoices.filter((inv) => inv.status === "SENT").length;
  const approvedCount = invoices.filter((inv) => inv.status === "APPROVED").length;
  const cancelledCount = invoices.filter((inv) => inv.status === "CANCELLED").length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Bu Ay Toplam</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(thisMonthTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Bu Yıl Toplam</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(thisYearTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Ortalama Tutar</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(averageAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Toplam Fatura</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Type distribution pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fatura Türü Dağılımı</CardTitle>
            <CardDescription>e-Fatura ve e-Arşiv karşılaştırması</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly trend bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aylık Fatura Trendi</CardTitle>
            <CardDescription>{currentYear} yılı aylık fatura toplamları</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.every((d) => d.total === 0) ? (
              <p className="text-sm text-gray-500">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v) => `${(v / 100).toLocaleString("tr-TR")}`}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip
                    formatter={(value: any) => [
                      formatCurrency(Number(value || 0)),
                      "Toplam",
                    ]}
                  />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Durum Dağılımı</CardTitle>
          <CardDescription>Fatura durumlarına göre dağılım</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-gray-500">Taslak</p>
              <p className="text-2xl font-bold text-gray-600">{draftCount}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-gray-500">Gönderildi</p>
              <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-gray-500">Onaylandı</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-gray-500">İptal</p>
              <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
