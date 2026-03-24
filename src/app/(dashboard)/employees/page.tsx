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
  Shield,
  Send,
  AlertTriangle,
  Zap,
  X,
} from "lucide-react";
import { brutToNet, netToBrut, yillikFromBrut, yillikFromNet, type SalaryResult } from "@/lib/salary-calculator";
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
  canViewDashboard: "Dashboard görüntüle",
  canViewAppointments: "Randevular (görüntüle)",
  canManageAppointments: "Randevular (düzenle)",
  canViewPatients: "Müşteriler (görüntüle)",
  canEditPatients: "Müşteriler (düzenle)",
  canViewFinance: "Finans (görüntüle)",
  canEditFinance: "Finans (düzenle)",
  canManageMarketing: "Pazarlama & Meta Ads",
  canManageAIStudio: "AI İçerik Stüdyosu",
  canManageMessaging: "Mesajlaşma (WhatsApp/Telegram)",
  canManageAssistant: "Poby Asistan yönetimi",
  canManageInventory: "Stok & Envanter",
  canViewEmployees: "Çalışanlar (görüntüle)",
  canEditEmployees: "Çalışanlar (düzenle)",
  canManageAlarms: "Alarmlar",
  canViewReports: "Raporlar",
  canManageSettings: "Ayarlar",
};

interface PermissionsMap {
  [key: string]: boolean;
}

const defaultPermissions: PermissionsMap = Object.fromEntries(
  Object.keys(PERMISSION_LABELS).map((k) => [k, false])
);

interface EmployeeCustomValueItem {
  id: string;
  fieldKey: string;
  value: string | null;
}

interface CustomFieldDef {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  sortOrder: number;
}

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
  manualSalaryEntry: boolean;
  hasSystemAccess: boolean;
  systemEmail: string | null;
  inviteStatus: string | null;
  invitedAt: string | null;
  customValues: EmployeeCustomValueItem[];
  createdAt: string;
  totalRevenue: number;
  totalTreatmentCount: number;
  monthlyRevenue: number;
  monthlyTreatmentCount: number;
  totalCommission: number;
  monthlyCommission: number;
  monthlyAppointmentCount: number;
  appointmentTypes: string[];
}

interface EmployeeForm {
  name: string;
  role: string;
  phone: string;
  email: string;
  commissionRate: string;
  color: string;
  permissions: PermissionsMap;
  salaryType: string;
  salaryAmount: string;
  salaryPayDay: string;
  manualSalaryEntry: boolean;
  salaryGross: string;
  salaryNet: string;
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
  manualSalaryEntry: false,
  salaryGross: "",
  salaryNet: "",
};

