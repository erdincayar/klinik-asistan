import { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Fiyatlandırma — Aylık ₺99'dan Başlayan Planlar",
  description:
    "Poby.ai'ı aylık ₺99 sabit ücret + kullanım bazlı AI kredisiyle deneyin. Klinik, restoran ve kuaförler için uygun fiyatlı yönetim platformu.",
  alternates: { canonical: "https://poby.ai/fiyatlandirma" },
  openGraph: {
    title: "Fiyatlandırma — Aylık ₺99'dan Başlayan Planlar | Poby.ai",
    description: "Küçük işletmeler için uygun fiyatlı AI destekli yönetim platformu.",
    url: "https://poby.ai/fiyatlandirma",
  },
};

const plans = [
  {
    name: "Starter",
    price: "99",
    features: [
      "AI Asistan (temel)",
      "Randevu yönetimi",
      "Müşteri takibi",
      "Finansal özet",
      "5.000 AI kredisi/ay",
    ],
  },
  {
    name: "Professional",
    price: "249",
    popular: true,
    features: [
      "Tüm Starter özellikleri",
      "WhatsApp entegrasyonu",
      "Poby Asistan (akıllı)",
      "Meta Ads yönetimi",
      "AI İçerik Stüdyosu",
      "20.000 AI kredisi/ay",
    ],
  },
  {
    name: "Business",
    price: "499",
    features: [
      "Tüm Professional özellikleri",
      "Çoklu şube desteği",
      "Özel API erişimi",
      "Öncelikli destek",
      "50.000 AI kredisi/ay",
    ],
  },
];

export default function FiyatlandirmaPage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "Fiyatlandırma", url: "https://poby.ai/fiyatlandirma" },
        ]}
      />

      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Poby<span className="text-indigo-600">.ai</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            İşletmeniz İçin Uygun Plan
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Aylık sabit ücret + kullandığınız kadar AI kredisi. Gizli ücret yok.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                plan.popular
                  ? "border-indigo-600 ring-2 ring-indigo-600 relative"
                  : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                  En Popüler
                </span>
              )}
              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">₺{plan.price}</span>
                <span className="text-sm text-gray-500">/ay</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="h-4 w-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                  plan.popular
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Ücretsiz Deneyin
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
