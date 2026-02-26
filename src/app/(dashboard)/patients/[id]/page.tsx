"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Phone, Mail, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TREATMENT_CATEGORIES } from "@/lib/types";

interface Treatment {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  treatments: Treatment[];
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${params.id}`);
        if (!res.ok) throw new Error("Hasta bulunamadı");
        const data = await res.json();
        setPatient(data);
        setEditForm({
          name: data.name,
          phone: data.phone || "",
          email: data.email || "",
          notes: data.notes || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Hasta güncellenemedi");
      const updated = await res.json();
      setPatient({ ...patient!, ...updated });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  function getCategoryLabel(value: string): string {
    return (
      TREATMENT_CATEGORIES.find((c) => c.value === value)?.label || value
    );
  }

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!patient) return null;

  return (
    <div className="space-y-6">
      {/* Patient Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{patient.name}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {editing ? "İptal" : "Düzenle"}
            </Button>
            <Link href={`/finance/new-income?patientId=${patient.id}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Yeni İşlem Ekle
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notlar</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                {patient.phone || "Telefon girilmemiş"}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                {patient.email || "Email girilmemiş"}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Kayıt: {formatDate(patient.createdAt)}
              </div>
              {patient.notes && (
                <div className="flex items-start gap-2 text-sm text-gray-600 sm:col-span-2">
                  <FileText className="mt-0.5 h-4 w-4" />
                  {patient.notes}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment History */}
      <Card>
        <CardHeader>
          <CardTitle>Tedavi Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.treatments.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz tedavi kaydı yok</p>
          ) : (
            <div className="space-y-4">
              {patient.treatments
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((treatment) => (
                  <div key={treatment.id}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{treatment.name}</span>
                          <Badge variant="secondary">
                            {getCategoryLabel(treatment.category)}
                          </Badge>
                        </div>
                        {treatment.description && (
                          <p className="text-sm text-gray-500">
                            {treatment.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {formatDate(treatment.date)}
                        </p>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(treatment.amount)}
                      </span>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
