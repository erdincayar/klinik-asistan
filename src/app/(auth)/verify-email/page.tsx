"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, MailOpen, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];

    if (value.length > 1) {
      // Paste handling
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newCode[i] = digits[i] || "";
      }
      setCode(newCode);
      const lastFilledIndex = Math.min(digits.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();

      if (digits.length === 6) {
        submitCode(newCode.join(""));
      }
      return;
    }

    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (value && newCode.every((d) => d !== "")) {
      submitCode(newCode.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function submitCode(fullCode: string) {
    if (!email) {
      setError("Email adresi bulunamadı");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Doğrulama başarısız");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?verified=1");
      }, 2000);
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || resendCooldown > 0) return;

    setResending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resend: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kod gönderilemedi");
        return;
      }

      setResendCooldown(60);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setResending(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Email Doğrulandı
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Giriş sayfasına yönlendiriliyorsunuz...
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
          <MailOpen className="h-7 w-7 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Email Doğrulama
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{email}</span> adresine
          gönderilen 6 haneli kodu girin.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600"
        >
          {error}
        </motion.div>
      )}

      {/* Code inputs */}
      <div className="mb-8 flex justify-center gap-3">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={loading}
            className="h-14 w-12 rounded-xl border-2 border-gray-200 bg-white text-center text-xl font-bold text-gray-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          />
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Doğrulanıyor...
        </div>
      )}

      {/* Resend */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Kod gelmedi mi?{" "}
          {resendCooldown > 0 ? (
            <span className="font-medium text-gray-400">
              {resendCooldown}s bekleyin
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {resending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Tekrar Gönder
            </button>
          )}
        </p>
      </div>
    </>
  );
}
