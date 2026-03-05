"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle } from "lucide-react";

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  clinicId?: string | null;
}

const SECTORS = [
  { value: "klinik", label: "Klinik" },
  { value: "restoran", label: "Restoran" },
  { value: "kuafor", label: "Kuaför" },
  { value: "guzellik", label: "Güzellik Merkezi" },
  { value: "eczane", label: "Eczane" },
  { value: "diger", label: "Diğer" },
];

export default function RegisterCompletePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [sector, setSector] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user?.email) {
          router.push("/register");
          return;
        }
        if (data.user.clinicId) {
          router.push("/dashboard");
          return;
        }
        setUser(data.user);
        setSessionLoading(false);
      })
      .catch(() => {
        router.push("/register");
      });
  }, [router]);

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicName.trim() || !sector) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicName, sector, phone }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Bir hata oluştu");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-600">
            Google hesabı doğrulandı
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Kaydınızı Tamamlayın
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          İşletme bilgilerinizi girerek kayıt işlemini tamamlayın
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}

        {/* Ad Soyad — read-only, prefilled from Google */}
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium text-gray-700"
          >
            Ad Soyad
          </label>
          <input
            id="name"
            type="text"
            value={user?.name || ""}
            readOnly
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* Email — read-only, prefilled from Google */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user?.email || ""}
            readOnly
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* Clinic Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="clinicName"
            className="text-sm font-medium text-gray-700"
          >
            İşletme Adı <span className="text-red-500">*</span>
          </label>
          <input
            id="clinicName"
            type="text"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder="İşletme adınız"
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Sector */}
        <div className="space-y-1.5">
          <label
            htmlFor="sector"
            className="text-sm font-medium text-gray-700"
          >
            Sektör <span className="text-red-500">*</span>
          </label>
          <select
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Sektör seçin</option>
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label
            htmlFor="phone"
            className="text-sm font-medium text-gray-700"
          >
            Telefon
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05XX XXX XX XX"
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              Kayıt Ol
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Zaten hesabınız var mı?{" "}
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          Giriş Yap
        </Link>
      </p>
    </>
  );
}
