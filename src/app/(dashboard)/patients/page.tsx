"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search, Users, ArrowRight, Phone, Upload, Download, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
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

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  _count?: { treatments: number };
  createdAt: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.05, ease: "easeOut" as const },
  }),
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-100", className)} />;
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
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
        if (!res.ok) throw new Error("Müşteriler alınamadı");
        const data = await res.json();
        setPatients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Müşteri ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-2">
          <Link href="/customers/import">
            <Button variant="outline" size="sm" className="gap-1">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">İçe Aktar</span>
            </Button>
          </Link>
          <a href="/api/customers/export" download>
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Dışa Aktar</span>
            </Button>
          </a>
          <Link href="/patients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Müşteri
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Müşteri list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <CardTitle>Müşteri Listesi</CardTitle>
                {!loading && patients.length > 0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {patients.length}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <div className="flex min-h-[300px] items-center justify-center p-6">
                <div className="text-center">
                  <p className="text-sm text-red-500">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                  >
                    Tekrar dene
                  </button>
                </div>
              </div>
            ) : patients.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center p-6">
                <div className="text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">
                    {search ? "Arama sonucu bulunamadı" : "Henüz müşteri kaydı yok"}
                  </p>
                  {!search && (
                    <Link
                      href="/patients/new"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      İlk müşterinizi ekleyin
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="space-y-2 md:hidden">
                  {patients.map((patient, i) => (
                    <motion.div key={patient.id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                      <Link
                        href={`/patients/${patient.id}`}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 active:scale-[0.99]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                          {patient.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{patient.name}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {patient.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </span>
                            )}
                            <span>{patient._count?.treatments ?? 0} işlem</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>İşlem Sayısı</TableHead>
                        <TableHead>Kayıt Tarihi</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.map((patient, i) => (
                        <motion.tr key={patient.id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                                {patient.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {patient.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {patient.phone ? (
                              <span className="text-sm text-gray-600">{patient.phone}</span>
                            ) : (
                              <span className="text-sm text-gray-300">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.email ? (
                              <span className="truncate text-sm text-gray-600">{patient.email}</span>
                            ) : (
                              <span className="text-sm text-gray-300">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell>{patient._count?.treatments ?? 0}</TableCell>
                          <TableCell>{formatDate(patient.createdAt)}</TableCell>
                          <TableCell>
                            <Link href={`/patients/${patient.id}`}>
                              <Button variant="outline" size="sm">
                                Detay
                              </Button>
                            </Link>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
