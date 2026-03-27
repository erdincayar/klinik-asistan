import { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Kuaför Yönetim Yazılımı — AI Destekli Platform",
  description:
    "Kuaför ve güzellik salonları için özel yönetim yazılımı. Randevu yönetimi, müşteri takibi, WhatsApp hatırlatma ve AI içerik üretimi.",
  alternates: { canonical: "https://poby.ai/kuafor" },
  openGraph: {
    title: "Kuaför Yönetim Yazılımı | Poby.ai",
    description:
      "Randevu yönetimi, müşteri takibi ve AI pazarlama ile salonunuzu yönetin.",
    url: "https://poby.ai/kuafor",
  },
};

const features = [
  {
    title: "Randevu & Takvim",
    description:
      "Kuaför bazlı randevu takvimi, online randevu alma, otomatik WhatsApp hatırlatma mesajları.",
  },
  {
    title: "Müşteri Kartları",
    description:
      "Müşteri geçmişi, tercih edilen hizmetler, kullanılan ürünler ve notlar tek ekranda.",
  },
  {
    title: "WhatsApp Asistan",
    description:
      "Müşteriler WhatsApp üzerinden randevu alsın, iptal etsin, fiyat sorsun. AI 7/24 yanıt verir.",
  },
  {
    title: "AI İçerik Stüdyosu",
    description:
      "Saç modeli, manikür ve güzellik görselleri oluşturun. Instagram stilinize uygun AI içerikler.",
  },
  {
    title: "Gelir & Kasa Takibi",
    description:
      "Hizmet bazlı gelir takibi, günlük kasa, aylık raporlar ve KDV hesaplama.",
  },
  {
    title: "Personel Yönetimi",
    description:
      "Kuaför performans takibi, prim hesaplama, maaş bordrosu ve SGK bildirgeleri.",
  },
];

const faqItems = [
  {
    question: "Poby.ai kuaför yazılımı ne kadar?",
    answer:
      "Aylık ₺99'dan başlayan planlarla salonunuzu dijitalleştirin. Randevu yönetimi ve müşteri takibi tüm planlara dahildir.",
  },
  {
    question: "Müşterilerim WhatsApp'tan randevu alabilir mi?",
    answer:
      "Evet, Poby AI asistan WhatsApp üzerinden 7/24 randevu alır, hatırlatma yapar ve fiyat bilgisi verir.",
  },
  {
    question: "Her kuaför için ayrı takvim oluşturulabilir mi?",
    answer:
      "Evet, her kuaför ve uzman için ayrı çalışma saatleri ve randevu takvimi tanımlayabilirsiniz.",
  },
  {
    question: "Instagram için içerik oluşturabilir miyim?",
    answer:
      "Evet, AI İçerik Stüdyosu ile salonunuza özel sosyal medya görselleri oluşturabilirsiniz. Mevcut Instagram stilinizi analiz eder.",
  },
  {
    question: "Kuaför performansını takip edebilir miyim?",
    answer:
      "Evet, her kuaförün yaptığı hizmet sayısı, cirosu ve müşteri memnuniyetini raporlayabilirsiniz.",
  },
];

export default function KuaforPage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "Kuaför", url: "https://poby.ai/kuafor" },
        ]}
      />
      <FAQJsonLd items={faqItems} />

      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Poby<span className="text-[#BE3A21]">.ai</span>
          </Link>
          <Link
            href="/login"
            className="rounded-[4px] bg-[#BE3A21] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9B2D18]"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Kuaför Yönetim Yazılımı
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Randevu yönetiminden müşteri takibine, AI içerik üretiminden
            personel yönetimine — salonunuz için eksiksiz çözüm.
          </p>
        </div>

        {/* Features */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Kuaförlere Özel Özellikler
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[4px] border border-gray-200 p-6"
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
        <section className="mb-20 rounded-[4px] bg-[#FFF5F3] p-10 text-center">
          <blockquote className="text-lg italic text-gray-700 max-w-2xl mx-auto">
            &ldquo;Müşterilerimiz artık WhatsApp&apos;tan randevu alıyor.
            Telefon trafiği azaldı, memnuniyet arttı.&rdquo;
          </blockquote>
          <p className="mt-4 font-semibold text-gray-900">Zeynep A.</p>
          <p className="text-sm text-gray-500">Güzellik Salonu, İzmir</p>
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
            className="inline-block rounded-[4px] bg-[#BE3A21] px-8 py-3 text-base font-semibold text-white hover:bg-[#9B2D18] transition-colors"
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
