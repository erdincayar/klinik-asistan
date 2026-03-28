import { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Klinik Yönetim Yazılımı — AI Destekli Platform",
  description:
    "Klinikler için özel tasarlanmış yönetim yazılımı. Hasta takibi, randevu yönetimi, WhatsApp entegrasyonu ve AI asistan ile kliniğinizi dijitalleştirin.",
  alternates: { canonical: "https://poby.ai/klinik" },
  openGraph: {
    title: "Klinik Yönetim Yazılımı | Poby.ai",
    description:
      "Hasta takibi, randevu yönetimi ve AI asistan ile kliniğinizi yönetin.",
    url: "https://poby.ai/klinik",
  },
};

const features = [
  {
    title: "Hasta Kayıt & Takip",
    description:
      "Hasta kartları, tedavi geçmişi, alerjiler ve notlar tek ekranda. KVKK uyumlu veri saklama.",
  },
  {
    title: "Randevu Yönetimi",
    description:
      "Doktor ve tedavi bazlı randevu takvimi. Otomatik WhatsApp hatırlatma mesajları.",
  },
  {
    title: "Poby AI Asistan",
    description:
      "Hastalarınızın sorularını 7/24 WhatsApp üzerinden yanıtlayan AI asistan. Randevu alır, bilgi verir.",
  },
  {
    title: "Fatura & Finans",
    description:
      "Tedavi bazlı faturalama, gelir-gider takibi, KDV hesaplama ve finansal raporlar.",
  },
  {
    title: "Stok & Malzeme Takibi",
    description:
      "Tıbbi malzeme ve ilaç stok takibi, minimum stok uyarıları, tedarikçi yönetimi.",
  },
  {
    title: "Çalışan Yönetimi",
    description:
      "Doktor ve personel maaş hesaplama, SGK bildirgeleri, izin takibi.",
  },
];

const faqItems = [
  {
    question: "Poby.ai klinik yazılımı ne kadar?",
    answer:
      "Poby.ai aylık ₺99'dan başlayan planlar sunar. Tüm planlar randevu yönetimi, hasta takibi ve finansal özet içerir.",
  },
  {
    question: "Hasta verileri güvende mi?",
    answer:
      "Evet, tüm veriler şifreli olarak saklanır. KVKK uyumlu altyapı ile hasta mahremiyeti korunur.",
  },
  {
    question: "WhatsApp üzerinden randevu alınabilir mi?",
    answer:
      "Evet, Poby AI asistan WhatsApp üzerinden hastaların randevu almasını, iptal etmesini ve bilgi sormasını sağlar.",
  },
  {
    question: "Birden fazla doktor için kullanılabilir mi?",
    answer:
      "Evet, çoklu doktor ve şube desteği mevcuttur. Her doktor için ayrı takvim ve hasta listesi oluşturabilirsiniz.",
  },
  {
    question: "Mevcut hasta verilerimi aktarabilir miyim?",
    answer:
      "Evet, Excel veya CSV formatında toplu hasta verisi aktarımı desteklenmektedir.",
  },
];

export default function KlinikPage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "Klinik", url: "https://poby.ai/klinik" },
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
            Klinik Yönetim Yazılımı
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Hasta takibinden randevu yönetimine, AI asistandan finansal
            raporlamaya — kliniğiniz için ihtiyacınız olan her şey.
          </p>
        </div>

        {/* Features */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Kliniklere Özel Özellikler
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
            &ldquo;Poby.ai sayesinde hasta takibimiz çok kolaylaştı. WhatsApp
            asistan randevu hatırlatmalarını otomatik yapıyor.&rdquo;
          </blockquote>
          <p className="mt-4 font-semibold text-gray-900">Dr. Ayşe Y.</p>
          <p className="text-sm text-gray-500">Diş Kliniği, İstanbul</p>
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
