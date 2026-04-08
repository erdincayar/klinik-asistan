"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Clock, CreditCard, ArrowRight, LogOut, Sparkles } from "lucide-react";

export default function ExpiredPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // If admin/superadmin or active subscription, redirect back to dashboard
  useEffect(() => {
    if (!session?.user) return;
    const role = (session.user as any)?.role;
    if (role === "ADMIN" || role === "SUPERADMIN") {
      router.replace("/dashboard");
      return;
    }
    const subStatus = (session.user as any)?.subStatus;
    if (subStatus === "active") {
      router.replace("/dashboard");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 px-8 py-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Deneme Süreniz Doldu</h1>
            <p className="mt-2 text-white/80 text-sm">
              Poby.ai deneme süreniz sona erdi. Platformu kullanmaya devam etmek için abone olun.
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-6">
            {/* Pricing */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Aylık abonelik</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gray-900">499</span>
                <span className="text-lg text-gray-500">₺/ay</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">KDV dahil · İstediğiniz zaman iptal edin</p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Aboneliğe dahil:</p>
              {[
                "Sınırsız müşteri kaydı",
                "Randevu yönetimi",
                "Gelir-gider ve KDV takibi",
                "Stok/envanter yönetimi",
                "WhatsApp entegrasyonu",
                "AI asistan",
                "Raporlar ve analizler",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-sm text-gray-600">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href="/billing"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-blue-700 transition-all"
            >
              <CreditCard className="h-4 w-4" />
              Abone Ol
              <ArrowRight className="h-4 w-4" />
            </a>

            {/* Contact */}
            <p className="text-center text-xs text-gray-400">
              Sorularınız mı var?{" "}
              <a href="mailto:destek@poby.ai" className="text-indigo-600 hover:underline">destek@poby.ai</a>
            </p>

            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Poby.ai — İşletmenizi AI ile yönetin
        </p>
      </div>
    </div>
  );
}
