"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { SmartSelect } from "@/components/ui/smart-select";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Receipt,
  Trash2,
  X,
  RefreshCw,
  ShoppingCart,
  FileText,
  Bell,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { APPOINTMENT_STATUSES, TREATMENT_CATEGORIES, DAY_NAMES } from "@/lib/types";

interface Patient {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  color: string;
}

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  treatmentType: string;
  status: string;
  notes?: string;
  employeeId?: string;
  employeeName?: string;
  employeeColor?: string;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateTR(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const dayName = DAY_NAMES[d.getDay()];
  return `${day}.${month}.${year} ${dayName}`;
}

function getStatusInfo(status: string) {
  return APPOINTMENT_STATUSES.find((s) => s.value === status) || APPOINTMENT_STATUSES[0];
}

function getTreatmentLabel(value: string) {
  return TREATMENT_CATEGORIES.find((t) => t.value === value)?.label || value;
}

// All time slots 00:00 - 23:30 (used for both calendar and form)
function generateAllTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}
const ALL_TIME_SLOTS = generateAllTimeSlots();

function isOutsideWorkHours(time: string, workStart: string, workEnd: string): boolean {
  return time < workStart || time >= workEnd;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-100", className)} />;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const PREFS_KEY = "appointment-prefs";

function loadPrefs(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
}

function savePrefs(update: Record<string, any>) {
  if (typeof window === "undefined") return;
  const current = loadPrefs();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...update }));
}

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewModeRaw, setViewModeRaw] = useState(() => loadPrefs().viewMode || "daily");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  // Mobilde de haftalık görünüme geçilebilir
  const viewMode = viewModeRaw;
  const setViewMode = (v: string) => { setViewModeRaw(v); savePrefs({ viewMode: v }); };
  const compactMode = true;
  const [hideEmpty, setHideEmpty] = useState(() => loadPrefs().hideEmpty ?? false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [workEndTime, setWorkEndTime] = useState("17:30");
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("service") || "all";
    }
    return "all";
  });
  const [showAllServices, setShowAllServices] = useState(false);

  // New appointment dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [newAppt, setNewAppt] = useState({
    patientId: "",
    employeeId: "",
    date: "",
    startTime: "",
    treatmentType: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  // Treatment autocomplete
  const [dialogServiceSuggestions, setDialogServiceSuggestions] = useState<string[]>([]);
  const [dialogLoadingSuggestions, setDialogLoadingSuggestions] = useState(false);
  // New customer inline form (dialog)
  const [dialogNewCustomer, setDialogNewCustomer] = useState(false);
  const [dialogNewCustomerName, setDialogNewCustomerName] = useState("");
  const [dialogNewCustomerPhone, setDialogNewCustomerPhone] = useState("");
  const [dialogSavingCustomer, setDialogSavingCustomer] = useState(false);
  // New employee inline form (dialog)
  const [dialogNewEmployee, setDialogNewEmployee] = useState(false);
  const [dialogNewEmployeeName, setDialogNewEmployeeName] = useState("");
  const [dialogNewEmployeeRole, setDialogNewEmployeeRole] = useState("");
  const [dialogSavingEmployee, setDialogSavingEmployee] = useState(false);

  // Inline add form states (filter row)
  const [showInlineEmployee, setShowInlineEmployee] = useState(false);
  const [inlineEmployeeName, setInlineEmployeeName] = useState("");
  const [savingInlineEmployee, setSavingInlineEmployee] = useState(false);
  const [showInlineService, setShowInlineService] = useState(false);
  const [inlineServiceName, setInlineServiceName] = useState("");
  const [savingInlineService, setSavingInlineService] = useState(false);

  // Transaction tab state
  const [appointmentTreatments, setAppointmentTreatments] = useState<any[]>([]);
  const [transactionItems, setTransactionItems] = useState([{ name: "", amount: "", paymentMethod: "Nakit", notes: "" }]);
  const [savingTransactions, setSavingTransactions] = useState(false);
  const [markCompleted, setMarkCompleted] = useState(false);
  const [detailTab, setDetailTab] = useState("detail");

  const dailyScrollRef = useRef<HTMLDivElement>(null);
  const weeklyScrollRef = useRef<HTMLDivElement>(null);

  const fetchDayAppointments = useCallback(async (date: Date, employeeId?: string, service?: string) => {
    setLoading(true);
    try {
      let url = `/api/appointments?date=${formatDateISO(date)}`;
      if (employeeId && employeeId !== "all") {
        url += `&employeeId=${employeeId}`;
      }
      if (service && service !== "all") {
        url += `&service=${encodeURIComponent(service)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || data || []);
      }
    } catch {
      /* silently handle */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeekAppointments = useCallback(async (date: Date, employeeId?: string, service?: string) => {
    setLoading(true);
    const monday = getMonday(date);
    const weekData: Record<string, Appointment[]> = {};

    const employeeParam = employeeId && employeeId !== "all" ? `&employeeId=${employeeId}` : "";
    const serviceParam = service && service !== "all" ? `&service=${encodeURIComponent(service)}` : "";

    try {
      const promises = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = formatDateISO(d);
        return fetch(`/api/appointments?date=${dateStr}${employeeParam}${serviceParam}`)
          .then((res) => (res.ok ? res.json() : { appointments: [] }))
          .then((data) => {
            weekData[dateStr] = data.appointments || data || [];
          });
      });
      await Promise.all(promises);
      setWeekAppointments(weekData);
    } catch {
      /* silently handle */
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchServiceNames = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic/service-names");
      if (res.ok) {
        const data = await res.json();
        setServiceNames(Array.isArray(data) ? data : []);
      }
    } catch { /* silently handle */ }
  }, []);

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : { employees: [] }))
      .then((data) => {
        const all = data.employees || data || [];
        setEmployees(all.filter((e: any) => e.showInCalendar !== false));
      })
      .catch(() => {});
    fetch("/api/patients")
      .then((res) => (res.ok ? res.json() : { patients: [] }))
      .then((data) => {
        setPatients(data.patients || data || []);
      })
      .catch(() => {});
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.workStartTime) setWorkStartTime(data.workStartTime);
        if (data?.workEndTime) setWorkEndTime(data.workEndTime);
      })
      .catch(() => {});
    refetchServiceNames();
  }, [refetchServiceNames]);

  // Treatment type autocomplete for dialog
  useEffect(() => {
    if (newAppt.treatmentType.length < 2) {
      setDialogServiceSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setDialogLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/appointments/types?q=${encodeURIComponent(newAppt.treatmentType)}`);
        if (res.ok) {
          const data = await res.json();
          setDialogServiceSuggestions(data.types || []);
        }
      } catch { /* silently handle */ }
      finally { setDialogLoadingSuggestions(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [newAppt.treatmentType]);

  useEffect(() => {
    if (viewMode === "daily") {
      fetchDayAppointments(selectedDate, selectedEmployee, selectedService);
    } else {
      fetchWeekAppointments(selectedDate, selectedEmployee, selectedService);
    }
  }, [selectedDate, viewMode, selectedEmployee, selectedService, fetchDayAppointments, fetchWeekAppointments]);

  // Sync selectedService to URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedService && selectedService !== "all") {
      url.searchParams.set("service", selectedService);
    } else {
      url.searchParams.delete("service");
    }
    window.history.replaceState({}, "", url.toString());
  }, [selectedService]);

  function goToday() { setSelectedDate(new Date()); }
  function goPrev() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (viewMode === "weekly" ? 7 : 1));
    setSelectedDate(d);
  }
  function goNext() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (viewMode === "weekly" ? 7 : 1));
    setSelectedDate(d);
  }

  function getAppointmentsForSlot(time: string): Appointment[] {
    return appointments.filter((a) => a.startTime === time);
  }

  async function updateAppointmentStatus(id: string, status: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        if (viewMode === "daily") {
          await fetchDayAppointments(selectedDate, selectedEmployee, selectedService);
        } else {
          await fetchWeekAppointments(selectedDate, selectedEmployee, selectedService);
        }
        setDialogOpen(false);
        setSelectedAppointment(null);
      }
    } catch {
      /* silently handle */
    } finally {
      setUpdating(false);
    }
  }

  const refetchPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || data || []);
      }
    } catch { /* silently handle */ }
  }, []);

  const refetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        const all = data.employees || data || [];
        setEmployees(all.filter((e: any) => e.showInCalendar !== false));
      }
    } catch { /* silently handle */ }
  }, []);

  const fetchAppointmentTreatments = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}/transactions`);
      if (res.ok) {
        const data = await res.json();
        setAppointmentTreatments(data.treatments || []);
      }
    } catch { /* silently handle */ }
  }, []);

  async function handleSaveTransactions() {
    if (!selectedAppointment) return;
    const valid = transactionItems.filter((t) => t.name.trim());
    if (valid.length === 0) return;

    setSavingTransactions(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: valid.map((t) => ({
            patientId: selectedAppointment.patientId,
            name: t.name.trim(),
            amount: Math.round(Number(t.amount) * 100), // TL to kuruş
            date: selectedAppointment.date,
            paymentMethod: t.paymentMethod || "Nakit",
            description: t.notes || undefined,
            employeeId: selectedAppointment.employeeId || undefined,
          })),
          markCompleted,
        }),
      });
      if (res.ok) {
        await fetchAppointmentTreatments(selectedAppointment.id);
        setTransactionItems([{ name: "", amount: "", paymentMethod: "Nakit", notes: "" }]);
        setMarkCompleted(false);
        // Refresh appointments list
        if (viewMode === "daily") {
          await fetchDayAppointments(selectedDate, selectedEmployee, selectedService);
        } else {
          await fetchWeekAppointments(selectedDate, selectedEmployee, selectedService);
        }
      }
    } catch { /* silently handle */ }
    finally { setSavingTransactions(false); }
  }

  async function handleDialogNewCustomer() {
    if (!dialogNewCustomerName.trim()) return;
    setDialogSavingCustomer(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dialogNewCustomerName.trim(),
          phone: dialogNewCustomerPhone.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data.id || data.patient?.id;
        await refetchPatients();
        if (newId) setNewAppt((prev) => ({ ...prev, patientId: newId }));
        setDialogNewCustomer(false);
        setDialogNewCustomerName("");
        setDialogNewCustomerPhone("");
      }
    } catch { /* silently handle */ }
    finally { setDialogSavingCustomer(false); }
  }

  async function handleDialogNewEmployee() {
    if (!dialogNewEmployeeName.trim()) return;
    setDialogSavingEmployee(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: dialogNewEmployeeName.trim(),
          role: dialogNewEmployeeRole.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data.id || data.employee?.id;
        await refetchEmployees();
        if (newId) setNewAppt((prev) => ({ ...prev, employeeId: newId }));
        setDialogNewEmployee(false);
        setDialogNewEmployeeName("");
        setDialogNewEmployeeRole("");
      }
    } catch { /* silently handle */ }
    finally { setDialogSavingEmployee(false); }
  }

  function openCreateDialog() {
    setNewAppt({
      patientId: "",
      employeeId: "",
      date: formatDateISO(selectedDate),
      startTime: "",
      treatmentType: "",
      notes: "",
    });
    setCreateError("");
    setDialogNewCustomer(false);
    setDialogNewEmployee(false);
    setCreateDialogOpen(true);
  }

  function getEndTime(start: string): string {
    const [h, m] = start.split(":").map(Number);
    const totalMinutes = h * 60 + m + 30;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  async function handleCreateAppointment() {
    setCreateError("");
    const errors: Record<string, boolean> = {};
    if (!newAppt.patientId) errors.patientId = true;
    if (!newAppt.date) errors.date = true;
    if (!newAppt.startTime) errors.startTime = true;
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setCreateError("Kırmızı ile işaretli alanları doldurun.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: newAppt.patientId,
          employeeId: newAppt.employeeId || undefined,
          date: newAppt.date,
          startTime: newAppt.startTime,
          endTime: getEndTime(newAppt.startTime),
          treatmentType: newAppt.treatmentType,
          notes: newAppt.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Randevu oluşturulamadı");
      }
      setCreateDialogOpen(false);
      if (viewMode === "daily") {
        await fetchDayAppointments(selectedDate, selectedEmployee, selectedService);
      } else {
        await fetchWeekAppointments(selectedDate, selectedEmployee, selectedService);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  }

  function saveWorkHours(start: string, end: string) {
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workStartTime: start, workEndTime: end }),
    }).catch(() => {});
  }

  function handleWorkStartChange(val: string) {
    setWorkStartTime(val);
    saveWorkHours(val, workEndTime);
    // Scroll to new start time
    setTimeout(() => {
      const container = viewMode === "daily" ? dailyScrollRef.current : weeklyScrollRef.current;
      if (container) {
        const target = container.querySelector(`[data-time="${val}"]`);
        if (target) target.scrollIntoView({ block: "start" });
      }
    }, 50);
  }

  function handleWorkEndChange(val: string) {
    setWorkEndTime(val);
    saveWorkHours(workStartTime, val);
  }

  // Auto-scroll to work start time after loading
  useEffect(() => {
    if (loading) return;
    const scrollToDefault = (container: HTMLDivElement | null) => {
      if (!container) return;
      const target = container.querySelector(`[data-time="${workStartTime}"]`);
      if (target) {
        target.scrollIntoView({ block: "start" });
      }
    };
    if (viewMode === "daily") {
      scrollToDefault(dailyScrollRef.current);
    } else {
      scrollToDefault(weeklyScrollRef.current);
    }
  }, [loading, viewMode, workStartTime]);

  // Filter time slots: show work hours + 1 buffer slot + any slots with appointments
  const visibleTimeSlots = useMemo(() => {
    const startIdx = Math.max(0, ALL_TIME_SLOTS.indexOf(workStartTime) - 1);
    const endIdx = Math.min(ALL_TIME_SLOTS.length - 1, ALL_TIME_SLOTS.indexOf(workEndTime) + 1);

    // Collect all appointment start times
    const appointmentTimes = new Set<string>();
    if (viewMode === "daily") {
      appointments.forEach((a) => appointmentTimes.add(a.startTime));
    } else {
      Object.values(weekAppointments).forEach((dayAppts) => {
        dayAppts.forEach((a) => appointmentTimes.add(a.startTime));
      });
    }

    return ALL_TIME_SLOTS.filter((time, idx) => {
      if (idx >= startIdx && idx <= endIdx) {
        if (hideEmpty && !appointmentTimes.has(time)) return false;
        return true;
      }
      if (appointmentTimes.has(time)) return true;
      return false;
    });
  }, [workStartTime, workEndTime, appointments, weekAppointments, viewMode, hideEmpty]);

  const isToday = formatDateISO(selectedDate) === formatDateISO(new Date());
  const nowTime = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Bugün
          </button>
          <button onClick={goPrev} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goNext} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">{formatDateTR(selectedDate)}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Work hours */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 sm:px-2.5 sm:py-1.5">
            <span className="text-xs font-medium text-gray-500">Mesai:</span>
            <select
              value={workStartTime}
              onChange={(e) => handleWorkStartChange(e.target.value)}
              className="border-0 bg-transparent py-0 pl-1 pr-0 text-sm font-medium text-gray-700 focus:outline-none focus:ring-0"
            >
              {ALL_TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">-</span>
            <select
              value={workEndTime}
              onChange={(e) => handleWorkEndChange(e.target.value)}
              className="border-0 bg-transparent py-0 pl-1 pr-0 text-sm font-medium text-gray-700 focus:outline-none focus:ring-0"
            >
              {ALL_TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <input
            type="date"
            value={formatDateISO(selectedDate)}
            onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
            className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm text-gray-700 transition-shadow focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
          />
          <button
            onClick={openCreateDialog}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-[#1E1E2D] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#2A2A3C]"
          >
            <Plus className="h-4 w-4" />
            Randevu Ekle
          </button>
        </div>
      </motion.div>

      {/* Minimal filter bar */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2">
        {/* Employee chips */}
        <button
          onClick={() => setSelectedEmployee("all")}
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            selectedEmployee === "all"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Tümü
        </button>
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedEmployee(selectedEmployee === emp.id ? "all" : emp.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              selectedEmployee === emp.id
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: emp.color }} />
            {emp.name}
          </button>
        ))}
        {/* Service filter — compact */}
        {serviceNames.length > 0 && (
          <>
            <div className="mx-1 h-4 w-px bg-gray-200" />
            {serviceNames.slice(0, 5).map((name) => (
              <button
                key={name}
                onClick={() => setSelectedService(selectedService === name ? "all" : name)}
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedService === name
                    ? "bg-[#4F46E5] text-white"
                    : "bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]"
                )}
              >
                {name}
              </button>
            ))}
          </>
        )}
        {/* Hide empty toggle */}
        <div className="ml-auto">
          <button
            onClick={() => { const v = !hideEmpty; setHideEmpty(v); savePrefs({ hideEmpty: v }); }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
              hideEmpty ? "bg-[#E0E7FF] text-[#4F46E5]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            Boş Gizle
          </button>
        </div>
      </motion.div>

      {/* View tabs + Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-4">
          {[
            { value: "daily", label: "Günlük" },
            { value: "weekly", label: "Haftalık" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setViewMode(tab.value)}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                viewMode === tab.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={openCreateDialog}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#4F46E5] hover:bg-white hover:shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Randevu Ekle</span>
            <span className="sm:hidden">Ekle</span>
          </button>
        </div>
        {viewMode === "daily" ? (
          /* ── Daily view — employee columns ── */
          <div ref={dailyScrollRef} className="max-h-[calc(100vh-280px)] overflow-x-auto overflow-y-auto rounded-xl border border-gray-100 bg-white">
            {loading ? (
              <div className="space-y-0 divide-y divide-gray-50 p-0">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-12 flex-1 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : employees.length > 1 && selectedEmployee === "all" ? (
              /* Multi-employee column view */
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-gray-100">
                    <th className="w-16 sm:w-20 px-1 py-2 text-[10px] sm:text-xs font-medium text-gray-400 text-center">Saat</th>
                    {employees.map((emp) => (
                      <th key={emp.id} className="px-1 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: emp.color }} />
                          <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate">{emp.name}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-1 py-2 text-center">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-400">Genel</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTimeSlots.map((time) => {
                    const isCurrentSlot = isToday && time === nowTime.slice(0, 5);
                    const isOffHours = isOutsideWorkHours(time, workStartTime, workEndTime);
                    return (
                      <tr key={time} data-time={time} className={cn("border-b border-gray-50", isCurrentSlot && "bg-[#EEF2FF]/50", isOffHours && !isCurrentSlot && "bg-gray-50/70")}>
                        <td className={cn("px-1 py-1 text-center text-[10px] sm:text-xs font-medium border-r border-gray-50", isOffHours ? "text-gray-300" : "text-gray-500")}>{time}</td>
                        {employees.map((emp) => {
                          const empAppts = appointments.filter(a => a.startTime === time && a.employeeId === emp.id);
                          return (
                            <td key={emp.id} className="px-0.5 py-0.5 align-top border-r border-gray-50 last:border-0">
                              {empAppts.map((appt) => (
                                <div key={appt.id} className="relative group mb-0.5">
                                  <button
                                    onClick={() => { setSelectedAppointment(appt); setTransactionItems([{ name: appt.treatmentType || "", amount: "", paymentMethod: "Nakit", notes: "" }]); setAppointmentTreatments([]); fetchAppointmentTreatments(appt.id); setDialogOpen(true); }}
                                    className="w-full rounded-md px-1.5 py-1 text-left text-[10px] sm:text-xs transition-all hover:shadow-sm"
                                    style={{ backgroundColor: `${emp.color}15`, borderLeft: `2px solid ${emp.color}` }}
                                  >
                                    <div className="font-semibold text-gray-900 truncate">{appt.patientName}</div>
                                    {appt.treatmentType && <div className="text-gray-500 truncate">{appt.treatmentType}</div>}
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!confirm("Bu randevuyu silmek istediğinize emin misiniz?")) return;
                                      await fetch(`/api/appointments/${appt.id}`, { method: "DELETE" }).catch(() => {});
                                      if (viewMode === "daily") fetchDayAppointments(selectedDate, selectedEmployee, selectedService);
                                      else fetchWeekAppointments(selectedDate, selectedEmployee, selectedService);
                                    }}
                                    className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[8px] hover:bg-red-600 shadow-sm"
                                    title="Sil"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ))}
                              {/* Always show + button */}
                              <button
                                onClick={() => { setNewAppt((prev) => ({ ...prev, date: formatDateISO(selectedDate), startTime: time, employeeId: emp.id })); setCreateDialogOpen(true); }}
                                className="w-full rounded-md py-0.5 text-center text-[9px] text-gray-300 hover:text-[#4F46E5] hover:bg-[#EEF2FF]/30 transition-colors"
                              >
                                +
                              </button>
                            </td>
                          );
                        })}
                        {/* Genel (unassigned) column */}
                        {(() => {
                          const unassigned = appointments.filter(a => a.startTime === time && !a.employeeId);
                          return (
                            <td className="px-0.5 py-0.5 align-top">
                              {unassigned.map((appt) => (
                                <div key={appt.id} className="relative group mb-0.5">
                                  <button
                                    onClick={() => { setSelectedAppointment(appt); setTransactionItems([{ name: appt.treatmentType || "", amount: "", paymentMethod: "Nakit", notes: "" }]); setAppointmentTreatments([]); fetchAppointmentTreatments(appt.id); setDialogOpen(true); }}
                                    className="w-full rounded-md px-1.5 py-1 text-left text-[10px] sm:text-xs bg-gray-50 border-l-2 border-gray-300 hover:shadow-sm"
                                  >
                                    <div className="font-semibold text-gray-900 truncate">{appt.patientName}</div>
                                    {appt.treatmentType && <div className="text-gray-500 truncate">{appt.treatmentType}</div>}
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!confirm("Bu randevuyu silmek istediğinize emin misiniz?")) return;
                                      await fetch(`/api/appointments/${appt.id}`, { method: "DELETE" }).catch(() => {});
                                      if (viewMode === "daily") fetchDayAppointments(selectedDate, selectedEmployee, selectedService);
                                      else fetchWeekAppointments(selectedDate, selectedEmployee, selectedService);
                                    }}
                                    className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[8px] hover:bg-red-600 shadow-sm"
                                    title="Sil"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => { setNewAppt((prev) => ({ ...prev, date: formatDateISO(selectedDate), startTime: time, employeeId: "" })); setCreateDialogOpen(true); }}
                                className="w-full rounded-md py-0.5 text-center text-[9px] text-gray-300 hover:text-[#4F46E5] hover:bg-[#EEF2FF]/30 transition-colors"
                              >
                                +
                              </button>
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* Single column view (1 employee or filtered) */
              <div className="divide-y divide-gray-50">
                {visibleTimeSlots.map((time) => {
                  const slotAppointments = getAppointmentsForSlot(time);
                  const isCurrentSlot = isToday && time === nowTime.slice(0, 5);

                  const isOffHours = isOutsideWorkHours(time, workStartTime, workEndTime);

                  return (
                    <div
                      key={time}
                      data-time={time}
                      className={cn(
                        "flex items-stretch",
                        slotAppointments.length > 0 ? "min-h-[40px]" : "min-h-[16px]",
                        isCurrentSlot && "bg-[#EEF2FF]/50",
                        isOffHours && !isCurrentSlot && "bg-gray-50/70"
                      )}
                    >
                      {/* Time label */}
                      <div className={cn(
                        "flex w-16 sm:w-20 shrink-0 items-center justify-center border-r border-gray-100 text-xs sm:text-sm font-medium",
                        isOffHours ? "text-gray-300" : "text-gray-500"
                      )}>
                        {time}
                      </div>

                      {/* Slot content */}
                      <div className={cn("flex flex-1 flex-col gap-0.5 px-2 sm:px-3", slotAppointments.length > 0 ? "py-1" : "py-0")}>
                        {slotAppointments.length > 0 ? (
                          slotAppointments.map((appointment) => {
                            const statusInfo = getStatusInfo(appointment.status);
                            const isCancelled = appointment.status === "CANCELLED";
                            const empColor = appointment.employeeColor || "#9ca3af";
                            return (
                              <button
                                key={appointment.id}
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setDetailTab("detail");
                                  setAppointmentTreatments([]);
                                  fetchAppointmentTreatments(appointment.id);
                                  setTransactionItems([{ name: appointment.treatmentType || "", amount: "", paymentMethod: "Nakit", notes: "" }]);
                                  setMarkCompleted(false);
                                  setDialogOpen(true);
                                }}
                                className={cn(
                                  "w-full rounded-xl text-left transition-all hover:shadow-md active:scale-[0.98] cursor-pointer group",
                                  "px-3.5 py-2.5",
                                  isCancelled && "opacity-50"
                                )}
                                style={{
                                  backgroundColor: `${empColor}10`,
                                  borderLeft: `3px solid ${empColor}`,
                                }}
                              >
                                <div className="flex items-start gap-2.5">
                                  <span
                                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: empColor }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm font-semibold text-gray-900 truncate",
                                      isCancelled && "line-through"
                                    )}>
                                      {appointment.patientName}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {getTreatmentLabel(appointment.treatmentType)}
                                    </p>
                                    {statusInfo && (
                                      <span className={cn(
                                        "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                        statusInfo.color,
                                      )}>
                                        {statusInfo.label}
                                      </span>
                                    )}
                                  </div>
                                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <button
                            onClick={() => {
                              setNewAppt((prev) => ({
                                ...prev,
                                date: formatDateISO(selectedDate),
                                startTime: time,
                              }));
                              setCreateDialogOpen(true);
                            }}
                            className="flex w-full items-center justify-center rounded-lg border border-dashed border-gray-200 py-2 text-sm text-gray-400 hover:border-[#6366F1] hover:text-[#6366F1] hover:bg-[#EEF2FF]/30 transition-colors cursor-pointer"
                          >
                            + Randevu Ekle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Weekly view ── */
          <div ref={weeklyScrollRef} className="overflow-y-auto sm:max-h-[calc(100vh-280px)] rounded-xl border border-gray-100 bg-white">
            {loading ? (
              <div className="p-6">
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: "640px" }}>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="w-14 sm:w-20 border-r border-gray-50 px-1 sm:px-2 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500">Saat</th>
                      {Array.from({ length: 7 }, (_, i) => {
                        const monday = getMonday(selectedDate);
                        const d = new Date(monday);
                        d.setDate(monday.getDate() + i);
                        const dateStr = formatDateISO(d);
                        const isTodayCol = dateStr === formatDateISO(new Date());
                        const shortDays = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];
                        return (
                          <th
                            key={i}
                            className={cn(
                              "px-0.5 sm:px-1 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium",
                              isTodayCol ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-gray-500"
                            )}
                          >
                            <div className="hidden sm:block">{DAY_NAMES[d.getDay()]}</div>
                            <div className="sm:hidden">{shortDays[d.getDay()]}</div>
                            <div className="text-xs sm:text-sm font-semibold">{d.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTimeSlots.map((time) => {
                      const isOffHours = isOutsideWorkHours(time, workStartTime, workEndTime);
                      return (
                      <tr key={time} data-time={time} className={cn("border-b border-gray-50", isOffHours && "bg-gray-50/70")}>
                        <td className={cn("border-r border-gray-50 px-1 sm:px-2 py-1 text-[10px] sm:text-xs", isOffHours ? "text-gray-300" : "text-gray-400")}>{time}</td>
                        {Array.from({ length: 7 }, (_, i) => {
                          const monday = getMonday(selectedDate);
                          const d = new Date(monday);
                          d.setDate(monday.getDate() + i);
                          const dateStr = formatDateISO(d);
                          const dayAppts = weekAppointments[dateStr] || [];
                          const slotAppts = dayAppts.filter((a) => a.startTime === time);
                          const isTodayCol = dateStr === formatDateISO(new Date());

                          return (
                            <td
                              key={i}
                              className={cn("align-top cursor-pointer", compactMode ? "px-0.5 py-0.5" : "px-1 py-1", isTodayCol && "bg-[#EEF2FF]/30", slotAppts.length === 0 && "hover:bg-[#EEF2FF]/20")}
                              onClick={() => {
                                if (slotAppts.length === 0) {
                                  setNewAppt((prev) => ({ ...prev, date: dateStr, startTime: time }));
                                  setCreateDialogOpen(true);
                                }
                              }}
                            >
                              <div className="flex flex-col gap-0.5">
                                {slotAppts.map((appt) => {
                                  const statusInfo = getStatusInfo(appt.status);
                                  return (
                                    <button
                                      key={appt.id}
                                      onClick={() => {
                                        setSelectedAppointment(appt);
                                        setTransactionItems([{ name: appt.treatmentType || "", amount: "", paymentMethod: "Nakit", notes: "" }]);
                                        setAppointmentTreatments([]);
                                        fetchAppointmentTreatments(appt.id);
                                        setDialogOpen(true);
                                      }}
                                      className={cn(
                                        "w-full rounded-md text-left transition-all hover:shadow-sm",
                                        "px-1.5 py-1 text-[10px] sm:text-xs",
                                        appt.status === "CANCELLED" && "opacity-50"
                                      )}
                                      style={{
                                        backgroundColor: `${appt.employeeColor || "#9ca3af"}12`,
                                        borderLeft: `2px solid ${appt.employeeColor || "#9ca3af"}`,
                                      }}
                                    >
                                      <div className="flex items-center gap-0.5 font-semibold text-gray-900 truncate">
                                        <span
                                          className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 rounded-full"
                                          style={{ backgroundColor: appt.employeeColor || "#9ca3af" }}
                                        />
                                        <span className="truncate">{appt.patientName || "?"}</span>
                                      </div>
                                      <div className="truncate text-gray-500">
                                        {getTreatmentLabel(appt.treatmentType)}
                                      </div>
                                      {statusInfo && (
                                        <span className={cn("mt-0.5 inline-block rounded-full px-1 py-0 text-[8px] sm:text-[9px] font-semibold", statusInfo.color)}>
                                          {statusInfo.label}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Create Appointment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="rounded-xl max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Yeni Randevu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {createError && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{createError}</div>
            )}

            {/* Müşteri */}
            <div className={`space-y-1.5 ${formErrors.patientId ? "rounded-lg ring-2 ring-red-300 p-1" : ""}`}>
              <label className={`text-sm font-medium ${formErrors.patientId ? "text-red-600" : "text-gray-700"}`}>Müşteri *</label>
              <SmartSelect
                items={patients.map((p) => ({ id: p.id, label: p.name }))}
                value={newAppt.patientId}
                onChange={(val) => { setNewAppt({ ...newAppt, patientId: val }); setFormErrors(p => ({ ...p, patientId: false })); }}
                displayValue={patients.find((p) => p.id === newAppt.patientId)?.name}
                placeholder="Müşteri ara veya seç..."
                required
                createLabel="Yeni Müşteri Ekle"
                showCreateForm={dialogNewCustomer}
                onCreateFormToggle={setDialogNewCustomer}
                createForm={
                  <>
                    <p className="text-sm font-medium text-[#4F46E5]">Yeni Müşteri Ekle</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Ad Soyad *</label>
                        <input
                          value={dialogNewCustomerName}
                          onChange={(e) => setDialogNewCustomerName(e.target.value)}
                          placeholder="Müşteri adı"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Telefon</label>
                        <input
                          value={dialogNewCustomerPhone}
                          onChange={(e) => setDialogNewCustomerPhone(e.target.value)}
                          placeholder="05XX XXX XX XX"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDialogNewCustomer}
                      disabled={dialogSavingCustomer || !dialogNewCustomerName.trim()}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E2D] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2A2A3C] disabled:opacity-50"
                    >
                      {dialogSavingCustomer ? "Kaydediliyor..." : "Kaydet ve Seç"}
                    </button>
                  </>
                }
              />
            </div>

            {/* Çalışan */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Çalışan</label>
              <SmartSelect
                items={employees.map((e) => ({ id: e.id, label: e.name }))}
                value={newAppt.employeeId}
                onChange={(val) => setNewAppt({ ...newAppt, employeeId: val })}
                displayValue={employees.find((e) => e.id === newAppt.employeeId)?.name}
                placeholder="Çalışan seçin (opsiyonel)"
                createLabel="Yeni Çalışan Ekle"
                showCreateForm={dialogNewEmployee}
                onCreateFormToggle={setDialogNewEmployee}
                createForm={
                  <>
                    <p className="text-sm font-medium text-[#4F46E5]">Yeni Çalışan Ekle</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Ad Soyad *</label>
                        <input
                          value={dialogNewEmployeeName}
                          onChange={(e) => setDialogNewEmployeeName(e.target.value)}
                          placeholder="Çalışan adı"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Unvan</label>
                        <input
                          value={dialogNewEmployeeRole}
                          onChange={(e) => setDialogNewEmployeeRole(e.target.value)}
                          placeholder="Örn: Doktor, Hemşire"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDialogNewEmployee}
                      disabled={dialogSavingEmployee || !dialogNewEmployeeName.trim()}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E2D] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2A2A3C] disabled:opacity-50"
                    >
                      {dialogSavingEmployee ? "Kaydediliyor..." : "Kaydet ve Seç"}
                    </button>
                  </>
                }
              />
            </div>

            {/* Tarih */}
            <div className={`space-y-1.5 ${formErrors.date ? "rounded-lg ring-2 ring-red-300 p-1" : ""}`}>
              <label className={`text-sm font-medium ${formErrors.date ? "text-red-600" : "text-gray-700"}`}>Tarih *</label>
              <input
                type="date"
                value={newAppt.date}
                onChange={(e) => { setNewAppt({ ...newAppt, date: e.target.value }); setFormErrors(p => ({ ...p, date: false })); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
              />
            </div>

            {/* Saat */}
            <div className={`space-y-1.5 ${formErrors.startTime ? "rounded-lg ring-2 ring-red-300 p-1" : ""}`}>
              <label className={`text-sm font-medium ${formErrors.startTime ? "text-red-600" : "text-gray-700"}`}>Saat *</label>
              <select
                value={newAppt.startTime}
                onChange={(e) => setNewAppt({ ...newAppt, startTime: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
              >
                <option value="">Saat seçin...</option>
                {ALL_TIME_SLOTS.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            {/* Konu */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Konu</label>
              <SmartSelect
                freetext
                items={dialogServiceSuggestions.map((s) => ({ id: s, label: s }))}
                value={newAppt.treatmentType}
                onChange={(val) => setNewAppt({ ...newAppt, treatmentType: val })}
                loading={dialogLoadingSuggestions}
                placeholder="Görüşme konusu veya işlem..."
                filterLocally={false}
              />
            </div>

            {/* Notlar */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Notlar</label>
              <textarea
                value={newAppt.notes}
                onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                placeholder="Randevu ile ilgili notlar..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
              />
            </div>
          </div>
          <DialogFooter>
            <div className="flex w-full gap-2">
              <button
                onClick={handleCreateAppointment}
                disabled={creating}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1E1E2D] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2A2A3C] disabled:opacity-50"
              >
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</> : "Randevu Oluştur"}
              </button>
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                İptal
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">Randevu Detayı</DialogTitle>
              </DialogHeader>
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <div className="overflow-x-auto -mx-1 px-1">
                  <TabsList className="w-max sm:w-full">
                    <TabsTrigger value="detail" className="text-xs sm:text-sm">Detay</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs sm:text-sm">Notlar</TabsTrigger>
                    <TabsTrigger value="transactions" className="text-xs sm:text-sm">İşlem</TabsTrigger>
                    <TabsTrigger value="next-appointment" className="text-xs sm:text-sm">Sonraki</TabsTrigger>
                    <TabsTrigger value="reminders" className="text-xs sm:text-sm">Hatırlatma</TabsTrigger>
                  </TabsList>
                </div>

                {/* Detail Tab */}
                <TabsContent value="detail">
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Müşteri</span>
                      <Link
                        href={`/patients/${selectedAppointment.patientId}`}
                        className="font-medium text-[#6366F1] hover:underline"
                      >
                        {selectedAppointment.patientName}
                      </Link>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Tarih</span>
                      <span className="font-medium">{formatDateDisplay(selectedAppointment.date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Saat</span>
                      <span className="font-medium">
                        {selectedAppointment.startTime} - {selectedAppointment.endTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Konu</span>
                      <Badge className="bg-gray-100 text-gray-700">
                        {selectedAppointment.treatmentType || "Belirtilmemiş"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Durum</span>
                      <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-semibold", getStatusInfo(selectedAppointment.status).color)}>
                        {getStatusInfo(selectedAppointment.status).label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Çalışan</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: selectedAppointment.employeeColor || "#9ca3af" }}
                        />
                        <span className="font-medium">
                          {selectedAppointment.employeeName || "Atanmamış"}
                        </span>
                      </div>
                    </div>
                    {selectedAppointment.notes && (
                      <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-600">{selectedAppointment.notes}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes">
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Görüşme Öncesi Not</label>
                      <p className="text-[11px] text-gray-400 mb-1">Randevu oluşturulurken eklenen not</p>
                      <textarea
                        value={selectedAppointment.notes || ""}
                        onChange={(e) => setSelectedAppointment({ ...selectedAppointment, notes: e.target.value })}
                        onBlur={async () => {
                          await fetch(`/api/appointments/${selectedAppointment.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ notes: selectedAppointment.notes || "" }),
                          }).catch(() => {});
                        }}
                        placeholder="Randevu öncesi notlar..."
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]/20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Görüşme Notları</label>
                      <p className="text-[11px] text-gray-400 mb-1">Görüşme sırasında veya sonrasında eklenen notlar</p>
                      <textarea
                        value={(selectedAppointment as any).meetingNotes || ""}
                        onChange={(e) => setSelectedAppointment({ ...selectedAppointment, meetingNotes: e.target.value } as any)}
                        onBlur={async () => {
                          await fetch(`/api/appointments/${selectedAppointment.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ meetingNotes: (selectedAppointment as any).meetingNotes || "" }),
                          }).catch(() => {});
                        }}
                        placeholder="Görüşmede konuşulanlar, kararlar, yapılacaklar..."
                        rows={4}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]/20"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Transactions Tab */}
                <TabsContent value="transactions">
                  <div className="space-y-4 pt-2">
                    {/* Existing treatments */}
                    {appointmentTreatments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Mevcut İşlemler</h4>
                        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                          {appointmentTreatments.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <p className="text-sm font-medium">{t.name}</p>
                                <p className="text-xs text-gray-500">
                                  {t.paymentMethod || "—"}{t.employee?.name ? ` · ${t.employee.name}` : ""}
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-emerald-600">
                                {formatCurrency(t.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New transaction form */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">Yeni İşlem Ekle</h4>
                      {transactionItems.map((item, idx) => (
                        <div key={idx} className="space-y-2 rounded-lg border border-gray-200 p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <SmartSelect
                                freetext
                                items={serviceNames.map((s) => ({ id: s, label: s }))}
                                value={item.name}
                                onChange={(val) => {
                                  const updated = [...transactionItems];
                                  updated[idx] = { ...updated[idx], name: val };
                                  setTransactionItems(updated);
                                }}
                                placeholder="İşlem adı..."
                                filterLocally
                              />
                            </div>
                            {transactionItems.length > 1 && (
                              <button
                                onClick={() => setTransactionItems(transactionItems.filter((_, i) => i !== idx))}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <input
                                type="number"
                                value={item.amount}
                                onChange={(e) => {
                                  const updated = [...transactionItems];
                                  updated[idx] = { ...updated[idx], amount: e.target.value };
                                  setTransactionItems(updated);
                                }}
                                placeholder="Tutar (TL)"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                              />
                            </div>
                            <div>
                              <select
                                value={item.paymentMethod}
                                onChange={(e) => {
                                  const updated = [...transactionItems];
                                  updated[idx] = { ...updated[idx], paymentMethod: e.target.value };
                                  setTransactionItems(updated);
                                }}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                              >
                                <option value="Nakit">Nakit</option>
                                <option value="Kart">Kart</option>
                                <option value="Havale">Havale</option>
                                <option value="Sigorta">Sigorta</option>
                                <option value="Diger">Diğer</option>
                              </select>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => {
                              const updated = [...transactionItems];
                              updated[idx] = { ...updated[idx], notes: e.target.value };
                              setTransactionItems(updated);
                            }}
                            placeholder="Notlar (opsiyonel)"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => setTransactionItems([...transactionItems, { name: "", amount: "", paymentMethod: "Nakit", notes: "" }])}
                        className="flex items-center gap-1.5 text-sm font-medium text-[#6366F1] hover:text-[#4F46E5]"
                      >
                        <Plus className="h-4 w-4" /> Başka İşlem Ekle
                      </button>
                    </div>

                    {/* Mark completed checkbox */}
                    {selectedAppointment.status === "SCHEDULED" && (
                      <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={markCompleted}
                          onChange={(e) => setMarkCompleted(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">Randevuyu tamamlandı olarak işaretle</span>
                      </label>
                    )}

                    <button
                      onClick={handleSaveTransactions}
                      disabled={savingTransactions || transactionItems.every((t) => !t.name.trim())}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1E1E2D] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2A2A3C] disabled:opacity-50"
                    >
                      {savingTransactions ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</> : "Kaydet"}
                    </button>

                    <Link
                      href={`/finance/new-income?patientId=${selectedAppointment.patientId}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E0E7FF] bg-[#EEF2FF] px-3 py-2.5 text-sm font-semibold text-[#4F46E5] transition-colors hover:bg-[#E0E7FF]"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Sipariş Oluştur
                    </Link>
                  </div>
                </TabsContent>

                {/* Next Appointment Tab */}
                <TabsContent value="next-appointment">
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-gray-500">Bu görüşme sonrası yeni bir randevu/görüşme oluşturun.</p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Tarih *</label>
                        <input
                          type="date"
                          id="nextApptDate"
                          defaultValue=""
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Saat *</label>
                        <select id="nextApptTime" defaultValue="" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20">
                          <option value="">Seçin...</option>
                          {ALL_TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Çalışan</label>
                        <select id="nextApptEmployee" defaultValue={selectedAppointment.employeeId || ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20">
                          <option value="">Seçin...</option>
                          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Konu</label>
                        <input
                          type="text"
                          id="nextApptSubject"
                          defaultValue={selectedAppointment.treatmentType || ""}
                          placeholder="Görüşme konusu..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Not</label>
                        <textarea
                          id="nextApptNotes"
                          placeholder="Görüşme notu..."
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const date = (document.getElementById("nextApptDate") as HTMLInputElement)?.value;
                        const startTime = (document.getElementById("nextApptTime") as HTMLSelectElement)?.value;
                        const employeeId = (document.getElementById("nextApptEmployee") as HTMLSelectElement)?.value;
                        const treatmentType = (document.getElementById("nextApptSubject") as HTMLInputElement)?.value;
                        const notes = (document.getElementById("nextApptNotes") as HTMLTextAreaElement)?.value;
                        if (!date || !startTime) { alert("Tarih ve saat zorunludur."); return; }
                        try {
                          const res = await fetch("/api/appointments", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              patientId: selectedAppointment.patientId,
                              date,
                              startTime,
                              endTime: getEndTime(startTime),
                              employeeId: employeeId || undefined,
                              treatmentType: treatmentType || undefined,
                              notes: notes || undefined,
                            }),
                          });
                          if (res.ok) {
                            setDialogOpen(false);
                            if (viewMode === "daily") fetchDayAppointments(selectedDate, selectedEmployee, selectedService);
                            else fetchWeekAppointments(selectedDate, selectedEmployee, selectedService);
                          }
                        } catch {}
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#4F46E5] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
                    >
                      <Calendar className="h-4 w-4" />
                      Randevu Oluştur
                    </button>
                  </div>
                </TabsContent>

                {/* Reminders Tab */}
                <TabsContent value="reminders">
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-gray-500">Bu görüşmeyle ilgili yapılması gerekenleri hatırlatma olarak ekleyin.</p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Hatırlatma</label>
                        <input
                          type="text"
                          id="reminderText"
                          placeholder="Örn: Teklif gönder, Numune hazırla..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Tarih <span className="text-gray-400 text-xs font-normal">(opsiyonel)</span></label>
                        <input
                          type="date"
                          id="reminderDate"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                        />
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const text = (document.getElementById("reminderText") as HTMLInputElement)?.value;
                        const date = (document.getElementById("reminderDate") as HTMLInputElement)?.value;
                        if (!text?.trim()) { alert("Hatırlatma metni gerekli."); return; }
                        try {
                          await fetch("/api/alarms", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              type: "REMINDER",
                              name: text.trim(),
                              customerId: selectedAppointment.patientId,
                              conditions: {
                                appointmentId: selectedAppointment.id,
                                note: `Randevu: ${selectedAppointment.patientName} - ${formatDateDisplay(selectedAppointment.date)}`,
                                ...(date ? { dueDate: date } : {}),
                              },
                            }),
                          });
                          (document.getElementById("reminderText") as HTMLInputElement).value = "";
                          (document.getElementById("reminderDate") as HTMLInputElement).value = "";
                          alert("Hatırlatma eklendi!");
                        } catch {}
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                    >
                      <Bell className="h-4 w-4" />
                      Hatırlatma Ekle
                    </button>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <div className="flex w-full gap-2">
                  {selectedAppointment.status === "SCHEDULED" ? (
                    <>
                      <button
                        disabled={updating}
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, "COMPLETED")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" /> Tamamlandı
                      </button>
                      <button
                        disabled={updating}
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, "CANCELLED")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> İptal Et
                      </button>
                      <button
                        disabled={updating}
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, "NO_SHOW")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-orange-200 px-3 py-2.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
                      >
                        <AlertCircle className="h-4 w-4" /> Gelmedi
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDetailTab("next-appointment")}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#4F46E5] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
                    >
                      <Calendar className="h-4 w-4" /> Yeni Randevu Oluştur
                    </button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
