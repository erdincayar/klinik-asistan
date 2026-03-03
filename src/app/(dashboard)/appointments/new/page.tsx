"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, X, Check } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectOption } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

interface Patient {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  color: string;
}

// Generate all time slots from 00:00 to 23:30 in 30-minute intervals
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const ALL_TIME_SLOTS = generateTimeSlots();

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get("patientId") || "");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [selectedTime, setSelectedTime] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [notes, setNotes] = useState("");

  // New customer inline form
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Treatment type autocomplete
  const [treatmentSuggestions, setTreatmentSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const treatmentInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || data || []);
      }
    } catch {
      // silently handle
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : { employees: [] }))
      .then((data) => setEmployees(data.employees || data || []))
      .catch(() => {});
  }, [fetchPatients]);

  // Fetch treatment type suggestions
  useEffect(() => {
    if (treatmentType.length < 2) {
      setTreatmentSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/appointments/types?q=${encodeURIComponent(treatmentType)}`);
        if (res.ok) {
          const data = await res.json();
          setTreatmentSuggestions(data.types || []);
          setShowSuggestions(true);
        }
      } catch {
        // silently handle
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [treatmentType]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        treatmentInputRef.current &&
        !treatmentInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate end time (30 min after start)
  function getEndTime(start: string): string {
    const [h, m] = start.split(":").map(Number);
    const totalMinutes = h * 60 + m + 30;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  async function handleNewCustomer() {
    if (!newCustomerName.trim()) return;
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data.id || data.patient?.id;
        await fetchPatients();
        if (newId) setPatientId(newId);
        setShowNewCustomer(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
      } else {
        const data = await res.json();
        setError(data.error || "Müşteri eklenemedi");
      }
    } catch {
      setError("Müşteri eklenirken hata oluştu");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!patientId || !date || !selectedTime || !treatmentType) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          employeeId: employeeId || undefined,
          date,
          startTime: selectedTime,
          endTime: getEndTime(selectedTime),
          treatmentType,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Randevu oluşturulamadı");
      }

      router.push("/appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Randevulara Dön
        </Link>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Yeni Randevu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-50 p-3 text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">Müşteri *</Label>
              <div className="flex gap-2">
                <Select
                  id="patient"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  className="flex-1"
                >
                  <SelectOption value="">Müşteri seçin...</SelectOption>
                  {patients.map((p) => (
                    <SelectOption key={p.id} value={p.id}>
                      {p.name}
                    </SelectOption>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                  className="shrink-0 gap-1"
                >
                  {showNewCustomer ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showNewCustomer ? "Kapat" : "Yeni Müşteri"}
                </Button>
              </div>

              {/* Inline New Customer Form */}
              <AnimatePresence>
                {showNewCustomer && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                      <p className="text-sm font-medium text-blue-700">Yeni Müşteri Ekle</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Ad Soyad *</Label>
                          <Input
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            placeholder="Müşteri adı"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Telefon</Label>
                          <Input
                            value={newCustomerPhone}
                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                            placeholder="05XX XXX XX XX"
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleNewCustomer}
                        disabled={savingCustomer || !newCustomerName.trim()}
                        className="gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {savingCustomer ? "Kaydediliyor..." : "Kaydet ve Seç"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Çalışan</Label>
              <Select
                id="employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <SelectOption value="">Çalışan seçin (opsiyonel)</SelectOption>
                {employees.map((emp) => (
                  <SelectOption key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectOption>
                ))}
              </Select>
              {employeeId && employees.find((e) => e.id === employeeId) && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: employees.find((e) => e.id === employeeId)!.color }}
                  />
                  {employees.find((e) => e.id === employeeId)!.name}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Tarih *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Time Selection - Simple Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="time">Saat *</Label>
              <Select
                id="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              >
                <SelectOption value="">Saat seçin...</SelectOption>
                {ALL_TIME_SLOTS.map((time) => (
                  <SelectOption key={time} value={time}>
                    {time}
                  </SelectOption>
                ))}
              </Select>
            </div>

            {/* Treatment Type - Autocomplete */}
            <div className="relative space-y-2">
              <Label htmlFor="treatmentType">İşlem Türü *</Label>
              <Input
                ref={treatmentInputRef}
                id="treatmentType"
                value={treatmentType}
                onChange={(e) => setTreatmentType(e.target.value)}
                onFocus={() => {
                  if (treatmentSuggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="İşlem türünü yazın..."
                required
                autoComplete="off"
              />
              {loadingSuggestions && (
                <p className="text-xs text-gray-400">Öneriler yükleniyor...</p>
              )}
              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && treatmentSuggestions.length > 0 && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
                  >
                    {treatmentSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setTreatmentType(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Randevu ile ilgili notlar..."
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? "Kaydediliyor..." : "Randevu Oluştur"}
              </Button>
              <Link href="/appointments">
                <Button type="button" variant="outline">
                  İptal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<div className="text-gray-500">Yükleniyor...</div>}>
      <NewAppointmentForm />
    </Suspense>
  );
}
