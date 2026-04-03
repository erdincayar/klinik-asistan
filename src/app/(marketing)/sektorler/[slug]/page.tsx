import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PobySVG from "@/components/PobySVG";

const SECTORS: Record<string, {
  title: string;
  description: string;
  h1: string;
  features: string[];
  faq: { q: string; a: string }[];
  keywords: string[];
  businessType: string;
}> = {
  "klinik-yonetim": {
    title: "Klinik Yönetim Yazılımı — Poby.ai",
    description: "Hasta takibi, randevu yönetimi, tedavi planlaması ve finansal raporlama ile kliniğinizi dijitalleştirin. 14 gün ücretsiz deneyin.",
    h1: "Kliniğinizi AI ile Yönetin",
    features: [
      "Hasta kartları ve tedavi geçmişi",
      "Randevu takvimi ve otomatik hatırlatma",
      "Gelir/gider takibi ve KDV hesaplama",
      "Stok ve malzeme yönetimi",
      "Çalışan performans takibi",
      "WhatsApp ile hasta iletişimi",
    ],
    faq: [
      { q: "Klinik yazılımı ne kadar sürede kurulur?", a: "Poby.ai'ye kayıt olduktan sonra 5 dakika içinde kullanmaya başlayabilirsiniz. Kurulum gerektirmez." },
      { q: "Hasta verilerim güvende mi?", a: "Tüm veriler şifreli olarak saklanır. KVKK uyumlu altyapı kullanılmaktadır." },
      { q: "Kaç hasta kaydedebilirim?", a: "Sınırsız hasta kaydı oluşturabilirsiniz. Plan sınırlaması yoktur." },
      { q: "Mobil cihazdan kullanabilir miyim?", a: "Evet, Poby.ai tüm cihazlardan erişilebilir. Mobil uyumlu tasarıma sahiptir." },
      { q: "Ücretsiz deneme var mı?", a: "Evet, 14 gün ücretsiz deneme süresi ile tüm modülleri test edebilirsiniz." },
    ],
    keywords: ["klinik yönetim yazılımı", "hasta takip programı", "medikal yazılım", "klinik randevu sistemi"],
    businessType: "MedicalClinic",
  },
  "guzellik-merkezi": {
    title: "Güzellik Merkezi Yazılımı — Poby.ai",
    description: "Müşteri takibi, randevu yönetimi, cilt bakım planlaması ve stok takibi ile güzellik merkezinizi profesyonelleştirin.",
    h1: "Güzellik Merkeziniz için Akıllı Yönetim",
    features: [
      "Müşteri kartları ve işlem geçmişi",
      "Online randevu ve hatırlatma",
      "Ürün ve malzeme stok takibi",
      "Çalışan bazlı performans raporu",
      "Gelir/gider ve KDV yönetimi",
      "Kampanya ve sadakat programı",
    ],
    faq: [
      { q: "Güzellik merkezi için hangi modüller var?", a: "Müşteri yönetimi, randevu, finans, stok, çalışan ve raporlama modülleri mevcuttur." },
      { q: "Online randevu sistemi var mı?", a: "Evet, müşterileriniz WhatsApp üzerinden randevu alabilir." },
      { q: "Birden fazla şube yönetebilir miyim?", a: "Evet, Poby.ai çoklu şube desteği sunmaktadır." },
      { q: "Ürün stok takibi yapabilir miyim?", a: "Evet, tüm kozmetik ürünlerinizin stok girişi, çıkışı ve kritik stok uyarısı alabilirsiniz." },
      { q: "Fiyatı nedir?", a: "Modüler fiyatlandırma ile sadece kullandığınız modüller için ödeme yaparsınız. 14 gün ücretsiz deneme mevcuttur." },
    ],
    keywords: ["güzellik merkezi yazılımı", "güzellik salonu programı", "cilt bakım randevu sistemi"],
    businessType: "BeautySalon",
  },
  "kuafor-berber": {
    title: "Kuaför & Berber Randevu Sistemi — Poby.ai",
    description: "Kuaför ve berber salonunuz için randevu yönetimi, müşteri takibi ve gelir analizi. Çalışan bazlı takvim ile işlerinizi kolaylaştırın.",
    h1: "Kuaför Salonunuz için Dijital Çözüm",
    features: [
      "Çalışan bazlı randevu takvimi",
      "Müşteri geçmişi ve tercih takibi",
      "Otomatik randevu hatırlatma",
      "Günlük/haftalık ciro raporu",
      "Prim ve komisyon hesaplama",
      "Stok ve malzeme yönetimi",
    ],
    faq: [
      { q: "Kuaför randevu sistemi nasıl çalışıyor?", a: "Çalışan bazlı takvim üzerinden randevu oluşturabilir, müşterilerinize otomatik hatırlatma gönderebilirsiniz." },
      { q: "Çalışan prim takibi var mı?", a: "Evet, her çalışanın yaptığı işlemler üzerinden otomatik prim hesaplaması yapılır." },
      { q: "Müşteri sadakat sistemi var mı?", a: "Müşteri ziyaret geçmişi ve CRM özellikleri ile sadakat takibi yapabilirsiniz." },
      { q: "Kaç çalışan ekleyebilirim?", a: "Sınırsız çalışan ekleyebilirsiniz. Her çalışana ayrı renk ve takvim atanır." },
      { q: "Mobilde çalışıyor mu?", a: "Evet, tüm cihazlarda sorunsuz çalışır." },
    ],
    keywords: ["kuaför randevu sistemi", "berber yazılımı", "kuaför yönetim programı"],
    businessType: "HairSalon",
  },
  "restoran-kafe": {
    title: "Restoran & Kafe Yönetim Yazılımı — Poby.ai",
    description: "Restoran ve kafeniz için rezervasyon yönetimi, gelir takibi, personel yönetimi ve stok kontrolü. Tek platformda her şey.",
    h1: "Restoranınızı Tek Panelden Yönetin",
    features: [
      "Rezervasyon ve masa yönetimi",
      "Günlük gelir/gider takibi",
      "Personel maaş ve prim yönetimi",
      "Malzeme stok takibi",
      "Tedarikçi yönetimi",
      "Mali raporlar ve KDV hesaplama",
    ],
    faq: [
      { q: "Restoran için hangi özellikler var?", a: "Rezervasyon, gelir/gider, stok, personel ve raporlama modülleri mevcuttur." },
      { q: "Masa rezervasyonu yapılabilir mi?", a: "Evet, tarih ve saat bazlı rezervasyon sistemi mevcuttur." },
      { q: "Malzeme stok takibi var mı?", a: "Evet, tüm malzemelerinizin giriş/çıkış takibini yapabilir, kritik stok uyarısı alabilirsiniz." },
      { q: "Fatura entegrasyonu var mı?", a: "AI destekli fatura okuma ile faturalarınızı otomatik sisteme aktarabilirsiniz." },
      { q: "Kaç şube yönetebilirim?", a: "Her şube için ayrı panel oluşturabilirsiniz." },
    ],
    keywords: ["restoran yönetim yazılımı", "kafe yönetim programı", "restoran stok takibi"],
    businessType: "Restaurant",
  },
  "distributor-toptan": {
    title: "Distribütör & Toptan Satış Yazılımı — Poby.ai",
    description: "B2B satış takibi, müşteri ziyaret yönetimi, sipariş oluşturma ve cari hesap takibi. Distribütörler için özel çözüm.",
    h1: "Distribütörler için Satış Yönetim Platformu",
    features: [
      "Müşteri ziyaret ve toplantı takibi",
      "Sipariş oluşturma ve yönetimi",
      "Cari hesap ve borç/alacak takibi",
      "Stok ve envanter yönetimi",
      "Satış raporları ve analiz",
      "Fatura yükleme ve AI okuma",
    ],
    faq: [
      { q: "B2B satış takibi nasıl çalışıyor?", a: "Müşteri bazlı sipariş geçmişi, ciro analizi ve ziyaret takibi ile satışlarınızı yönetebilirsiniz." },
      { q: "Cari hesap takibi var mı?", a: "Evet, borç/alacak takibi, kademeli ödeme ve vade yönetimi mevcuttur." },
      { q: "Fatura okuma özelliği var mı?", a: "Evet, AI destekli fatura okuma ile faturalarınızı otomatik sisteme aktarabilirsiniz." },
      { q: "Stok takibi yapılabilir mi?", a: "Evet, ürün bazlı stok girişi/çıkışı, marka filtresi ve tedarik zinciri analizi mevcuttur." },
      { q: "Konsinye ürün desteği var mı?", a: "Evet, stok takibi açma/kapama özelliği ile konsinye ürünlerinizi ayrı yönetebilirsiniz." },
    ],
    keywords: ["distribütör yazılımı", "toptan satış programı", "B2B satış takibi", "cari hesap yazılımı"],
    businessType: "LocalBusiness",
  },
  "otel-konaklama": {
    title: "Otel & Konaklama Yönetim Yazılımı — Poby.ai",
    description: "Otel ve pansiyonunuz için rezervasyon yönetimi, misafir takibi, gelir analizi ve personel yönetimi.",
    h1: "Otelinizi Dijital Olarak Yönetin",
    features: [
      "Rezervasyon ve oda yönetimi",
      "Misafir kartları ve geçmiş",
      "Gelir/gider ve mali raporlar",
      "Personel maaş ve vardiya yönetimi",
      "Stok ve malzeme takibi",
      "Online rezervasyon entegrasyonu",
    ],
    faq: [
      { q: "Otel yönetim sistemi ne kadar?", a: "Modüler fiyatlandırma ile ihtiyacınıza göre plan seçebilirsiniz. 14 gün ücretsiz deneme mevcuttur." },
      { q: "Online rezervasyon alabilir miyim?", a: "Evet, WhatsApp ve web üzerinden rezervasyon alabilirsiniz." },
      { q: "Kaç oda yönetebilirim?", a: "Sınırsız oda tanımlayabilirsiniz." },
      { q: "Personel yönetimi var mı?", a: "Evet, çalışan takibi, maaş ve izin yönetimi mevcuttur." },
      { q: "Raporlama özellikleri neler?", a: "Doluluk oranı, gelir analizi, müşteri istatistikleri gibi detaylı raporlar sunulmaktadır." },
    ],
    keywords: ["otel yönetim yazılımı", "pansiyon yazılımı", "konaklama yönetim programı"],
    businessType: "Hotel",
  },
};

