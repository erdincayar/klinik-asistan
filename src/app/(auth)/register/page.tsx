"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";

const registerFormSchema = z
  .object({
    name: z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
    email: z.string().email("Geçerli bir email adresi girin"),
    password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
    confirmPassword: z.string().min(6, "Şifre tekrarı gerekli"),
    clinicName: z.string().min(2, "İşletme adı en az 2 karakter olmalı"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

type RegisterFormInput = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
  });

  async function onSubmit(data: RegisterFormInput) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          clinicName: data.clinicName,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Bir hata oluştu");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Kayıt Ol
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          inPobi hesabınızı oluşturun
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}

        {/* Name */}
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
            autoComplete="name"
            placeholder="Ahmet Yılmaz"
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
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
            autoComplete="email"
            placeholder="ornek@email.com"
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Clinic Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="clinicName"
            className="text-sm font-medium text-gray-700"
          >
            İşletme Adı
          </label>
          <input
            id="clinicName"
            type="text"
            placeholder="İşletme adınız"
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            {...register("clinicName")}
          />
          {errors.clinicName && (
            <p className="text-xs text-red-500">{errors.clinicName.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-gray-700"
          >
            Şifre
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-gray-700"
          >
            Şifre Tekrar
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
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
              Kayıt yapılıyor...
            </>
          ) : (
            <>
              Kayıt Ol
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-center text-xs leading-relaxed text-gray-400">
          Kayıt olarak{" "}
          <Link href="#" className="text-blue-600 hover:underline">
            Kullanım Koşulları
          </Link>
          {" "}ve{" "}
          <Link href="#" className="text-blue-600 hover:underline">
            Gizlilik Politikası
          </Link>
          &apos;nı kabul etmiş olursunuz.
        </p>
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
