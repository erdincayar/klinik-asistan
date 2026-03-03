"use client";

import { useEffect, useState } from "react";
import {
  UserCog,
  Plus,
  Phone,
  Mail,
  Percent,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Pencil,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ROLE_LABELS: Record<string, string> = {
  DOKTOR: "Doktor",
  ASISTAN: "Asistan",
  SEKRETER: "Sekreter",
  TEKNISYEN: "Teknisyen",
  DIGER: "Diğer",
};

const ROLE_COLORS: Record<string, string> = {
  DOKTOR: "bg-blue-100 text-blue-800",
  ASISTAN: "bg-green-100 text-green-800",
  SEKRETER: "bg-purple-100 text-purple-800",
  TEKNISYEN: "bg-orange-100 text-orange-800",
  DIGER: "bg-gray-100 text-gray-800",
};

const PERMISSION_LABELS: Record<string, string> = {
  canViewFinance: "Finans Görüntüleme",
  canEditPatients: "Müşteri Düzenleme",
  canManageAppointments: "Randevu Yönetimi",
  canViewReports: "Rapor Görüntüleme",
  canManageInventory: "Stok Yönetimi",
};

interface PermissionsMap {
  canViewFinance: boolean;
  canEditPatients: boolean;
  canManageAppointments: boolean;
  canViewReports: boolean;
  canManageInventory: boolean;
}

const defaultPermissions: PermissionsMap = {
  canViewFinance: false,
  canEditPatients: false,
  canManageAppointments: false,
  canViewReports: false,
  canManageInventory: false,
};

interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  color: string;
  commissionRate: number;
  permissions: PermissionsMap | null;
  isActive: boolean;
  createdAt: string;
  totalRevenue: number;
  totalTreatmentCount: number;
  monthlyRevenue: number;
  monthlyTreatmentCount: number;
  totalCommission: number;
  monthlyCommission: number;
}

interface EmployeeForm {
  name: string;
  role: string;
  phone: string;
  email: string;
  commissionRate: string;
  color: string;
  permissions: PermissionsMap;
}

const emptyForm: EmployeeForm = {
  name: "",
  role: "ASISTAN",
  phone: "",
  email: "",
  commissionRate: "0",
  color: "#3b82f6",
  permissions: { ...defaultPermissions },
};