const SLUGS = Object.keys(SECTORS);

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const sector = SECTORS[params.slug];
  if (!sector) return {};
  return {
    title: sector.title,
    description: sector.description,
    keywords: sector.keywords,
    openGraph: {
      title: sector.title,
      description: sector.description,
      type: "website",
      locale: "tr_TR",
      url: `https://poby.ai/sektorler/${params.slug}`,
      siteName: "Poby.ai",
    },
    twitter: {
      card: "summary_large_image",
      title: sector.title,
      description: sector.description,
    },
    alternates: {
      canonical: `https://poby.ai/sektorler/${params.slug}`,
    },
  };
}

export default function SectorPage({ params }: { params: { slug: string } }) {
  const sector = SECTORS[params.slug];
  if (!sector) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sector.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": sector.businessType,
    name: "Poby.ai",
    url: `https://poby.ai/sektorler/${params.slug}`,
    description: sector.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: "19 Mayıs Mah. Şakacı Sok. No:98E",
      addressLocality: "Kadıköy",
      addressRegion: "İstanbul",
      addressCountry: "TR",
    },
    telephone: "+905301529356",
    email: "destek@poby.ai",
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/"><PobySVG className="h-8 w-auto" /></Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-[#6366F1]">Giriş Yap</Link>
            <Link href="/register" className="rounded-xl bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5558E6]">Ücretsiz Dene</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 leading-tight">{sector.h1}</h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600">{sector.description}</p>
        <div className="mt-8 flex gap-4">
          <Link href="/register" className="rounded-xl bg-[#6366F1] px-6 py-3 text-sm font-semibold text-white hover:bg-[#5558E6] transition-colors">
            14 Gün Ücretsiz Dene
          </Link>
          <Link href="/fiyatlandirma" className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Fiyatları Gör
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Özellikler</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sector.features.map((feature, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#6366F1] text-sm font-bold">{i + 1}</div>
                  <p className="text-sm font-medium text-gray-800">{feature}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Sıkça Sorulan Sorular</h2>
          <div className="space-y-4">
            {sector.faq.map((f, i) => (
              <details key={i} className="rounded-xl border border-gray-200 bg-white">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-gray-900">{f.q}</summary>
                <p className="px-5 pb-4 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1E1E2D] py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Hemen Başlayın</h2>
          <p className="text-gray-400 mb-8">14 gün ücretsiz deneyin, kredi kartı gerekmez.</p>
          <Link href="/register" className="inline-block rounded-xl bg-[#6366F1] px-8 py-3 text-sm font-semibold text-white hover:bg-[#5558E6]">
            Ücretsiz Kayıt Ol
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#16162A] px-6 py-8 text-center">
        <PobySVG inverted className="h-6 w-auto mx-auto mb-3" />
        <p className="text-xs text-gray-500">&copy; 2026 Poby.ai — Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
