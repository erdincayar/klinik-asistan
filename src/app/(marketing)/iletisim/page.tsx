import { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "İletişim — Poby.ai",
  description:
    "Poby.ai ile iletişime geçin. Sorularınız, önerileriniz veya destek talepleriniz için bize ulaşın.",
  alternates: { canonical: "https://poby.ai/iletisim" },
  openGraph: {
    title: "İletişim | Poby.ai",
    description: "Poby.ai ekibi ile iletişime geçin.",
    url: "https://poby.ai/iletisim",
  },
};

export default function IletisimPage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "İletişim", url: "https://poby.ai/iletisim" },
        ]}
      />

      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Poby<span className="text-[#c75b12]">.ai</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-[#c75b12] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9e4a0f]"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            İletişim
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Sorularınız için bize ulaşın. En kısa sürede yanıt vereceğiz.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 mb-16">
          <div className="rounded-2xl border border-gray-200 p-6 text-center">
            <h2 className="font-semibold text-gray-900">E-posta</h2>
            <p className="mt-2 text-sm text-gray-600">destek@poby.ai</p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6 text-center">
            <h2 className="font-semibold text-gray-900">WhatsApp</h2>
            <p className="mt-2 text-sm text-gray-600">+90 (xxx) xxx xx xx</p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6 text-center">
            <h2 className="font-semibold text-gray-900">Çalışma Saatleri</h2>
            <p className="mt-2 text-sm text-gray-600">
              Pzt-Cum 09:00-18:00
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Bize Mesaj Gönderin
          </h2>
          <form className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Ad Soyad
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Adınız Soyadınız"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  E-posta
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="ornek@email.com"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Konu
              </label>
              <input
                type="text"
                id="subject"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Mesaj konusu"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mesaj
              </label>
              <textarea
                id="message"
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Mesajınızı yazın..."
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#c75b12] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#9e4a0f] transition-colors"
            >
              Gönder
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
