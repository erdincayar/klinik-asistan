"use client";

import { useEffect, useState, useMemo } from "react";
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
  Banknote,
  Calculator,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { brutToNet, netToBrut, type SalaryResult } from "@/lib/salary-calculator";
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

const AY_ISIMLERI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

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
  salaryGross: number | null;
  salaryNet: number | null;
  salarySSI: number | null;
  salaryPayDay: number | null;
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
  salaryType: string; // "NET" or "BRUT"
  salaryAmount: string; // TL cinsinden
  salaryPayDay: string;
}

interface RoleItem {
  id: string;
  name: string;
}

const emptyForm: EmployeeForm = {
  name: "",
  role: "",
  phone: "",
  email: "",
  commissionRate: "0",
  color: "#3b82f6",
  permissions: { ...defaultPermissions },
  salaryType: "NET",
  salaryAmount: "",
  salaryPayDay: "",
};

function formatTL(amount: number): string {
  return (
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " TL"
  );
}

function calculateMonthlyBreakdown(
  type: "NET" | "BRUT",
  amount: number
): (SalaryResult & { ay: number })[] {
  return Array.from({ length: 12 }, (_, i) => {
    const ay = i + 1;
    const result = type === "BRUT" ? brutToNet(amount, ay) : netToBrut(amount, ay);
    return { ay, ...result };
  });
}

