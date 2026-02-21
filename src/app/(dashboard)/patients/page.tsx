"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  _count?: { treatments: number };
  createdAt: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true);
        const params = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`/api/patients${params}`);
        if (!res.ok) throw new Error("Hastalar alinamadi");
        const data = await res.json();
        setPatients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata olustu");
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Search and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Hasta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href="/patients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Hasta
          </Button>
        </Link>
      </div>

      {/* Patient list */}
      <Card>
        <CardHeader>
          <CardTitle>Hasta Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Yukleniyor...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : patients.length === 0 ? (
            <p className="text-gray-500">Henuz hasta kaydi yok</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Isim</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Islem Sayisi</TableHead>
                  <TableHead className="hidden md:table-cell">Kayit Tarihi</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.phone || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {patient.email || "-"}
                    </TableCell>
                    <TableCell>{patient._count?.treatments ?? 0}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(patient.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/patients/${patient.id}`}>
                        <Button variant="outline" size="sm">
                          Detay
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
