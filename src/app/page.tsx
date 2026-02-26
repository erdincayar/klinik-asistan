import Link from "next/link";
import {
  Calendar,
  DollarSign,
  Bell,
  Image,
  Bot,
  BarChart3,
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Randevu Takip",
    description: "Müşteri randevularını kolayca yönetin, hatırlatmalar gönderin",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: DollarSign,
    title: "Finans Yönetimi",
    description: "Gelir-gider takibi, ön muhasebe ve finansal raporlar",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: Bell,
    title: "Hatırlatma Sistemi",
    description: "Otomatik müşteri hatırlatmaları ile randevu kaçırmayı önleyin",
    color: "bg-amber-100 text-amber-600",
  },
  {
    icon: Image,
    title: "Görsel Üretme",
    description: "AI destekli sosyal medya görselleri ve tanıtım materyalleri",
    color: "bg-pink-100 text-pink-600",
  },
  {
    icon: Bot,
    title: "AI Chatbot",
    description: "7/24 akıllı asistan ile müşteri sorularını yanıtlayın",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: BarChart3,
    title: "Raporlama",
    description: "Detaylı analitik ve raporlarla işletmenizi büyütün",
    color: "bg-indigo-100 text-indigo-600",
  },
];

const steps = [
  {
    number: "1",
    title: "Sektörünüzü Seçin",
    description: "İşletmenize uygun sektörü belirleyin",
  },
  {
    number: "2",
    title: "Paketinizi Belirleyin",
    description: "İhtiyaçlarınıza uygun paketi seçin",
  },
  {
    number: "3",
    title: "Yönetmeye Başlayın",
    description: "WhatsApp veya Telegram'dan işletmenizi yönetin",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 overflow-hidden">
        {/* Decorative floating shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="animate-float absolute top-20 left-[10%] h-16 w-16 rounded-full bg-white/10" />
          <div
            className="animate-float absolute top-40 right-[15%] h-24 w-24 rounded-full bg-white/5"
            style={{ animationDelay: "0.5s" }}
          />
          <div
            className="animate-float absolute bottom-32 left-[20%] h-20 w-20 rounded-full bg-white/10"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="animate-float absolute top-1/3 right-[8%] h-12 w-12 rounded-full bg-white/15"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="animate-float absolute bottom-20 right-[25%] h-14 w-14 rounded-full bg-white/10"
            style={{ animationDelay: "2s" }}
          />
          <div className="animate-float absolute top-16 left-[50%] h-10 w-10 rounded-lg rotate-45 bg-white/10" />
          <div
            className="animate-float absolute bottom-40 left-[5%] h-8 w-8 rounded-lg rotate-12 bg-white/15"
            style={{ animationDelay: "0.8s" }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
            <Smartphone className="h-4 w-4" />
            <span>Bilgisayara ihtiyaç yok</span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            İşletmelere Özel{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
              Kişisel Asistanınız
            </span>{" "}
            Yanınızda
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-blue-100 sm:text-xl">
            WhatsApp veya Telegram üzerinden işletmenizi yönetin. Bilgisayara
            ihtiyaç yok.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-base font-semibold text-gray-900 shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl hover:scale-105 sm:h-14 sm:px-10 sm:text-lg"
            >
              Hadi Başlayalım
              <ArrowRight className="h-5 w-5" />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-base text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Giriş Yap
            </Link>
          </div>

          {/* Social proof hint */}
          <div className="mt-12 flex flex-col items-center gap-3 text-white/60">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="h-4 w-4 fill-yellow-400"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm">
              İşletme sahiplerinin tercihi
            </p>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <path
              d="M0 50L48 45.7C96 41.3 192 32.7 288 30.2C384 27.7 480 31.3 576 38.5C672 45.7 768 56.3 864 58.8C960 61.3 1056 55.7 1152 48.5C1248 41.3 1344 32.7 1392 28.3L1440 24V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
              <CheckCircle className="h-4 w-4" />
              Özellikler
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Tüm İhtiyaçlarınız Tek Platformda
            </h2>
            <p className="text-lg text-gray-600">
              İşletmenizi yönetmek için ihtiyacınız olan her şey tek bir yerde.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg hover:border-gray-300"
                >
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS SECTION ========== */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700">
              <MessageCircle className="h-4 w-4" />
              Nasıl Çalışır?
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Nasıl Çalışır?
            </h2>
            <p className="text-lg text-gray-600">
              Sadece 3 adımda işletmenizi yönetmeye başlayın.
            </p>
          </div>

          <div className="relative mt-16">
            {/* Connecting line for desktop */}
            <div className="absolute left-0 right-0 top-8 hidden h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-indigo-200 lg:block lg:left-[16.67%] lg:right-[16.67%]" />

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8">
              {steps.map((step) => (
                <div key={step.number} className="relative flex flex-col items-center text-center">
                  {/* Step number */}
                  <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-2xl font-bold text-white shadow-lg ring-4 ring-white">
                    {step.number}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="max-w-xs text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 py-20 sm:py-28">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="animate-float absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/5" />
          <div
            className="animate-float absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-white/5"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Hemen Başlayın
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-blue-100">
            Ücretsiz deneme ile tüm özellikleri keşfedin
          </p>
          <Link
            href="/onboarding"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-base font-semibold text-gray-900 shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl hover:scale-105 sm:h-14 sm:px-10 sm:text-lg"
          >
            Hadi Başlayalım
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-gray-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="text-xl font-bold text-white">KlinikAsistan</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-400">
                İşletmenizi WhatsApp veya Telegram üzerinden kolayca yönetin.
                AI destekli kişisel asistanınız her zaman yanınızda.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                <MessageCircle className="h-4 w-4" />
                <span>info@klinikasistan.com</span>
              </div>
            </div>

            {/* Urun */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-300">
                Ürün
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Özellikler
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Fiyatlandırma
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Entegrasyonlar
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Sektörler
                  </Link>
                </li>
              </ul>
            </div>

            {/* Destek */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-300">
                Destek
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Yardım Merkezi
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    İletişim
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    SSS
                  </Link>
                </li>
              </ul>
            </div>

            {/* Yasal */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-300">
                Yasal
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Kullanım Koşulları
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Gizlilik Politikası
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    KVKK
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t border-gray-800 pt-8 text-center">
            <p className="text-sm text-gray-500">
              &copy; 2026 KlinikAsistan. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
