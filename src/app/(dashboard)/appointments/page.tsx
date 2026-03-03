"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
const SCROLL_TO_TIME = "09:00";

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

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("daily");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

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
  // Treatment autocomplete
  const [treatmentSuggestions, setTreatmentSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const treatmentInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const dailyScrollRef = useRef<HTMLDivElement>(null);
  const weeklyScrollRef = useRef<HTMLDivElement>(null);

  const fetchDayAppointments = useCallback(async (date: Date, employeeId?: string) => {
    setLoading(true);
    try {
      let url = `/api/appointments?date=${formatDateISO(date)}`;
      if (employeeId && employeeId !== "all") {
        url += `&employeeId=${employeeId}`;
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

  const fetchWeekAppointments = useCallback(async (date: Date, employeeId?: string) => {
    setLoading(true);
    const monday = getMonday(date);
    const weekData: Record<string, Appointment[]> = {};

    const employeeParam = employeeId && employeeId !== "all" ? `&employeeId=${employeeId}` : "";

    try {
      const promises = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = formatDateISO(d);
        return fetch(`/api/appointments?date=${dateStr}${employeeParam}`)
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

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : { employees: [] }))
      .then((data) => {
        setEmployees(data.employees || data || []);
      })
      .catch(() => {});
    fetch("/api/patients")
      .then((res) => (res.ok ? res.json() : { patients: [] }))
      .then((data) => {
        setPatients(data.patients || data || []);
      })
      .catch(() => {});
  }, []);

  // Treatment type autocomplete
  useEffect(() => {
    if (newAppt.treatmentType.length < 2) {
      setTreatmentSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/appointments/types?q=${encodeURIComponent(newAppt.treatmentType)}`);
        if (res.ok) {
          const data = await res.json();
          setTreatmentSuggestions(data.types || []);
          setShowSuggestions(true);
        }
      } catch { /* silently handle */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [newAppt.treatmentType]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        treatmentInputRef.current && !treatmentInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (viewMode === "daily") {
      fetchDayAppointments(selectedDate, selectedEmployee);
    } else {
      fetchWeekAppointments(selectedDate, selectedEmployee);
    }
  }, [selectedDate, viewMode, selectedEmployee, fetchDayAppointments, fetchWeekAppointments]);

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
          await fetchDayAppointments(selectedDate, selectedEmployee);
        } else {
          await fetchWeekAppointments(selectedDate, selectedEmployee);
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
    if (!newAppt.patientId || !newAppt.date || !newAppt.startTime || !newAppt.treatmentType) {
      setCreateError("Lütfen tüm zorunlu alanları doldurun.");
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
        await fetchDayAppointments(selectedDate, selectedEmployee);
      } else {
        await fetchWeekAppointments(selectedDate, selectedEmployee);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  }

  // Auto-scroll to 09:00 after loading
  useEffect(() => {
    if (loading) return;
    const scrollToDefault = (container: HTMLDivElement | null) => {
      if (!container) return;
      const target = container.querySelector(`[data-time="${SCROLL_TO_TIME}"]`);
      if (target) {
        target.scrollIntoView({ block: "start" });
      }
    };
    if (viewMode === "daily") {
      scrollToDefault(dailyScrollRef.current);
    } else {
      scrollToDefault(weeklyScrollRef.current);
    }
  }, [loading, viewMode]);

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
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={formatDateISO(selectedDate)}
            onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            Yeni Randevu
          </button>
        </div>
      </motion.div>

      {/* View tabs */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex gap-1 rounded-xl bg-gray-100 p-1">
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
      </motion.div>

      {/* Employee filter pills */}
      {employees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedEmployee("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
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
              onClick={() => setSelectedEmployee(emp.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                selectedEmployee === emp.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: emp.color }}
              />
              {emp.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {viewMode === "daily" ? (
          /* ── Daily view ── */
          <div ref={dailyScrollRef} className="max-h-[600px] overflow-y-auto rounded-2xl border border-gray-100 bg-white">
            {loading ? (
              <div className="space-y-0 divide-y divide-gray-50 p-0">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-12 flex-1 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {ALL_TIME_SLOTS.map((time) => {
                  const slotAppointments = getAppointmentsForSlot(time);
                  const isCurrentSlot = isToday && time === nowTime.slice(0, 5);

                  return (
                    <div
                      key={time}
                      data-time={time}
                      className={cn(
                        "flex min-h-[56px] items-stretch",
                        isCurrentSlot && "bg-blue-50/50"
                      )}
                    >
                      {/* Time label */}
                      <div className="flex w-20 shrink-0 items-center justify-center border-r border-gray-100 text-sm font-medium text-gray-500">
                        {time}
                      </div>

                      {/* Slot content */}
                      <div className="flex flex-1 flex-col gap-1 px-3 py-2">
                        {slotAppointments.length > 0 ? (
                          slotAppointments.map((appointment) => {
                            const statusInfo = getStatusInfo(appointment.status);
                            const isCancelled = appointment.status === "CANCELLED";
                            return (
                              <button
                                key={appointment.id}
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setDialogOpen(true);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg border px-4 py-2 text-left transition-colors hover:bg-gray-50",
                                  isCancelled && "opacity-60"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: appointment.employeeColor || "#9ca3af" }}
                                    title={appointment.employeeName || "Atanmamış"}
                                  />
                                  <div>
                                    <p
                                      className={cn(
                                        "font-medium text-gray-900",
                                        isCancelled && "line-through"
                                      )}
                                    >
                                      {appointment.patientName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {appointment.employeeName || "Atanmamış"} · {appointment.startTime} - {appointment.endTime}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={cn(
                                      "pointer-events-none",
                                      getTreatmentLabel(appointment.treatmentType) &&
                                        "bg-gray-100 text-gray-700"
                                    )}
                                  >
                                    {getTreatmentLabel(appointment.treatmentType)}
                                  </Badge>
                                  {statusInfo && (
                                    <Badge className={cn("pointer-events-none", statusInfo.color)}>
                                      {statusInfo.label}
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="flex w-full items-center justify-center rounded-lg border border-dashed border-gray-200 py-2 text-sm text-gray-400">
                            Boş
                          </div>
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
          <div ref={weeklyScrollRef} className="max-h-[600px] overflow-y-auto rounded-2xl border border-gray-100 bg-white">
            {loading ? (
              <div className="p-6">
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] table-fixed">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="w-20 border-r border-gray-50 px-2 py-3 text-left text-xs font-medium text-gray-500">Saat</th>
                      {Array.from({ length: 7 }, (_, i) => {
                        const monday = getMonday(selectedDate);
                        const d = new Date(monday);
                        d.setDate(monday.getDate() + i);
                        const dateStr = formatDateISO(d);
                        const isTodayCol = dateStr === formatDateISO(new Date());
                        return (
                          <th
                            key={i}
                            className={cn(
                              "px-1 py-3 text-center text-xs font-medium",
                              isTodayCol ? "bg-blue-50 text-blue-700" : "text-gray-500"
                            )}
                          >
                            <div>{DAY_NAMES[d.getDay()]}</div>
                            <div className="text-sm font-semibold">{d.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_TIME_SLOTS.map((time) => (
                      <tr key={time} data-time={time} className="border-b border-gray-50">
                        <td className="border-r border-gray-50 px-2 py-1 text-xs text-gray-400">{time}</td>
                        {Array.from({ length: 7 }, (_, i) => {
                          const monday = getMonday(selectedDate);
                          const d = new Date(monday);
                          d.setDate(monday.getDate() + i);
                          const dateStr = formatDateISO(d);
                          const dayAppts = weekAppointments[dateStr] || [];
                          const slotAppts = dayAppts.filter((a) => a.startTime === time);
                          const isTodayCol = dateStr === formatDateISO(new Date());

                          return (
                            <td key={i} className={cn("px-1 py-1 align-top", isTodayCol && "bg-blue-50/30")}>
                              <div className="flex flex-col gap-0.5">
                                {slotAppts.map((appt) => {
                                  const statusInfo = getStatusInfo(appt.status);
                                  return (
                                    <button
                                      key={appt.id}
                                      onClick={() => { setSelectedAppointment(appt); setDialogOpen(true); }}
                                      className={cn(
                                        "w-full rounded-lg border border-gray-100 px-1.5 py-1 text-left text-xs transition-colors hover:border-blue-200",
                                        appt.status === "CANCELLED" && "opacity-50"
                                      )}
                                    >
                                      <div className="flex items-center gap-1 font-medium truncate">
                                        <span
                                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                                          style={{ backgroundColor: appt.employeeColor || "#9ca3af" }}
                                          title={appt.employeeName || "Atanmamış"}
                                        />
                                        <span className="truncate">{appt.patientName || "?"}</span>
                                      </div>
                                      <div className="truncate text-gray-500">
                                        {getTreatmentLabel(appt.treatmentType)}
                                      </div>
                                      {statusInfo && (
                                        <div className={cn("mt-0.5 inline-block rounded px-1 py-0 text-[10px] font-semibold", statusInfo.color)}>
                                          {statusInfo.label}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Empty state (only for daily with no appointments) */}
      {viewMode === "daily" && !loading && appointments.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16"
        >
          <Calendar className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Bu tarihte randevu bulunmuyor</p>
          <button
            onClick={openCreateDialog}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Randevu oluştur
            <Plus className="h-3 w-3" />
          </button>
        </motion.div>
      )}

      {/* Create Appointment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Yeni Randevu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {createError && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{createError}</div>
            )}

            {/* Müşteri */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Müşteri *</label>
              <select
                value={newAppt.patientId}
                onChange={(e) => setNewAppt({ ...newAppt, patientId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Müşteri seçin...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Çalışan */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Çalışan</label>
              <select
                value={newAppt.employeeId}
                onChange={(e) => setNewAppt({ ...newAppt, employeeId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Çalışan seçin (opsiyonel)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              {newAppt.employeeId && employees.find((e) => e.id === newAppt.employeeId) && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: employees.find((e) => e.id === newAppt.employeeId)!.color }}
                  />
                  {employees.find((e) => e.id === newAppt.employeeId)!.name}
                </div>
              )}
            </div>

            {/* Tarih */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tarih *</label>
              <input
                type="date"
                value={newAppt.date}
                onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Saat */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Saat *</label>
              <select
                value={newAppt.startTime}
                onChange={(e) => setNewAppt({ ...newAppt, startTime: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Saat seçin...</option>
                {ALL_TIME_SLOTS.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            {/* İşlem Türü */}
            <div className="relative space-y-1.5">
              <label className="text-sm font-medium text-gray-700">İşlem Türü *</label>
              <input
                ref={treatmentInputRef}
                value={newAppt.treatmentType}
                onChange={(e) => setNewAppt({ ...newAppt, treatmentType: e.target.value })}
                onFocus={() => { if (treatmentSuggestions.length > 0) setShowSuggestions(true); }}
                placeholder="İşlem türünü yazın..."
                autoComplete="off"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <AnimatePresence>
                {showSuggestions && treatmentSuggestions.length > 0 && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
                  >
                    {treatmentSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setNewAppt({ ...newAppt, treatmentType: s });
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notlar */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Notlar</label>
              <textarea
                value={newAppt.notes}
                onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                placeholder="Randevu ile ilgili notlar..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <DialogFooter>
            <div className="flex w-full gap-2">
              <button
                onClick={handleCreateAppointment}
                disabled={creating}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Kaydediliyor..." : "Randevu Oluştur"}
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
        <DialogContent className="rounded-2xl">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">Randevu Detayı</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Müşteri</span>
                  <Link
                    href={`/patients/${selectedAppointment.patientId}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {selectedAppointment.patientName}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Tarih</span>
                  <span className="font-medium">{selectedAppointment.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Saat</span>
                  <span className="font-medium">
                    {selectedAppointment.startTime} - {selectedAppointment.endTime}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">İşlem</span>
                  <Badge className="bg-gray-100 text-gray-700">
                    {getTreatmentLabel(selectedAppointment.treatmentType)}
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
                  <div>
                    <span className="text-sm text-gray-500">Notlar</span>
                    <p className="mt-1 text-sm text-gray-700">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              {selectedAppointment.status === "SCHEDULED" && (
                <DialogFooter>
                  <div className="flex w-full gap-2">
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
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200 px-3 py-2.5 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50"
                    >
                      <AlertCircle className="h-4 w-4" /> Gelmedi
                    </button>
                  </div>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