function formatTL(amount: number): string {
  return (
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " TL"
  );
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

  // Salary update mode
  const [showSalaryUpdateModal, setShowSalaryUpdateModal] = useState(false);
  const [salaryUpdateMode, setSalaryUpdateMode] = useState<"forward_only" | "all_history" | "correction">("forward_only");
  const [pendingSalaryUpdate, setPendingSalaryUpdate] = useState<any>(null);

  // System access & invite
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTarget, setInviteTarget] = useState<Employee | null>(null);

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  // Form state
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  // Monthly breakdown for detail panel (cumulative tracking)
  const selectedMonthly = useMemo(() => {
    if (!selectedEmployee) return null;
    const info = getSalaryTypeAndAmount(selectedEmployee);
    if (!info) return null;
    const yearly = info.type === "BRUT"
      ? yillikFromBrut(info.amount)
      : yillikFromNet(info.amount);
    return {
      type: info.type,
      amount: info.amount,
      months: yearly.aylar,
      yillik: yearly,
    };
  }, [selectedEmployee]);

  // Form salary preview
  const formPreview = useMemo(() => {
    if (form.manualSalaryEntry) return null;
    const amount = parseFloat(form.salaryAmount);
    if (!form.salaryAmount || isNaN(amount) || amount <= 0) return null;
    const type = form.salaryType as "NET" | "BRUT";
    const result = type === "BRUT" ? brutToNet(amount) : netToBrut(amount);
    return result;
  }, [form.salaryAmount, form.salaryType, form.manualSalaryEntry]);

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

  async function fetchCustomFields() {
    try {
      const res = await fetch("/api/clinic/employee-custom-fields");
      if (res.ok) {
        const data = await res.json();
        setCustomFields(data.fields || []);
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
    fetchCustomFields();
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
    if (form.manualSalaryEntry) {
      const grossVal = parseFloat(form.salaryGross);
      const netVal = parseFloat(form.salaryNet);
      return {
        salaryGross: grossVal > 0 ? Math.round(grossVal * 100) : null,
        salaryNet: netVal > 0 ? Math.round(netVal * 100) : null,
        salarySSI: null,
        manualSalaryEntry: true,
      };
    }
    const amount = parseFloat(form.salaryAmount);
    if (!form.salaryAmount || isNaN(amount) || amount <= 0) {
      return { salaryGross: null, salaryNet: null, salarySSI: null, manualSalaryEntry: false };
    }
    const amountKurus = Math.round(amount * 100);
    if (form.salaryType === "BRUT") {
      const result = brutToNet(amount);
      return {
        salaryGross: amountKurus,
        salaryNet: null,
        salarySSI: Math.round((result.sgkIsveren + result.issizlikIsveren) * 100),
        manualSalaryEntry: false,
      };
    } else {
      const result = netToBrut(amount);
      return {
        salaryNet: amountKurus,
        salaryGross: null,
        salarySSI: Math.round((result.sgkIsveren + result.issizlikIsveren) * 100),
        manualSalaryEntry: false,
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

  async function handleUpdate(overrideUpdateMode?: string) {
    if (!editingEmployee) return;
    try {
      setSaving(true);
      const salary = buildSalaryPayload();

      // Detect salary change
      const oldInfo = getSalaryTypeAndAmount(editingEmployee);
      const newAmount = parseFloat(form.salaryAmount);
      const salaryChanged = form.manualSalaryEntry
        ? (parseFloat(form.salaryGross) * 100 !== (editingEmployee.salaryGross || 0) ||
           parseFloat(form.salaryNet) * 100 !== (editingEmployee.salaryNet || 0))
        : oldInfo ? oldInfo.amount !== newAmount : newAmount > 0;

      // If salary changed and no override, show modal
      if (salaryChanged && !overrideUpdateMode) {
        setPendingSalaryUpdate({
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
        });
        setShowSalaryUpdateModal(true);
        setSaving(false);
        return;
      }

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
          updateMode: overrideUpdateMode || undefined,
        }),
      });
      if (!res.ok) throw new Error("Çalışan güncellenemedi");
      setEditingEmployee(null);
      setForm(emptyForm);
      setShowSalaryUpdateModal(false);
      setPendingSalaryUpdate(null);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleSalaryUpdateConfirm() {
    await handleUpdate(salaryUpdateMode);
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
      manualSalaryEntry: emp.manualSalaryEntry || false,
      salaryGross: emp.salaryGross ? String(emp.salaryGross / 100) : "",
      salaryNet: emp.salaryNet ? String(emp.salaryNet / 100) : "",
    });
  }

  async function handleToggleSystemAccess(emp: Employee) {
    try {
      if (!emp.hasSystemAccess) {
        setInviteTarget(emp);
        setInviteEmail(emp.email || "");
        setShowInviteDialog(true);
      } else {
        await fetch(`/api/employees/${emp.id}/system-access`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hasSystemAccess: false }),
        });
        await fetchEmployees();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
  }

  async function handleSendInvite() {
    if (!inviteTarget) return;
    try {
      setSaving(true);
      await fetch(`/api/employees/${inviteTarget.id}/system-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasSystemAccess: true,
          systemEmail: inviteEmail || null,
          inviteStatus: "invited",
          permissions: form.permissions,
        }),
      });
      setShowInviteDialog(false);
      setInviteTarget(null);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCustomField() {
    if (!newFieldName.trim()) return;
    try {
      const res = await fetch("/api/clinic/employee-custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName: newFieldName.trim(), fieldType: newFieldType }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Alan eklenemedi");
        return;
      }
      setShowAddFieldDialog(false);
      setNewFieldName("");
      setNewFieldType("text");
      await fetchCustomFields();
    } catch {
      setError("Alan eklenemedi");
    }
  }

  async function handleCustomValueChange(employeeId: string, fieldKey: string, value: string) {
    try {
      await fetch(`/api/employees/${employeeId}/custom-value`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey, value }),
      });
    } catch {
      // silent
    }
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
      const yearly = info.type === "BRUT"
        ? yillikFromBrut(info.amount)
        : yillikFromNet(info.amount);
      return sum + yearly.yillikIsverenMaliyet / 12;
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
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Maaş Bilgileri
            </h4>
            <button
              type="button"
              onClick={() => setForm({ ...form, manualSalaryEntry: !form.manualSalaryEntry })}
              className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 transition-colors ${
                form.manualSalaryEntry
                  ? "bg-gray-200 text-gray-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              <Zap className="h-3 w-3" />
              {form.manualSalaryEntry ? "Manuel Giriş" : "Otomatik Hesapla"}
            </button>
          </div>

          {form.manualSalaryEntry ? (
            <>
              <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Otomatik hesaplama devre dışı, değerler manuel girilecek
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-manualGross`} className="text-xs">Brüt Maaş (₺)</Label>
                  <Input
                    id={`${idPrefix}-manualGross`}
                    type="number"
                    min="0"
                    placeholder="Brüt tutar"
                    value={form.salaryGross}
                    onChange={(e) => setForm({ ...form, salaryGross: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-manualNet`} className="text-xs">Net Maaş (₺)</Label>
                  <Input
                    id={`${idPrefix}-manualNet`}
                    type="number"
                    min="0"
                    placeholder="Net tutar"
                    value={form.salaryNet}
                    onChange={(e) => setForm({ ...form, salaryNet: e.target.value })}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          {/* Ödeme günü (for manual mode too) */}
          {form.manualSalaryEntry && (
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-salaryPayDay-manual`} className="text-xs">Ödeme Günü</Label>
              <Select
                id={`${idPrefix}-salaryPayDay-manual`}
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
          )}
        </div>

        {/* Custom fields */}
        {customFields.length > 0 && (
          <div className="space-y-2">
            <Label>Özel Alanlar</Label>
            <div className="space-y-2 rounded-md border p-3">
              {customFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-xs">{field.fieldName}</Label>
                  <Input
                    type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
                    placeholder={field.fieldName}
                    defaultValue={
                      editingEmployee?.customValues?.find((v) => v.fieldKey === field.fieldKey)?.value || ""
                    }
                    onBlur={(e) => {
                      if (editingEmployee) {
                        handleCustomValueChange(editingEmployee.id, field.fieldKey, e.target.value);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Modül Erişim İzinleri</Label>
          </div>
          <div className="space-y-2 rounded-md border p-3 max-h-[200px] overflow-y-auto">
            {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={form.permissions[key] || false}
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddFieldDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Alan Ekle
          </Button>
          <Button onClick={() => { setForm(emptyForm); setShowAddDialog(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Çalışan Ekle
          </Button>
        </div>
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
                        {emp.hasSystemAccess && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge className={emp.inviteStatus === "active" ? "bg-green-100 text-green-700" : emp.inviteStatus === "invited" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"} variant="outline">
                              {emp.inviteStatus === "active" ? "Aktif" : emp.inviteStatus === "invited" ? "Davet Bekliyor" : "Davet Edilmedi"}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Commission, Revenue & Salary */}
                      <div className="flex items-center gap-4 text-sm flex-wrap">
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
                        <div className="text-right">
                          <p className="text-muted-foreground">Maaş</p>
                          <p className="font-medium">
                            {(() => {
                              const info = getSalaryTypeAndAmount(emp);
                              return info ? formatTL(info.amount) : "-";
                            })()}
                          </p>
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

                {/* System Access Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Sistem Erişimi
                  </span>
                  <button
                    onClick={() => handleToggleSystemAccess(selectedEmployee)}
                    className="flex items-center gap-2"
                  >
                    {selectedEmployee.hasSystemAccess ? (
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

                {/* Appointment Types (Görev Listesi) */}
                {selectedEmployee.appointmentTypes && selectedEmployee.appointmentTypes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Atanan İşlem Türleri</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEmployee.appointmentTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Özel Alanlar</h4>
                    <div className="space-y-1.5">
                      {customFields.map((field) => {
                        const cv = selectedEmployee.customValues?.find((v) => v.fieldKey === field.fieldKey);
                        return (
                          <div key={field.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{field.fieldName}</span>
                            <span className="font-medium">{cv?.value || "-"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
            <Button onClick={() => handleUpdate()} disabled={saving || !form.name.trim()}>
              {saving ? "Kaydediliyor..." : "Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Update Mode Dialog */}
      <Dialog open={showSalaryUpdateModal} onOpenChange={setShowSalaryUpdateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maaş Değişikliği</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Maaş değişikliği nasıl uygulanacak?</span>
            </div>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${salaryUpdateMode === "forward_only" ? "border-blue-300 bg-blue-50/50" : "border-gray-200"}`}>
                <input type="radio" name="salaryUpdateMode" checked={salaryUpdateMode === "forward_only"} onChange={() => setSalaryUpdateMode("forward_only")} className="mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-gray-800">Sadece ileriye dönük güncelle</span>
                  <p className="text-xs text-gray-500 mt-0.5">Geçmiş maaş kayıtları değişmez. Yeni aydan itibaren yeni maaş uygulanır.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${salaryUpdateMode === "all_history" ? "border-red-300 bg-red-50/50" : "border-gray-200"}`}>
                <input type="radio" name="salaryUpdateMode" checked={salaryUpdateMode === "all_history"} onChange={() => setSalaryUpdateMode("all_history")} className="mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-gray-800">Tüm geçmiş kayıtları güncelle</span>
                  <p className="text-xs text-red-500 mt-0.5 font-medium">Tüm geçmiş maaş kayıtları değişir (geri alınamaz)</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${salaryUpdateMode === "correction" ? "border-amber-300 bg-amber-50/50" : "border-gray-200"}`}>
                <input type="radio" name="salaryUpdateMode" checked={salaryUpdateMode === "correction"} onChange={() => setSalaryUpdateMode("correction")} className="mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-gray-800">Yanlış giriş düzeltmesi</span>
                  <p className="text-xs text-gray-500 mt-0.5">Geçmişi düzelt, audit log&apos;a işaretle</p>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSalaryUpdateModal(false); setPendingSalaryUpdate(null); }}>
              İptal
            </Button>
            <Button onClick={handleSalaryUpdateConfirm} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Uygula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Çalışanı Sisteme Davet Et
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="calisan@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-medium mb-1">Davet mesajı:</p>
              <p className="text-xs italic">&quot;İşletmeniz sizi Poby platformuna davet ediyor. Kayıt için bir bağlantı gönderilecek.&quot;</p>
            </div>

            <div className="space-y-2">
              <Label>Erişim İzinleri</Label>
              <div className="space-y-2 rounded-md border p-3 max-h-[200px] overflow-y-auto">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.permissions[key] || false}
                      onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [key]: e.target.checked } })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleSendInvite} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Daveti Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Field Dialog */}
      <Dialog open={showAddFieldDialog} onOpenChange={setShowAddFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Özel Alan Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Alan Adı</Label>
              <Input
                placeholder="örn. TC Kimlik, Adres"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Alan Tipi</Label>
              <Select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                <option value="text">Metin</option>
                <option value="number">Sayı</option>
                <option value="date">Tarih</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFieldDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleAddCustomField} disabled={!newFieldName.trim()}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
