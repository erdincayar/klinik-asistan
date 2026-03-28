import { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Restoran Yönetim Yazılımı — AI Destekli Platform",
  description:
    "Restoranlar için özel tasarlanmış yönetim yazılımı. Rezervasyon yönetimi, WhatsApp sipariş, stok takibi ve AI pazarlama ile işletmenizi büyütün.",
  alternates: { canonical: "https://poby.ai/restoran" },
  openGraph: {
    title: "Restoran Yönetim Yazılımı | Poby.ai",
    description:
      "Rezervasyon, stok takibi ve AI pazarlama ile restoranınızı yönetin.",
    url: "https://poby.ai/restoran",
  },
};

const features = [
  {
    title: "Rezervasyon Yönetimi",
    description:
      "Online rezervasyon, masa planı ve otomatik WhatsApp onay mesajları ile doluluk oranınızı artırın.",
  },
  {
    title: "WhatsApp Sipariş & Bilgi",
    description:
      "Müşteriler WhatsApp üzerinden menü sorsun, rezervasyon yapsın. AI asistan 7/24 yanıt verir.",
  },
  {
    title: "Stok & Malzeme Takibi",
    description:
      "Hammadde stok takibi, minimum stok uyarıları, tedarikçi siparişleri ve maliyet analizi.",
  },
  {
    title: "Gelir-Gider Takibi",
    description:
      "Günlük ciro, gider kategorileri, KDV hesaplama ve aylık finansal raporlar.",
  },
  {
    title: "AI İçerik Stüdyosu",
    description:
      "Yemek fotoğraflarından ilham alan AI ile sosyal medya görselleri oluşturun. Instagram stilinize uygun içerikler.",
  },
  {
    title: "Çalışan & Vardiya Yönetimi",
    description:
      "Personel maaş hesaplama, vardiya planlaması, SGK bildirgeleri ve izin takibi.",
  },
];

const faqItems = [
  {
    question: "Poby.ai restoran yazılımı ne kadar?",
    answer:
      "Aylık ₺99'dan başlayan planlarla restoranınızı dijitalleştirin. Rezervasyon yönetimi ve finansal takip tüm planlara dahildir.",
  },
  {
    question: "WhatsApp üzerinden sipariş alınabilir mi?",
    answer:
      "Evet, Poby AI asistan WhatsApp üzerinden menü bilgisi verir, rezervasyon alır ve müşteri sorularını yanıtlar.",
  },
  {
    question: "Stok takibi hangi özellikleri içerir?",
    answer:
      "Hammadde ve malzeme takibi, minimum stok uyarıları, tedarikçi yönetimi ve maliyet analizi yapabilirsiniz.",
  },
  {
    question: "Birden fazla şube yönetilebilir mi?",
    answer:
      "Evet, Business planı ile birden fazla şubenizi tek panelden yönetebilirsiniz.",
  },
  {
    question: "Instagram görselleri oluşturabilir miyim?",
    answer:
      "Evet, AI İçerik Stüdyosu ile restoranınıza özel sosyal medya görselleri oluşturabilirsiniz. DALL-E 3 teknolojisi kullanılır.",
  },
];

export default function RestoranPage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "Restoran", url: "https://poby.ai/restoran" },
        ]}
      />
      <FAQJsonLd items={faqItems} />

      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Poby<span className="text-[#6366F1]">.ai</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-[#6366F1] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5]"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Restoran Yönetim Yazılımı
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Rezervasyon yönetiminden stok takibine, AI pazarlamadan finansal
            raporlamaya — restoranınız için eksiksiz çözüm.
          </p>
        </div>

        {/* Features */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Restoranlara Özel Özellikler
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial Placeholder */}
        <section className="mb-20 rounded-xl bg-[#EEF2FF] p-10 text-center">
          <blockquote className="text-lg italic text-gray-700 max-w-2xl mx-auto">
            &ldquo;WhatsApp asistan sayesinde rezervasyon kaçırmıyoruz.
            Müşterilerimiz menüyü soruyor, AI anında yanıt veriyor.&rdquo;
          </blockquote>
          <p className="mt-4 font-semibold text-gray-900">Mehmet K.</p>
          <p className="text-sm text-gray-500">Restoran Sahibi, Ankara</p>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Sık Sorulan Sorular
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqItems.map((item) => (
              <div key={item.question}>
                <h3 className="font-semibold text-gray-900">
                  {item.question}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/register"
            className="inline-block rounded-xl bg-[#6366F1] px-8 py-3 text-base font-semibold text-white hover:bg-[#4F46E5] transition-colors"
          >
            Ücretsiz Deneyin
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            Kredi kartı gerekmez. 14 gün ücretsiz deneme.
          </p>
        </div>
      </main>
    </div>
  );
}
