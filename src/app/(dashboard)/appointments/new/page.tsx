"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { TREATMENT_CATEGORIES } from "@/lib/types";

interface Patient {
  id: string;
  name: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [patientId, setPatientId] = useState(searchParams.get("patientId") || "");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [treatmentType, setTreatmentType] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch("/api/patients");
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients || data || []);
        }
      } catch {
        // silently handle
      }
    }
    fetchPatients();
  }, []);

  useEffect(() => {
    if (!date) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }

    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await fetch(`/api/appointments/available-slots?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.slots || data || []);
        }
      } catch {
        // silently handle
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!patientId || !date || !selectedSlot || !treatmentType) {
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
          date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
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

      <Card>
        <CardHeader>
          <CardTitle>Yeni Randevu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">Hasta *</Label>
              <Select
                id="patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <SelectOption value="">Hasta seçin...</SelectOption>
                {patients.map((p) => (
                  <SelectOption key={p.id} value={p.id}>
                    {p.name}
                  </SelectOption>
                ))}
              </Select>
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

            {/* Available Slots */}
            <div className="space-y-2">
              <Label>Müsait Saatler *</Label>
              {!date ? (
                <p className="text-sm text-gray-400">
                  Önce tarih seçin
                </p>
              ) : loadingSlots ? (
                <p className="text-sm text-gray-500">Saatler yükleniyor...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Bu tarihte müsait saat bulunamadı
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        slot.available
                          ? selectedSlot?.startTime === slot.startTime
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                          : "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                      )}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Treatment Type */}
            <div className="space-y-2">
              <Label htmlFor="treatmentType">İşlem Türü *</Label>
              <Select
                id="treatmentType"
                value={treatmentType}
                onChange={(e) => setTreatmentType(e.target.value)}
                required
              >
                <SelectOption value="">İşlem türü seçin...</SelectOption>
                {TREATMENT_CATEGORIES.map((t) => (
                  <SelectOption key={t.value} value={t.value}>
                    {t.label}
                  </SelectOption>
                ))}
              </Select>
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