function getSalaryTypeAndAmount(emp: Employee): { type: "NET" | "BRUT"; amount: number } | null {
  // Convention: if only one is stored, that's the agreed type
  // If both stored (legacy), treat as BRUT
  if (emp.salaryGross && !emp.salaryNet) {
    return { type: "BRUT", amount: emp.salaryGross / 100 };
  }
  if (emp.salaryNet && !emp.salaryGross) {
    return { type: "NET", amount: emp.salaryNet / 100 };
  }
  if (emp.salaryGross) {
    return { type: "BRUT", amount: emp.salaryGross / 100 };
  }
  return null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Roles
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showMonthlyTable, setShowMonthlyTable] = useState(false);

  // Form state
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  // Monthly breakdown for detail panel
  const selectedMonthly = useMemo(() => {
    if (!selectedEmployee) return null;
    const info = getSalaryTypeAndAmount(selectedEmployee);
    if (!info) return null;
    return {
      type: info.type,
      amount: info.amount,
      months: calculateMonthlyBreakdown(info.type, info.amount),
    };
  }, [selectedEmployee]);

  // Form salary preview
  const formPreview = useMemo(() => {
    const amount = parseFloat(form.salaryAmount);
    if (!form.salaryAmount || isNaN(amount) || amount <= 0) return null;
    const type = form.salaryType as "NET" | "BRUT";
    const result = type === "BRUT" ? brutToNet(amount) : netToBrut(amount);
    return result;
  }, [form.salaryAmount, form.salaryType]);

  async function fetchRoles() {
    try {
      const res = await fetch("/api/employees/roles");
      if (!res.ok) return;
      const data = await res.json();
      setRoles(data.roles || []);
    } catch {
      // silent
    }
  }

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
    fetchRoles();
  }, []);

  async function handleAddRole() {
    if (!newRoleName.trim()) return;
    try {
      setAddingRole(true);
      const res = await fetch("/api/employees/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Rol eklenemedi");
        return;
      }
      const data = await res.json();
      setRoles((prev) => [...prev, data.role]);
      setForm((prev) => ({ ...prev, role: data.role.name }));
      setNewRoleName("");
    } catch {
      setError("Rol eklenemedi");
    } finally {
      setAddingRole(false);
    }
  }

  function buildSalaryPayload() {
    const amount = parseFloat(form.salaryAmount);
    if (!form.salaryAmount || isNaN(amount) || amount <= 0) {
      return { salaryGross: null, salaryNet: null, salarySSI: null };
    }
    const amountKurus = Math.round(amount * 100);
    if (form.salaryType === "BRUT") {
      const result = brutToNet(amount);
      return {
        salaryGross: amountKurus,
        salaryNet: null, // null = brüt anlaşma
        salarySSI: Math.round((result.sgkIsveren + result.issizlikIsveren) * 100),
      };
    } else {
      const result = netToBrut(amount);
      return {
        salaryNet: amountKurus,
        salaryGross: null, // null = net anlaşma
        salarySSI: Math.round((result.sgkIsveren + result.issizlikIsveren) * 100),
      };
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      const salary = buildSalaryPayload();
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: form.name,
          role: form.role,
          phone: form.phone,
          email: form.email,
          commissionRate: form.commissionRate,
          color: form.color,
          permissions: form.permissions,
          ...salary,
          salaryPayDay: form.salaryPayDay || null,
        }),
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
      const salary = buildSalaryPayload();
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editingEmployee.id,
          name: form.name,
          role: form.role,
          phone: form.phone,
          email: form.email,
          commissionRate: form.commissionRate,
          color: form.color,
          permissions: form.permissions,
          ...salary,
          salaryPayDay: form.salaryPayDay || null,
        }),
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
    const info = getSalaryTypeAndAmount(emp);
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
      salaryType: info?.type || "NET",
      salaryAmount: info ? String(info.amount) : "",
      salaryPayDay: emp.salaryPayDay ? String(emp.salaryPayDay) : "",
    });
  }

  // Stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.isActive).length;
  const totalMonthlyCommission = employees.reduce((sum, e) => sum + e.monthlyCommission, 0);
  const totalMonthlySalary = employees
    .filter((e) => e.isActive)
    .reduce((sum, e) => {
      const info = getSalaryTypeAndAmount(e);
      if (!info) return sum;
      const jan = info.type === "BRUT" ? brutToNet(info.amount) : netToBrut(info.amount);
      return sum + jan.brut + jan.sgkIsveren + jan.issizlikIsveren;
    }, 0);

  // Reusable form fields renderer for both Add and Edit dialogs
  function renderFormFields(idPrefix: string) {
    return (
      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`}>İsim *</Label>
          <Input
            id={`${idPrefix}-name`}
            placeholder="Çalışan adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {/* Role selection */}
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-role`}>Rol</Label>
          <Select
            id={`${idPrefix}-role`}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="">Rol seçin</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              placeholder="Yeni rol adı"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddRole(); } }}
              className="text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRole}
              disabled={addingRole || !newRoleName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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

        {/* Salary Section */}
        <div className="space-y-3 rounded-lg border p-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Maaş Bilgileri
            <span className="text-xs font-normal text-muted-foreground ml-auto">2026 oranları</span>
          </h4>

          {/* NET / BRÜT Toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setForm({ ...form, salaryType: "NET", salaryAmount: "" })}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                form.salaryType === "NET"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Net Maaş
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, salaryType: "BRUT", salaryAmount: "" })}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                form.salaryType === "BRUT"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Brüt Maaş
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-salaryAmount`} className="text-xs">
                {form.salaryType === "NET" ? "Net Maaş (₺)" : "Brüt Maaş (₺)"}
              </Label>
              <Input
                id={`${idPrefix}-salaryAmount`}
                type="number"
                min="0"
                placeholder={form.salaryType === "NET" ? "Anlaşılan net tutar" : "Anlaşılan brüt tutar"}
                value={form.salaryAmount}
                onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-salaryPayDay`} className="text-xs">Ödeme Günü</Label>
              <Select
                id={`${idPrefix}-salaryPayDay`}
                value={form.salaryPayDay}
                onChange={(e) => setForm({ ...form, salaryPayDay: e.target.value })}
              >
                <option value="">Seçin</option>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Preview */}
          {formPreview && (
            <div className="text-xs bg-accent/30 rounded-md p-3 space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brüt</span>
                  <span className="font-medium">{formatTL(formPreview.brut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net</span>
                  <span className="font-medium">{formatTL(formPreview.net)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGK İşveren</span>
                  <span className="font-medium">{formatTL(formPreview.sgkIsveren + formPreview.issizlikIsveren)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Toplam Maliyet</span>
                  <span className="font-bold">{formatTL(formPreview.toplamIsverenMaliyet)}</span>
                </div>
              </div>
              <p className="text-[10px] opacity-70">* Ocak ayı hesabı. Detay panel yıllık tabloyu gösterir.</p>
            </div>
          )}
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aylık Maaş Gideri</p>
                <p className="text-2xl font-bold">{formatTL(totalMonthlySalary)}</p>
              </div>
              <Banknote className="h-8 w-8 text-muted-foreground/50" />
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
                      onClick={() => { setSelectedEmployee(emp); setShowMonthlyTable(false); }}
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
                          {emp.role && (
                            <Badge className="bg-gray-100 text-gray-700">
                              {emp.role}
                            </Badge>
                          )}
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
                  {selectedEmployee.role && (
                    <Badge className="bg-gray-100 text-gray-700">
                      {selectedEmployee.role}
                    </Badge>
                  )}
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

                {/* Salary Info with Monthly Breakdown */}
                {selectedMonthly && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Maaş Bilgileri
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {selectedMonthly.type === "NET" ? "Net" : "Brüt"} anlaşma
                      </Badge>
                    </div>

                    {/* Summary */}
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Anlaşılan {selectedMonthly.type === "NET" ? "Net" : "Brüt"}
                        </span>
                        <span className="font-bold">{formatTL(selectedMonthly.amount)}</span>
                      </div>
                      {selectedEmployee.salaryPayDay && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ödeme Günü</span>
                          <span className="font-medium">Her ayın {selectedEmployee.salaryPayDay}. günü</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t mt-1">
                        <span className="text-muted-foreground">Yıllık Toplam Maliyet</span>
                        <span className="font-bold">
                          {formatTL(selectedMonthly.months.reduce((s, m) => s + m.toplamIsverenMaliyet, 0))}
                        </span>
                      </div>
                    </div>

                    {/* Monthly Table Toggle */}
                    <button
                      onClick={() => setShowMonthlyTable(!showMonthlyTable)}
                      className="flex items-center gap-1 text-xs text-primary font-medium w-full justify-center py-1 hover:underline"
                    >
                      {showMonthlyTable ? (
                        <><ChevronUp className="h-3 w-3" /> Aylık tabloyu gizle</>
                      ) : (
                        <><ChevronDown className="h-3 w-3" /> 12 aylık detay tablosu</>
                      )}
                    </button>

                    {/* Monthly Table */}
                    {showMonthlyTable && (
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-1.5 pl-1">Ay</th>
                              <th className="text-right py-1.5">Brüt</th>
                              <th className="text-right py-1.5">Net</th>
                              <th className="text-right py-1.5">SGK İşv.</th>
                              <th className="text-right py-1.5 pr-1">Maliyet</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedMonthly.months.map((m) => (
                              <tr key={m.ay} className="border-b last:border-0 hover:bg-accent/20">
                                <td className="py-1.5 pl-1 font-medium">{AY_ISIMLERI[m.ay - 1]}</td>
                                <td className="text-right py-1.5">{formatTL(m.brut)}</td>
                                <td className="text-right py-1.5">{formatTL(m.net)}</td>
                                <td className="text-right py-1.5">{formatTL(m.sgkIsveren + m.issizlikIsveren)}</td>
                                <td className="text-right py-1.5 pr-1 font-medium">{formatTL(m.toplamIsverenMaliyet)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 font-semibold">
                              <td className="py-1.5 pl-1">Toplam</td>
                              <td className="text-right py-1.5">
                                {formatTL(selectedMonthly.months.reduce((s, m) => s + m.brut, 0))}
                              </td>
                              <td className="text-right py-1.5">
                                {formatTL(selectedMonthly.months.reduce((s, m) => s + m.net, 0))}
                              </td>
                              <td className="text-right py-1.5">
                                {formatTL(selectedMonthly.months.reduce((s, m) => s + m.sgkIsveren + m.issizlikIsveren, 0))}
                              </td>
                              <td className="text-right py-1.5 pr-1">
                                {formatTL(selectedMonthly.months.reduce((s, m) => s + m.toplamIsverenMaliyet, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

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
