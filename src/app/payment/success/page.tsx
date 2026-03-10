"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          Ödemeniz Başarılı
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Ödemeniz başarıyla tamamlandı. Hesabınız güncellendi.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Dashboard&apos;a Dön
        </button>
        <p className="mt-3 text-xs text-gray-400">
          5 saniye içinde otomatik yönlendirileceksiniz...
        </p>
      </div>
    </div>
  );
}
