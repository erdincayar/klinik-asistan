import { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import {
  MODULE_PRICES,
  STORAGE_PLANS,
  DISCOUNT_TIERS,
  LOCKED_MODULES,
} from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Modüler Fiyatlandırma — Sadece İhtiyacınız Olanı Seçin | Poby.ai",
  description:
    "Poby.ai modüler fiyatlandırma ile sadece kullandığınız modüller için ödeme yapın. ₺99/ay başlangıç + istediğiniz modülleri ekleyin.",
  alternates: { canonical: "https://poby.ai/fiyatlandirma" },
  openGraph: {
    title: "Modüler Fiyatlandırma | Poby.ai",
    description:
      "İşletmeniz için sadece ihtiyacınız olan modülleri seçin. 7 gün ücretsiz deneyin.",
    url: "https://poby.ai/fiyatlandirma",
  },
};

/* ── Icon map (simple SVG placeholders per module) ── */
const MODULE_ICONS: Record<string, React.ReactNode> = {
  LayoutDashboard: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  Calendar: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  Users: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  DollarSign: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  UserCog: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Package: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  BellRing: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  BarChart3: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  MessageCircle: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  Megaphone: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  ),
  Bot: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
};

/* ── Feature bullets per module ── */
const MODULE_FEATURES: Record<string, string[]> = {
  base: [
    "Yonetim paneli ve dashboard",
    "Temel isletme ayarlari",
    "1 kullanici dahil",
  ],
  appointments: [
    "Takvim gorunumu ve yonetimi",
    "Otomatik hatirlatma bildirimleri",
    "Online randevu alma",
    "Musteri gecmisi takibi",
  ],
  customers: [
    "Musteri veritabani (CRM)",
    "Tedavi ve islem gecmisi",
    "Etiketleme ve segmentasyon",
    "Musteri notlari ve dosyalar",
  ],
  finance: [
    "Gelir-gider takibi",
    "Fatura ve tahsilat yonetimi",
    "Mali raporlar ve grafikler",
    "KDV hesaplama",
  ],
  employees: [
    "Calisan profilleri",
    "Mesai ve izin takibi",
    "Performans degerlendirmesi",
  ],
  inventory: [
    "Urun ve stok yonetimi",
    "Stok hareketi kayitlari",
    "Dusuk stok uyarilari",
  ],
  alarms: [
    "Otomatik hatirlatmalar",
    "Ozel alarm kurallari",
    "E-posta ve bildirim kanallari",
    "Zamanlayici yonetimi",
  ],
  reports: [
    "Detayli analiz panelleri",
    "Ozel rapor olusturma",
    "Excel ve PDF disa aktarim",
    "Donemlere gore karsilastirma",
  ],
  messaging: [
    "Telegram entegrasyonu",
    "Otomatik bildirimler",
    "Grup mesajlari",
  ],
  marketing: [
    "Meta Ads entegrasyonu",
    "Kampanya yonetimi",
    "AI icerik stüdyosu",
    "Performans analitikleri",
  ],
  ai_assistant: [
    "AI destekli musteri asistani",
    "WhatsApp entegrasyonu",
    "Otomatik cevaplama",
    "Bilgi tabani yonetimi",
  ],
};

