"use client";

import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function PaymentFailedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          Ödeme Başarısız
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyin.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => router.push("/settings")}
            className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Tekrar Dene
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    </div>
  );
}
