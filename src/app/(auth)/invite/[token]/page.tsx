"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";
import { z } from "zod";
import { strongPasswordSchema } from "@/lib/validations";

const PASSWORD_RULES = [
  { label: "En az 8 karakter", test: (v: string) => v.length >= 8 },
  { label: "Büyük harf (A-Z)", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Küçük harf (a-z)", test: (v: string) => /[a-z]/.test(v) },
  { label: "Rakam (0-9)", test: (v: string) => /[0-9]/.test(v) },
  { label: "Özel karakter (!@#$...)", test: (v: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) },
];

const inviteFormSchema = z
  .object({
    name: z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
    email: z.string().email("Geçerli bir email adresi girin"),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Şifre tekrarı gerekli"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

type InviteFormInput = z.infer<typeof inviteFormSchema>;

export default function InviteRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteFormInput>({
    resolver: zodResolver(inviteFormSchema),
  });

  const passwordValue = watch("password", "");

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (res.ok) {
          const data = await res.json();
          setTokenValid(true);
          setClinicName(data.clinicName || "");
          setEmployeeName(data.employeeName || "");
          setEmployeeEmail(data.employeeEmail || "");
          if (data.employeeName) setValue("name", data.employeeName);
          if (data.employeeEmail) setValue("email", data.employeeEmail);
        } else {
          const data = await res.json();
          setTokenError(data.error || "Geçersiz davet bağlantısı");
        }
      } catch {
        setTokenError("Bir hata oluştu");
      } finally {
        setValidating(false);
      }
    }
    validateToken();
  }, [token, setValue]);

  async function onSubmit(data: InviteFormInput) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/invite/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Bir hata oluştu");
        return;
      }

      // Auto-login
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/dashboard");
      } else {
        // Registration succeeded but login failed - redirect to login
        router.push("/login");
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#BE3A21]" />
        <p className="mt-4 text-sm text-gray-500">Davet doğrulanıyor...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Geçersiz Davet</h2>
        <p className="text-sm text-gray-500 mb-6">{tokenError}</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-[4px] bg-[#2B2B2B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3A3A3A] transition-colors"
        >
          Giriş Sayfasına Git
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {clinicName} ekibine katılın
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Hesabınızı oluşturarak ekibe katılın
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[4px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </motion.div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Ad Soyad
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Ahmet Yılmaz"
            className="block w-full rounded-[4px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-[#BE3A21] focus:outline-none focus:ring-2 focus:ring-[#BE3A21]/20"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ornek@email.com"
            className="block w-full rounded-[4px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-[#BE3A21] focus:outline-none focus:ring-2 focus:ring-[#BE3A21]/20"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Şifre
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className="block w-full rounded-[4px] border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-[#BE3A21] focus:outline-none focus:ring-2 focus:ring-[#BE3A21]/20"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
          {passwordValue && (
            <div className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(passwordValue);
                return (
                  <div key={rule.label} className="flex items-center gap-1.5">
                    {passed ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <X className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs ${passed ? "text-emerald-600" : "text-gray-400"}`}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
            Şifre Tekrar
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className="block w-full rounded-[4px] border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-[#BE3A21] focus:outline-none focus:ring-2 focus:ring-[#BE3A21]/20"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#2B2B2B] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#BE3A21]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Hesap oluşturuluyor...
            </>
          ) : (
            <>
              Katıl
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Zaten hesabınız var mı?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#BE3A21] hover:text-[#9B2D18]"
        >
          Giriş Yap
        </Link>
      </p>
    </>
  );
}
