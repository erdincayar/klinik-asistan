"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search, Users, ArrowRight, Phone } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

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
        if (!res.ok) throw new Error("Hastalar alınamadı");
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
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Hasta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <Link
          href="/patients/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20"
        >
          <Plus className="h-4 w-4" />
          Yeni Hasta
        </Link>
      </motion.div>

      {/* Patient table card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      >
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Hasta Listesi</h2>
            {!loading && patients.length > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {patients.length}
              </span>
            )}
          </div>
        </div>

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
                {search ? "Arama sonucu bulunamadı" : "Henüz hasta kaydı yok"}
              </p>
              {!search && (
                <Link
                  href="/patients/new"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  İlk hastanızı ekleyin
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden border-b border-gray-100 bg-gray-50/50 px-6 py-3 sm:grid sm:grid-cols-12 sm:gap-4">
              <span className="col-span-4 text-xs font-medium uppercase tracking-wider text-gray-500">
                Hasta
              </span>
              <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Telefon
              </span>
              <span className="col-span-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </span>
              <span className="col-span-1 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                İşlem
              </span>
              <span className="col-span-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Kayıt Tarihi
              </span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-50">
              {patients.map((patient, i) => (
                <motion.div key={patient.id} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
                  <Link
                    href={`/patients/${patient.id}`}
                    className="group flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-gray-50/70 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
                  >
                    {/* Name + avatar */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {patient.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {patient.name}
                      </span>
                    </div>

                    {/* Phone */}
                    <div className="col-span-2 flex items-center gap-1.5">
                      {patient.phone ? (
                        <>
                          <Phone className="h-3 w-3 text-gray-400 sm:hidden" />
                          <span className="text-sm text-gray-600">{patient.phone}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </div>

                    {/* Email */}
                    <div className="col-span-3 hidden items-center gap-1.5 sm:flex">
                      {patient.email ? (
                        <span className="truncate text-sm text-gray-600">{patient.email}</span>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </div>

                    {/* Treatment count */}
                    <div className="col-span-1 text-center">
                      <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-gray-100 px-2 text-xs font-semibold text-gray-700">
                        {patient._count?.treatments ?? 0}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm text-gray-500">
                        {formatDate(patient.createdAt)}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
