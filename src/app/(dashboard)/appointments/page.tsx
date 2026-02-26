"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
      // silently handle
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
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "daily") {
      fetchDayAppointments(selectedDate);
    } else {
      fetchWeekAppointments(selectedDate);
    }
  }, [selectedDate, viewMode, fetchDayAppointments, fetchWeekAppointments]);

  function goToday() {
    setSelectedDate(new Date());
  }

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
        if (viewMode === "daily") {
          await fetchDayAppointments(selectedDate);
        } else {
          await fetchWeekAppointments(selectedDate);
        }
        setDialogOpen(false);
        setSelectedAppointment(null);
      }
    } catch {
      // silently handle
    } finally {
      setUpdating(false);
    }
  }

  const isToday = formatDateISO(selectedDate) === formatDateISO(new Date());
  const nowTime = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Bugün
          </Button>
          <Button variant="ghost" size="sm" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900">
            {formatDateTR(selectedDate)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={formatDateISO(selectedDate)}
            onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <Link href="/appointments/new">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Yeni Randevu
            </Button>
          </Link>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="daily">Günlük</TabsTrigger>
          <TabsTrigger value="weekly">Haftalık</TabsTrigger>
        </TabsList>

        {/* Daily View */}
        <TabsContent value="daily">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {TIME_SLOTS.map((time) => {
                    const appointment = getAppointmentForSlot(time);
                    const statusInfo = appointment
                      ? getStatusInfo(appointment.status)
                      : null;
                    const isCancelled = appointment?.status === "CANCELLED";
                    const isCurrentSlot = isToday && time === nowTime.slice(0, 5);

                    return (
                      <div
                        key={time}
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
                        <div className="flex flex-1 items-center px-3 py-2">
                          {appointment ? (
                            <button
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
                                <div>
                                  <p
                                    className={cn(
                                      "font-medium text-gray-900",
                                      isCancelled && "line-through"
                                    )}
                                  >
                                    {appointment.patientName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {appointment.startTime} - {appointment.endTime}
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Weekly View */}
        <TabsContent value="weekly">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[800px] table-fixed">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="w-20 border-r border-gray-100 px-2 py-3 text-left text-xs font-medium text-gray-500">
                        Saat
                      </th>
                      {Array.from({ length: 7 }, (_, i) => {
                        const monday = getMonday(selectedDate);
                        const d = new Date(monday);
                        d.setDate(monday.getDate() + i);
                        const dateStr = formatDateISO(d);
                        const isTodayCol =
                          dateStr === formatDateISO(new Date());
                        return (
                          <th
                            key={i}
                            className={cn(
                              "px-1 py-3 text-center text-xs font-medium",
                              isTodayCol
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-500"
                            )}
                          >
                            <div>{DAY_NAMES[d.getDay()]}</div>
                            <div className="text-sm font-semibold">
                              {d.getDate()}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((time) => (
                      <tr key={time} className="border-b border-gray-50">
                        <td className="border-r border-gray-100 px-2 py-1 text-xs text-gray-500">
                          {time}
                        </td>
                        {Array.from({ length: 7 }, (_, i) => {
                          const monday = getMonday(selectedDate);
                          const d = new Date(monday);
                          d.setDate(monday.getDate() + i);
                          const dateStr = formatDateISO(d);
                          const dayAppts = weekAppointments[dateStr] || [];
                          const appt = dayAppts.find(
                            (a) => a.startTime === time
                          );
                          const isTodayCol =
                            dateStr === formatDateISO(new Date());
                          const statusInfo = appt
                            ? getStatusInfo(appt.status)
                            : null;

                          return (
                            <td
                              key={i}
                              className={cn(
                                "px-1 py-1",
                                isTodayCol && "bg-blue-50/30"
                              )}
                            >
                              {appt && (
                                <button
                                  onClick={() => {
                                    setSelectedAppointment(appt);
                                    setDialogOpen(true);
                                  }}
                                  className={cn(
                                    "w-full rounded border px-1 py-1 text-left text-xs transition-colors hover:bg-gray-50",
                                    appt.status === "CANCELLED" && "opacity-60"
                                  )}
                                >
                                  <div className="font-medium truncate">
                                    {(appt.patientName || "?")
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </div>
                                  <div className="truncate text-gray-500">
                                    {getTreatmentLabel(appt.treatmentType)}
                                  </div>
                                  {statusInfo && (
                                    <div
                                      className={cn(
                                        "mt-0.5 inline-block rounded-full px-1 py-0 text-[10px]",
                                        statusInfo.color
                                      )}
                                    >
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Appointment Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle>Randevu Detayı</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Hasta</span>
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
                  <Badge className={getStatusInfo(selectedAppointment.status).color}>
                    {getStatusInfo(selectedAppointment.status).label}
                  </Badge>
                </div>
                {selectedAppointment.notes && (
                  <div>
                    <span className="text-sm text-gray-500">Notlar</span>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>
              {selectedAppointment.status === "SCHEDULED" && (
                <DialogFooter>
                  <div className="flex w-full gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={updating}
                      onClick={() =>
                        updateAppointmentStatus(
                          selectedAppointment.id,
                          "COMPLETED"
                        )
                      }
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Tamamlandı
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      disabled={updating}
                      onClick={() =>
                        updateAppointmentStatus(
                          selectedAppointment.id,
                          "CANCELLED"
                        )
                      }
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      İptal Et
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                      disabled={updating}
                      onClick={() =>
                        updateAppointmentStatus(
                          selectedAppointment.id,
                          "NO_SHOW"
                        )
                      }
                    >
                      <AlertCircle className="mr-1 h-4 w-4" />
                      Gelmedi
                    </Button>
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
