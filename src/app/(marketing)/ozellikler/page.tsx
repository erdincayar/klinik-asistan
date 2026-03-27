import { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Özellikler — AI Destekli İşletme Yönetimi",
  description:
    "Poby.ai ile randevu yönetimi, WhatsApp entegrasyonu, AI asistan, finans takibi ve Meta Ads yönetimini tek platformda yapın.",
  alternates: { canonical: "https://poby.ai/ozellikler" },
  openGraph: {
    title: "Özellikler — AI Destekli İşletme Yönetimi | Poby.ai",
    description:
      "Küçük işletmeler için tüm ihtiyaçlarınızı karşılayan AI destekli platform.",
    url: "https://poby.ai/ozellikler",
  },
};

const features = [
  {
    icon: "📅",
    title: "Randevu Yönetimi",
    description:
      "Online randevu alma, otomatik hatırlatma ve takvim yönetimi ile müşterilerinizi hiç kaçırmayın.",
  },
  {
    icon: "💬",
    title: "WhatsApp Entegrasyonu",
    description:
      "WhatsApp Business API ile otomatik mesajlaşma, randevu onayı ve müşteri iletişimi.",
  },
  {
    icon: "🤖",
    title: "AI Asistan (Poby)",
    description:
      "İşletmenize özel eğitilmiş AI asistan. Müşteri sorularını yanıtlar, randevu alır, bilgi verir.",
  },
  {
    icon: "💰",
    title: "Finans Takibi",
    description:
      "Gelir-gider takibi, fatura oluşturma, KDV hesaplama ve finansal raporlama.",
  },
  {
    icon: "📊",
    title: "Meta Ads Yönetimi",
    description:
      "Facebook ve Instagram reklamlarınızı platform içinden yönetin, performansı takip edin.",
  },
  {
    icon: "🎨",
    title: "AI İçerik Stüdyosu",
    description:
      "DALL-E 3 ile işletmenize özel sosyal medya görselleri oluşturun. Instagram stil analizi ile kişiselleştirin.",
  },
  {
    icon: "👥",
    title: "Müşteri Yönetimi",
    description:
      "Müşteri kartları, tedavi geçmişi, iletişim bilgileri ve notlar tek ekranda.",
  },
  {
    icon: "📦",
    title: "Stok & Envanter",
    description:
      "Ürün ve malzeme takibi, stok hareketleri, minimum stok uyarıları.",
  },
  {
    icon: "👨‍💼",
    title: "İnsan Kaynakları",
    description:
      "Çalışan yönetimi, maaş hesaplama, SGK bildirgeleri ve belge yönetimi.",
  },
];

export default function OzelliklerPage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "Özellikler", url: "https://poby.ai/ozellikler" },
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

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            İşletmenizi Büyütecek Özellikler
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Randevu yönetiminden AI içerik üretimine, tek platformda tüm
            ihtiyaçlarınız.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-gray-200 p-6 hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <span className="text-3xl">{feature.icon}</span>
              <h2 className="mt-4 text-lg font-bold text-gray-900">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <Link
            href="/register"
            className="inline-block rounded-xl bg-[#c75b12] px-8 py-3 text-base font-semibold text-white hover:bg-[#9e4a0f] transition-colors"
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
