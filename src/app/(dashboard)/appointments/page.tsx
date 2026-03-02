"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUSES, TREATMENT_CATEGORIES, DAY_NAMES } from "@/lib/types";

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

const TIME_SLOTS: string[] = [];
for (let h = 9; h < 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
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

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("daily");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchDayAppointments = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?date=${formatDateISO(date)}`);
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

  const fetchWeekAppointments = useCallback(async (date: Date) => {
    setLoading(true);
    const monday = getMonday(date);
    const weekData: Record<string, Appointment[]> = {};
    try {
      const promises = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = formatDateISO(d);
        return fetch(`/api/appointments?date=${dateStr}`)
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
    if (viewMode === "daily") fetchDayAppointments(selectedDate);
    else fetchWeekAppointments(selectedDate);
  }, [selectedDate, viewMode, fetchDayAppointments, fetchWeekAppointments]);

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

  function getAppointmentForSlot(time: string): Appointment | undefined {
    return appointments.find((a) => a.startTime === time);
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
        if (viewMode === "daily") await fetchDayAppointments(selectedDate);
        else await fetchWeekAppointments(selectedDate);
        setDialogOpen(false);
        setSelectedAppointment(null);
      }
    } catch {
      /* silently handle */
    } finally {
      setUpdating(false);
    }
  }

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
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            Yeni Randevu
          </Link>
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

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {viewMode === "daily" ? (
          /* ── Daily view ── */
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
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
                {TIME_SLOTS.map((time) => {
                  const appointment = getAppointmentForSlot(time);
                  const statusInfo = appointment ? getStatusInfo(appointment.status) : null;
                  const isCancelled = appointment?.status === "CANCELLED";
                  const isCurrentSlot = isToday && time === nowTime.slice(0, 5);

                  return (
                    <div
                      key={time}
                      className={cn(
                        "flex min-h-[56px] items-stretch",
                        isCurrentSlot && "bg-blue-50/40"
                      )}
                    >
                      {/* Time */}
                      <div className="flex w-20 shrink-0 items-center justify-center border-r border-gray-100 text-sm font-medium text-gray-400">
                        {time}
                      </div>

                      {/* Slot */}
                      <div className="flex flex-1 items-center px-3 py-2">
                        {appointment ? (
                          <button
                            onClick={() => { setSelectedAppointment(appointment); setDialogOpen(true); }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-left transition-all hover:border-blue-200 hover:shadow-sm",
                              isCancelled && "opacity-50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                                {(appointment.patientName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <p className={cn("text-sm font-medium text-gray-900", isCancelled && "line-through")}>{appointment.patientName}</p>
                                <p className="text-[11px] text-gray-400">{appointment.startTime} - {appointment.endTime}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="hidden rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 sm:inline-flex">
                                {getTreatmentLabel(appointment.treatmentType)}
                              </span>
                              {statusInfo && (
                                <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-semibold", statusInfo.color)}>
                                  {statusInfo.label}
                                </span>
                              )}
                            </div>
                          </button>
                        ) : (
                          <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-gray-200 py-2.5 text-xs text-gray-300">
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
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
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
                    {TIME_SLOTS.map((time) => (
                      <tr key={time} className="border-b border-gray-50">
                        <td className="border-r border-gray-50 px-2 py-1 text-xs text-gray-400">{time}</td>
                        {Array.from({ length: 7 }, (_, i) => {
                          const monday = getMonday(selectedDate);
                          const d = new Date(monday);
                          d.setDate(monday.getDate() + i);
                          const dateStr = formatDateISO(d);
                          const dayAppts = weekAppointments[dateStr] || [];
                          const appt = dayAppts.find((a) => a.startTime === time);
                          const isTodayCol = dateStr === formatDateISO(new Date());
                          const statusInfo = appt ? getStatusInfo(appt.status) : null;

                          return (
                            <td key={i} className={cn("px-1 py-1", isTodayCol && "bg-blue-50/30")}>
                              {appt && (
                                <button
                                  onClick={() => { setSelectedAppointment(appt); setDialogOpen(true); }}
                                  className={cn(
                                    "w-full rounded-lg border border-gray-100 px-1.5 py-1 text-left text-xs transition-colors hover:border-blue-200",
                                    appt.status === "CANCELLED" && "opacity-50"
                                  )}
                                >
                                  <div className="truncate font-medium text-gray-900">
                                    {(appt.patientName || "?").split(" ").map((n) => n[0]).join("")}
                                  </div>
                                  <div className="truncate text-gray-400">{getTreatmentLabel(appt.treatmentType)}</div>
                                  {statusInfo && (
                                    <div className={cn("mt-0.5 inline-block rounded px-1 py-0 text-[10px] font-semibold", statusInfo.color)}>
                                      {statusInfo.label}
                                    </div>
                                  )}
                                </button>
                              )}
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
          <Link
            href="/appointments/new"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Randevu oluştur
            <Plus className="h-3 w-3" />
          </Link>
        </motion.div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">Randevu Detayı</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {[
                  { label: "Hasta", value: selectedAppointment.patientName, link: `/patients/${selectedAppointment.patientId}` },
                  { label: "Tarih", value: selectedAppointment.date },
                  { label: "Saat", value: `${selectedAppointment.startTime} - ${selectedAppointment.endTime}` },
                  { label: "İşlem", value: getTreatmentLabel(selectedAppointment.treatmentType) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{row.label}</span>
                    {row.link ? (
                      <Link href={row.link} className="text-sm font-medium text-blue-600 hover:underline">{row.value}</Link>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{row.value}</span>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Durum</span>
                  <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-semibold", getStatusInfo(selectedAppointment.status).color)}>
                    {getStatusInfo(selectedAppointment.status).label}
                  </span>
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