function formatTL(amount: number): string {
  return (
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " TL"
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form state
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Çalışanlar alınamadı");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      if (!res.ok) throw new Error("Çalışan eklenemedi");
      setShowAddDialog(false);
      setForm(emptyForm);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingEmployee) return;
    try {
      setSaving(true);
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: editingEmployee.id, ...form }),
      });
      if (!res.ok) throw new Error("Çalışan güncellenemedi");
      setEditingEmployee(null);
      setForm(emptyForm);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(emp: Employee) {
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: emp.id, isActive: !emp.isActive }),
      });
      if (!res.ok) throw new Error("Durum güncellenemedi");
      await fetchEmployees();
      if (selectedEmployee?.id === emp.id) {
        setSelectedEmployee({ ...emp, isActive: !emp.isActive });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu çalışanı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) throw new Error("Çalışan silinemedi");
      if (selectedEmployee?.id === id) setSelectedEmployee(null);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setForm({
      name: emp.name,
      role: emp.role,
      phone: emp.phone || "",
      email: emp.email || "",
      commissionRate: String(emp.commissionRate),
      color: emp.color || "#3b82f6",
      permissions: emp.permissions
        ? { ...defaultPermissions, ...emp.permissions }
        : { ...defaultPermissions },
    });
  }

  // Stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.isActive).length;
  const totalMonthlyCommission = employees.reduce((sum, e) => sum + e.monthlyCommission, 0);

  // Reusable form fields renderer for both Add and Edit dialogs
  function renderFormFields(idPrefix: string) {
    return (
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`}>İsim *</Label>
          <Input
            id={`${idPrefix}-name`}
            placeholder="Çalışan adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-role`}>Rol</Label>
          <Select
            id={`${idPrefix}-role`}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-phone`}>Telefon</Label>
          <Input
            id={`${idPrefix}-phone`}
            placeholder="05xx xxx xx xx"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-email`}>Email</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            placeholder="ornek@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-commission`}>Komisyon Oranı (%)</Label>
          <Input
            id={`${idPrefix}-commission`}
            type="number"
            min="0"
            max="100"
            placeholder="0"
            value={form.commissionRate}
            onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-color`}>Renk</Label>
          <div className="flex items-center gap-3">
            <input
              id={`${idPrefix}-color`}
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <span className="text-sm text-muted-foreground">{form.color}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>İzinler</Label>
          <div className="space-y-2 rounded-md border p-3">
            {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={form.permissions[key as keyof PermissionsMap]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      permissions: {
                        ...form.permissions,
                        [key]: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Çalışanlar</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowAddDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Çalışan Ekle
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Çalışan</p>
                <p className="text-2xl font-bold">{totalEmployees}</p>
              </div>
              <UserCog className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif Çalışan</p>
                <p className="text-2xl font-bold">{activeEmployees}</p>
              </div>
              <ToggleRight className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aylık Toplam Komisyon</p>
                <p className="text-2xl font-bold">{formatTL(totalMonthlyCommission)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>
            Kapat
          </button>
        </div>
      )}

      {/* Content: Employee list + Detail panel */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Employee List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Çalışan Listesi</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Yükleniyor...</p>
              ) : employees.length === 0 ? (
                <p className="text-gray-500">Henüz çalışan kaydı yok</p>
              ) : (
                <div className="space-y-3">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                        selectedEmployee?.id === emp.id ? "border-primary bg-accent/30" : ""
                      }`}
                    >
                      {/* Name & Role */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="inline-block h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: emp.color || "#3b82f6" }}
                            title={`Renk: ${emp.color || "#3b82f6"}`}
                          />
                          <p className="font-medium truncate">{emp.name}</p>
                          <Badge className={ROLE_COLORS[emp.role] || ROLE_COLORS.DIGER}>
                            {ROLE_LABELS[emp.role] || emp.role}
                          </Badge>
                          {!emp.isActive && (
                            <Badge variant="outline" className="text-gray-500">
                              Pasif
                            </Badge>
                          )}
                        </div>
                        {emp.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Commission & Revenue */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-muted-foreground">Komisyon</p>
                          <p className="font-medium">%{emp.commissionRate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Aylık Ciro</p>
                          <p className="font-medium">{formatTL(emp.monthlyRevenue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Aylık Komisyon</p>
                          <p className="font-medium text-green-600">{formatTL(emp.monthlyCommission)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(emp); }}
                          title={emp.isActive ? "Pasif yap" : "Aktif yap"}
                        >
                          {emp.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDelete(emp.id); }}
                          title="Sil"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Employee Detail Card */}
        <div className="lg:col-span-1">
          {selectedEmployee ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded-full shrink-0"
                      style={{ backgroundColor: selectedEmployee.color || "#3b82f6" }}
                    />
                    <CardTitle className="text-lg">{selectedEmployee.name}</CardTitle>
                  </div>
                  <Badge className={ROLE_COLORS[selectedEmployee.role] || ROLE_COLORS.DIGER}>
                    {ROLE_LABELS[selectedEmployee.role] || selectedEmployee.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Contact Info */}
                <div className="space-y-2">
                  {selectedEmployee.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEmployee.phone}</span>
                    </div>
                  )}
                  {selectedEmployee.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEmployee.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span>Komisyon Oranı: %{selectedEmployee.commissionRate}</span>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                  <span className="text-sm font-medium">Durum</span>
                  <button
                    onClick={() => handleToggleActive(selectedEmployee)}
                    className="flex items-center gap-2"
                  >
                    {selectedEmployee.isActive ? (
                      <>
                        <span className="text-sm text-green-600 font-medium">Aktif</span>
                        <ToggleRight className="h-6 w-6 text-green-600" />
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-500 font-medium">Pasif</span>
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      </>
                    )}
                  </button>
                </div>

                {/* Performance Summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performans Özeti
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Aylık Ciro</p>
                      <p className="text-lg font-bold">{formatTL(selectedEmployee.monthlyRevenue)}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Aylık Komisyon</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatTL(selectedEmployee.monthlyCommission)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Aylık İşlem</p>
                      <p className="text-lg font-bold">{selectedEmployee.monthlyTreatmentCount}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Toplam İşlem</p>
                      <p className="text-lg font-bold">{selectedEmployee.totalTreatmentCount}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Toplam Ciro</span>
                      <span className="font-medium">{formatTL(selectedEmployee.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Toplam Komisyon</span>
                      <span className="font-medium text-green-600">
                        {formatTL(selectedEmployee.totalCommission)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(selectedEmployee)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Düzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(selectedEmployee.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  <UserCog className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Detayları görmek için bir çalışan seçin</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Çalışan Ekle</DialogTitle>
          </DialogHeader>
          {renderFormFields("add")}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => { if (!open) setEditingEmployee(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Çalışan Düzenle</DialogTitle>
          </DialogHeader>
          {renderFormFields("edit")}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEmployee(null)}>
              İptal
            </Button>
            <Button onClick={handleUpdate} disabled={saving || !form.name.trim()}>
              {saving ? "Kaydediliyor..." : "Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