function formatPrice(priceInKurus: number): string {
  return `${Math.round(priceInKurus / 100)}`;
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-indigo-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export default function FiyatlandirmaPage() {
  // Separate active modules from locked ones
  const activeModules = Object.entries(MODULE_PRICES).filter(
    ([slug]) => slug !== "base" && !LOCKED_MODULES.includes(slug)
  );

  const lockedModuleData: Array<{ slug: string; name: string; icon: string }> = [
    { slug: "marketing", name: "Pazarlama & Reklam", icon: "Megaphone" },
    { slug: "ai_assistant", name: "AI Asistan", icon: "Bot" },
  ];

  const storageEntries = Object.entries(STORAGE_PLANS);

  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "Fiyatlandirma", url: "https://poby.ai/fiyatlandirma" },
        ]}
      />

      {/* ── Nav ── */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Poby<span className="text-indigo-600">.ai</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Giris Yap
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6">
        {/* ── Hero ── */}
        <section className="py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Modüler Fiyatlandirma
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Sadece Ihtiyaciniz Olani Secin
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
            Baslangic platformu + istediginiz modülleri ekleyin. Gizli ücret
            yok, istediginiz zaman iptal edin.
          </p>
        </section>

        {/* ── Baslangic Platformu Callout ── */}
        <section className="mb-16">
          <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-600 bg-gradient-to-br from-indigo-50 to-white p-8 sm:p-10">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-indigo-100/60" />
            <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  {MODULE_ICONS.LayoutDashboard}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Baslangic Platformu
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Her abonelige dahil — temel isletme yonetim altyapisi
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-indigo-600">
                    ₺{formatPrice(MODULE_PRICES.base.price)}
                  </span>
                  <span className="text-sm text-gray-500">/ay + KDV</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  1 kullanici dahil &middot; Ek kullanici ₺49/ay + KDV
                </p>
              </div>
            </div>
            <div className="relative mt-6 grid gap-2 sm:grid-cols-3">
              {(MODULE_FEATURES.base ?? []).map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <CheckIcon />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Module Cards Grid ── */}
        <section className="mb-16">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Modüller
          </h2>
          <p className="mb-10 text-center text-sm text-gray-500">
            Isletmenize uygun modülleri secin, sadece kullandiklariniz icin
            odeyin.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeModules.map(([slug, mod]) => (
              <div
                key={slug}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg"
              >
                {/* Icon + Name */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                    {MODULE_ICONS[mod.icon] ?? MODULE_ICONS.LayoutDashboard}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{mod.name}</h3>
                    <p className="text-xs text-gray-500">{mod.desc}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    {mod.price === 0 ? (
                      <span className="text-2xl font-bold text-green-600">
                        Ücretsiz
                      </span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-gray-900">
                          ₺{formatPrice(mod.price)}
                        </span>
                        <span className="text-sm text-gray-500">/ay</span>
                      </>
                    )}
                  </div>
                  {mod.price > 0 && (
                    <p className="mt-0.5 text-xs text-gray-400">+ KDV (%20)</p>
                  )}
                </div>

                {/* Features */}
                <ul className="mt-4 space-y-2">
                  {(MODULE_FEATURES[slug] ?? []).map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Locked Modules (Yakinda) ── */}
        <section className="mb-16">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Cok Yakinda
          </h2>
          <p className="mb-10 text-center text-sm text-gray-500">
            Üzerinde calistigimiz yeni modüller
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lockedModuleData.map((mod) => (
              <div
                key={mod.slug}
                className="relative rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 opacity-75"
              >
                {/* Yakinda badge */}
                <span className="absolute -top-3 right-4 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-700">
                  Yakinda
                </span>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-gray-400">
                    {MODULE_ICONS[mod.icon] ?? MODULE_ICONS.LayoutDashboard}
                  </div>
                  <h3 className="font-semibold text-gray-500">{mod.name}</h3>
                </div>

                <ul className="mt-4 space-y-2">
                  {(MODULE_FEATURES[mod.slug] ?? []).map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-400"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Discount Table ── */}
        <section className="mb-16">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Toplu Modül Indirimi
          </h2>
          <p className="mb-8 text-center text-sm text-gray-500">
            Ne kadar cok modül eklerseniz, o kadar cok tasarruf edersiniz.
          </p>

          <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Modül Sayisi
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                    Indirim Orani
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...DISCOUNT_TIERS].reverse().map((tier) => (
                  <tr key={tier.minModules} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {tier.minModules}+ modül
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                        %{tier.discount} indirim
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Storage Packages ── */}
        <section className="mb-16">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Depolama Paketleri
          </h2>
          <p className="mb-8 text-center text-sm text-gray-500">
            Dosya, fotograf ve belge depolama icin ek alan secenekleri
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {storageEntries.map(([key, plan]) => {
              const isFree = plan.price === 0;
              return (
                <div
                  key={key}
                  className={`rounded-2xl border p-6 text-center transition-shadow hover:shadow-lg ${
                    key === "professional"
                      ? "border-indigo-600 ring-2 ring-indigo-600"
                      : "border-gray-200"
                  }`}
                >
                  {key === "professional" && (
                    <span className="mb-3 inline-block rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                      Populer
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {plan.desc}
                  </p>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    {isFree ? (
                      <span className="text-lg font-semibold text-green-600">
                        Ücretsiz
                      </span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-gray-900">
                          ₺{formatPrice(plan.price)}
                        </span>
                        <span className="text-sm text-gray-500">/ay</span>
                      </>
                    )}
                  </div>
                  {!isFree && (
                    <p className="mt-1 text-xs text-gray-400 text-center">+ KDV (%20)</p>
                  )}
                  {isFree && (
                    <p className="mt-2 text-xs text-gray-400">
                      Her abonelige dahil
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="mb-20">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-14 text-center sm:px-12">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              7 Gün Ücretsiz Deneyin
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-indigo-100">
              Kredi karti gerekmez. Istediginiz modülleri secin, 7 gün boyunca
              tüm ozellikleri ücretsiz deneyin.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-600 shadow-lg transition-all hover:bg-indigo-50 hover:shadow-xl"
            >
              Hemen Baslayin
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
