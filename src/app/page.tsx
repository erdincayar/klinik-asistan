"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { SoftwareApplicationJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";
import PobySVG from "@/components/PobySVG";
import {
  Users,
  Calendar,
  DollarSign,
  Package,
  ArrowRight,
  Menu,
  X,
  ChevronLeft,
  Check,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Heart,
  Bot,
  Megaphone,
  Share2,
  Sparkles,
  MessageCircle,
  ChevronDown,
  Send,
  Mail,
} from "lucide-react";
import {
  SECTOR_OPTIONS,
  TEAM_SIZE_OPTIONS,
  PAIN_POINT_OPTIONS,
} from "@/lib/onboarding/module-definitions";
import type { ModuleRecommendation, AnalysisResult } from "@/lib/onboarding/onboarding-agent";

/* ══════════════════════════════ DATA ══════════════════════════════ */

const navLinks = [
  { href: "#features", label: "Özellikler" },
  { href: "#modules", label: "Modüller" },
  { href: "#reviews", label: "Yorumlar" },
  { href: "/blog", label: "Blog" },
];

const footerLinks = {
  Ürün: [
    { label: "Özellikler", href: "/ozellikler" },
    { label: "Fiyatlandırma", href: "/fiyatlandirma" },
    { label: "Blog", href: "/blog" },
  ],
  Sektörler: [
    { label: "Klinik Yönetimi", href: "/sektorler/klinik-yonetim" },
    { label: "Güzellik Merkezi", href: "/sektorler/guzellik-merkezi" },
    { label: "Kuaför & Berber", href: "/sektorler/kuafor-berber" },
    { label: "Restoran & Kafe", href: "/sektorler/restoran-kafe" },
    { label: "Distribütör", href: "/sektorler/distributor-toptan" },
    { label: "Otel", href: "/sektorler/otel-konaklama" },
  ],
  Destek: [
    { label: "İletişim", href: "#contact" },
    { label: "SSS", href: "#faq" },
  ],
};

const FAQ_ITEMS = [
  { q: "Poby.ai nedir ve ne işe yarar?", a: "Poby.ai, işletmelerin günlük operasyonlarını tek bir platformdan yönetmesini sağlayan AI destekli bir yönetim yazılımıdır. Randevu, finans, stok, müşteri takibi, WhatsApp entegrasyonu ve daha fazlasını sunar." },
  { q: "Hangi sektörler Poby.ai kullanabilir?", a: "Klinikler, güzellik merkezleri, kuaför & berber salonları, restoranlar, kafeler, distribütörler, oteller ve tüm hizmet sektörleri Poby.ai'yı kullanabilir. Sektöre özel modüller ve arayüzler sunuyoruz." },
  { q: "Poby.ai'ın fiyatı nedir?", a: "Poby.ai aylık ₺499'dan başlayan planlar sunar. 7 gün ücretsiz deneme süresi ile başlayabilirsiniz. Kredi kartı bilgisi gerekmez, taahhüt yoktur." },
  { q: "Ücretsiz deneme süresi var mı?", a: "Evet! 7 gün tamamen ücretsiz deneyebilirsiniz. Deneme süresinde tüm özellikler açıktır. Kredi kartı bilgisi istenmez ve deneme sonunda otomatik ücretlendirme yapılmaz." },
  { q: "WhatsApp entegrasyonu nasıl çalışır?", a: "Müşterileriniz WhatsApp üzerinden randevu alabilir, bilgi sorabilir ve hatırlatma mesajları alabilir. AI destekli chatbot, müşterilerinizle 7/24 otomatik iletişim kurar." },
  { q: "AI asistan ne yapabilir?", a: "AI asistan randevu önerisi, akıllı hatırlatmalar, finansal analiz, stok uyarıları, müşteri segmentasyonu ve sosyal medya içerik üretimi gibi görevleri otomatik olarak gerçekleştirir." },
  { q: "Verilerim güvende mi?", a: "Evet. Tüm veriler AES-256 ile şifrelenir, SSL/TLS ile korunur ve Türkiye'deki sunucularda barındırılır. KVKK uyumlu altyapımız ile verileriniz güvende." },
  { q: "Mobil cihazlardan erişebilir miyim?", a: "Evet, Poby.ai tamamen responsive tasarıma sahiptir. Telefon, tablet veya bilgisayardan herhangi bir kurulum yapmadan web tarayıcınız üzerinden erişebilirsiniz." },
  { q: "Mevcut müşteri verilerimi aktarabilir miyim?", a: "Evet, Excel veya CSV dosyalarından müşteri, ürün ve stok verilerinizi kolayca içe aktarabilirsiniz. Destek ekibimiz veri aktarımında size yardımcı olur." },
  { q: "Teknik destek nasıl alabilirim?", a: "destek@poby.ai adresinden veya 0530 152 93 56 numarasından bize ulaşabilirsiniz. Hafta içi 09:00-18:00 arası canlı destek, 7/24 e-posta desteği sunuyoruz." },
];

const dashboardTabs = [
  "Genel Bakış",
  "Randevular",
  "Finans",
  "Stok",
  "Müşteriler",
  "Çalışanlar",
] as const;

const modules = [
  {
    icon: "🏥",
    title: "Müşteri/Hasta Yönetimi",
    desc: "Hasta kayıtları, tedavi geçmişi, fotoğraf arşivi, ziyaret takibi. Tüm müşteri bilgilerinizi tek merkezden yönetin.",
  },
  {
    icon: "📅",
    title: "Randevu Sistemi",
    desc: "Çalışan bazlı takvim, çakışma kontrolü, otomatik hatırlatma. Randevularınızı akıllıca planlayın.",
  },
  {
    icon: "💰",
    title: "Finans Yönetimi",
    desc: "Gelir/gider takibi, mali tablolar, fatura yönetimi. Finansal durumunuzu anlık olarak izleyin.",
  },
  {
    icon: "📦",
    title: "Stok/Envanter",
    desc: "Ürün takibi, minimum stok uyarısı, hareket geçmişi. Envanterinizi kayıp olmadan yönetin.",
  },
  {
    icon: "👥",
    title: "Çalışan Yönetimi",
    desc: "Personel listesi, komisyon takibi, performans izleme. Ekibinizin verimliliğini artırın.",
  },
  {
    icon: "🤖",
    title: "AI Asistan",
    desc: "Doğal dilde soru-cevap, analiz, öneri, belge oluşturma. Yapay zeka gücünü işletmenize taşıyın.",
  },
  {
    icon: "📊",
    title: "Raporlar",
    desc: "Detaylı gelir/gider raporları, müşteri istatistikleri, trend analizi. Veriye dayalı kararlar alın.",
  },
  {
    icon: "📱",
    title: "WhatsApp/Telegram Bot",
    desc: "İşletmenizi telefonunuzdan yönetin, bot ile sorgulayın. Her yerden erişim, anında bilgi.",
  },
  {
    icon: "📣",
    title: "Meta Ads Yönetimi",
    desc: "Facebook/Instagram kampanya yönetimi, AI analiz. Reklam bütçenizi optimize edin.",
  },
  {
    icon: "🧾",
    title: "Fatura OCR",
    desc: "Fatura fotoğrafından otomatik veri çıkarma. Manuel girişe son verin, hataları minimize edin.",
  },
  {
    icon: "📸",
    title: "Sosyal Medya",
    desc: "AI ile içerik önerileri, görseller, yayın takvimi. Sosyal medya stratejinizi güçlendirin.",
  },
  {
    icon: "👨‍💼",
    title: "İnsan Kaynakları",
    desc: "İş sözleşmesi, özlük dosyası, AI belge oluşturucu. İK süreçlerinizi dijitalleştirin.",
  },
];

const tweets = [
  { name: "Ahmet Yılmaz", user: "@ahmetyilmaz", img: "men/1", text: "Poby sayesinde randevularımı artık karıştırmıyorum. Çalışan bazlı takvim harika, çakışma uyarısı da cabası!", likes: 342, date: "2 gün önce" },
  { name: "Fatma Kaya", user: "@fatmakaya_", img: "women/1", text: "Finansal raporlar o kadar detaylı ki muhasebecim bile şaşırdı. Aylık gelir-gider takibi çok kolay.", likes: 218, date: "5 gün önce" },
  { name: "Mehmet Demir", user: "@mdemir34", img: "men/2", text: "Stok yönetimi modülü düşük stok uyarılarıyla hayat kurtardı. Artık hiçbir ürünümüz bitmeden fark ediyoruz.", likes: 156, date: "1 hafta önce" },
  { name: "Ayşe Çelik", user: "@aysecelik", img: "women/2", text: "AI asistanı ilk denediğimde inanamadım! 'Bu ay en çok hangi hizmet satıldı?' diye sordum, anında cevap verdi.", likes: 487, date: "3 gün önce" },
  { name: "Mustafa Öztürk", user: "@mozturk", img: "men/3", text: "WhatsApp botunu müşterilerimize entegre ettik. Randevu onayları otomatik gidiyor, artık telefon trafiği sıfır.", likes: 312, date: "4 gün önce" },
  { name: "Zeynep Aksoy", user: "@zeynepaksoy", img: "women/3", text: "Fatura OCR özelliği muazzam! Faturayı çekiyorum, tüm bilgiler otomatik dolduruluyor. Manuel giriş dönemi bitti.", likes: 423, date: "1 gün önce" },
  { name: "Ali Kılıç", user: "@alikilictr", img: "men/4", text: "3 şubemizi Poby'den yönetiyoruz. Tüm verilere tek panelden ulaşmak inanılmaz kolaylık.", likes: 189, date: "6 gün önce" },
  { name: "Elif Şahin", user: "@elifsahin", img: "women/4", text: "Çalışan komisyon takibi artık kavga sebebi değil. Herkes kendi performansını görebiliyor, şeffaflık sağlandı.", likes: 267, date: "2 hafta önce" },
  { name: "Hasan Yıldız", user: "@hasanyildiz", img: "men/5", text: "Reklam analiz modülü Facebook kampanyalarımın ROI'sini ikiye katladı. AI önerileri gerçekten işe yarıyor.", likes: 398, date: "5 gün önce" },
  { name: "Merve Arslan", user: "@mervearslan", img: "women/5", text: "Sosyal medya içerik önerileri muhteşem! AI'ın yazdığı postlar benim yazdıklarımdan daha fazla etkileşim alıyor 😄", likes: 445, date: "3 gün önce" },
  { name: "Emre Koç", user: "@emrekoc", img: "men/6", text: "İK modülüyle iş sözleşmelerini 5 dakikada hazırlıyoruz. Eskiden avukata gidiyorduk, artık gerek yok.", likes: 178, date: "1 hafta önce" },
  { name: "Selin Aydın", user: "@selinaydin", img: "women/6", text: "Hasta kayıt sistemi çok pratik. Tedavi geçmişi, fotoğraflar, notlar — her şey tek yerde.", likes: 234, date: "4 gün önce" },
  { name: "Burak Erdoğan", user: "@burakerdogan", img: "men/7", text: "Telegram botu ile stok sorguluyorum, randevu bakıyorum. Dükkandayken bile bilgisayara ihtiyaç duymuyorum.", likes: 301, date: "2 gün önce" },
  { name: "Derya Yılmaz", user: "@deryaylmz", img: "women/7", text: "Kuaförümüz için Poby'yi kullanmaya başladık. Randevu hatırlatmaları sayesinde iptal oranımız %40 düştü!", likes: 356, date: "6 gün önce" },
  { name: "İbrahim Çetin", user: "@ibrahimcetin", img: "men/8", text: "Eczanemizin stok yönetimini tamamen Poby'ye taşıdık. Son kullanma tarihi uyarıları bile var, süper!", likes: 199, date: "1 hafta önce" },
  { name: "Gülşah Kara", user: "@gulsahkara", img: "women/8", text: "AI asistanına 'haftalık rapor hazırla' diyorum, 10 saniyede detaylı analiz çıkarıyor. Müthiş!", likes: 412, date: "3 gün önce" },
  { name: "Caner Aras", user: "@caneraras", img: "men/9", text: "Fatura yönetimi modülü işimizi kolaylaştırdı. PDF fatura oluşturup e-postayla anında gönderebiliyoruz.", likes: 145, date: "5 gün önce" },
  { name: "Neslihan Doğan", user: "@neslihandogan", img: "women/9", text: "Müşteri sadakat takibi yapabiliyoruz artık. En çok gelen hastalarımıza özel kampanyalar düzenliyoruz.", likes: 278, date: "4 gün önce" },
  { name: "Oğuz Han", user: "@oguzhan_tr", img: "men/10", text: "5 yıldır farklı programlar denedim, Poby hepsinden üstün. Hele AI asistan özelliği rakipsiz.", likes: 467, date: "2 gün önce" },
  { name: "Pınar Aktaş", user: "@pinaraktas", img: "women/10", text: "Çalışan yönetimi modülü sayesinde maaş bordroları artık sorunsuz. Komisyonlar otomatik hesaplanıyor.", likes: 189, date: "1 hafta önce" },
  { name: "Serkan Özkan", user: "@serkanozkan", img: "men/11", text: "Demo'yu gördüm ve 10 dakika içinde karar verdim. Şimdi 3 aydır kullanıyoruz, pişman değiliz.", likes: 334, date: "6 gün önce" },
  { name: "Tuğba Yılmaz", user: "@tugbaylmz", img: "women/11", text: "Gelir-gider grafiklerini her sabah kontrol ediyorum. İşletmemin nabzını tutmak hiç bu kadar kolay olmamıştı.", likes: 256, date: "3 gün önce" },
  { name: "Volkan Şen", user: "@volkan_sen", img: "men/12", text: "WhatsApp'tan 'bugün kaç randevum var?' diye yazıyorum, bot anında cevap veriyor. Teknoloji çağı gerçekten!", likes: 378, date: "5 gün önce" },
  { name: "Yasemin Güneş", user: "@yasemingunes", img: "women/12", text: "OCR ile fatura okuma özelliği beni en çok etkileyen şey oldu. Fotoğraf çek, otomatik kayıt — bu kadar basit!", likes: 421, date: "2 gün önce" },
  { name: "Cem Yıldırım", user: "@cemyildirim", img: "men/13", text: "Poby'nin raporlama modülü bankadaki toplantılarda bile işime yaradı. Profesyonel raporlarla kredi aldık.", likes: 298, date: "1 hafta önce" },
  { name: "Damla Korkmaz", user: "@damlakorkmaz", img: "women/13", text: "Diş kliniğimiz için mükemmel! Hasta tedavi planları, kontrol hatırlatmaları... Sanki özel asistanımız var.", likes: 367, date: "4 gün önce" },
  { name: "Enes Polat", user: "@enespolat", img: "men/14", text: "Meta Ads entegrasyonu ile reklam harcamalarımı %30 azalttım. AI hangi kampanyanın işe yaradığını gösteriyor.", likes: 445, date: "3 gün önce" },
  { name: "Funda Tek", user: "@fundatek", img: "women/14", text: "Sosyal medya takvimi özelliği beni kurtardı. AI içerik önerileri veriyor, ben sadece onaylıyorum.", likes: 212, date: "6 gün önce" },
  { name: "Gökhan Aslan", user: "@gokhanaslan", img: "men/15", text: "Restoranımızın tüm malzeme stoğunu buradan takip ediyoruz. Minimum stok uyarısı çalışıyor, tedarik aksatmıyoruz.", likes: 178, date: "5 gün önce" },
  { name: "Hülya Doğan", user: "@hulyadogan", img: "women/15", text: "İK modülü ile tüm çalışan belgelerini dijitalleştirdik. Artık dosya dolabına ihtiyaç yok, her şey Poby'de.", likes: 234, date: "2 gün önce" },
  { name: "İlker Başaran", user: "@ilkerbasaran", img: "men/16", text: "AI asistana 'en kârlı hizmetimiz hangisi?' diye sordum, detaylı analiz çıkardı. Stratejimizi buna göre değiştirdik.", likes: 389, date: "1 hafta önce" },
  { name: "Jale Özdemir", user: "@jaleozdemir", img: "women/16", text: "Güzellik salonumda 8 çalışanın randevularını yönetmek imkansızdı. Poby ile her şey düzene girdi.", likes: 456, date: "4 gün önce" },
  { name: "Kerem Aydoğan", user: "@keremaydogan", img: "men/17", text: "Ücretsiz denemeyle başladık, 1 haftada tüm veriyi taşıdık. Geçiş süreci çok pürüzsüz oldu.", likes: 167, date: "3 gün önce" },
  { name: "Leyla Yıldırım", user: "@leylayildirim", img: "women/17", text: "Müşteri memnuniyet takibi yapabiliyoruz. Kötü yorum gelmeden müdahale ediyoruz. Müşteri kaybımız azaldı.", likes: 312, date: "6 gün önce" },
  { name: "Mert Çalışkan", user: "@mertcaliskan", img: "men/18", text: "Veteriner kliniğimiz için kullanıyoruz. Hayvan hastaları bile kayıt altında, aşı hatırlatmaları otomatik!", likes: 287, date: "5 gün önce" },
  { name: "Nur Sönmez", user: "@nursonmez", img: "women/18", text: "Finans modülündeki KDV hesaplamaları otomatik. Muhasebeci ayda 2 gün harcıyordu, şimdi 2 saat yetiyor.", likes: 398, date: "2 gün önce" },
  { name: "Onur Kılıçoğlu", user: "@onurkilicoglu", img: "men/19", text: "3 ay önce başladık, şimdi işletmemiz 10 kat daha düzenli. Poby olmadan nasıl yaptık hâlâ anlamıyorum.", likes: 423, date: "1 hafta önce" },
  { name: "Özge Bayrak", user: "@ozgebayrak", img: "women/19", text: "Telegram botunu çalışanlarıma da açtım. Herkes kendi programını bottan sorgulayabiliyor, harika!", likes: 234, date: "4 gün önce" },
  { name: "Recep Kaplan", user: "@recepkaplan", img: "men/20", text: "Poby destek ekibi de çok ilgili. Sorularıma anında dönüyorlar, gerçekten müşteri odaklı çalışıyorlar.", likes: 178, date: "3 gün önce" },
  { name: "Selma Acar", user: "@selmaacar", img: "women/20", text: "Raporları Excel'e aktarabiliyorsunuz. Yıllık mali tablolar için muhasebeciye direk gönderiyorum, çok pratik.", likes: 267, date: "6 gün önce" },
  { name: "Tarık Güler", user: "@tarikguler", img: "men/21", text: "Optik dükkânımda lens ve çerçeve stoğu takibini Poby ile yapıyorum. Barkod sistemiyle hızlıca ekliyoruz.", likes: 189, date: "5 gün önce" },
  { name: "Ülkü Dinç", user: "@ulkudinc", img: "women/21", text: "AI'a sordum: 'Hangi günler daha yoğunuz?' Cuma ve Cumartesi dedi, personel planımızı değiştirdik. İşe yaradı!", likes: 345, date: "2 gün önce" },
  { name: "Vedat Şimşek", user: "@vedatsimsek", img: "men/22", text: "Instagram reklamlarımızı AI analiz ediyor. Hangi görselin daha çok tıklama aldığını gösteriyor, buna göre kampanya kuruyoruz.", likes: 412, date: "1 hafta önce" },
  { name: "Yeliz Aydın", user: "@yelizaydin", img: "women/22", text: "Online randevu formunu web sitemize ekledik. Müşteriler kendileri randevu alıyor, biz sadece onaylıyoruz.", likes: 378, date: "4 gün önce" },
  { name: "Zafer Çelik", user: "@zafercelik", img: "men/23", text: "İlk ay ücretsiz başladık, 2. aydan itibaren kendini amorti etti. Zamandan ve paradan tasarruf sağlıyoruz.", likes: 298, date: "3 gün önce" },
  { name: "Bahar Yılmaz", user: "@baharyilmaz", img: "women/23", text: "Çocuk gelişim merkezimizde veli bilgilendirme otomatik. Seans sonrası WhatsApp'tan rapor gidiyor, veliler çok memnun.", likes: 423, date: "6 gün önce" },
  { name: "Cenk Avcı", user: "@cenk_avci", img: "men/24", text: "Fatura OCR'ı test ettim. Buruşuk bir faturayı bile okudu! Yapay zeka gerçekten fark yaratıyor.", likes: 356, date: "5 gün önce" },
  { name: "Deniz Koçak", user: "@deniz_kocak", img: "women/24", text: "Poby sayesinde günde 2 saat kazanıyorum. O zamanı müşterilerime harcıyorum, gelirlerim de arttı.", likes: 489, date: "2 gün önce" },
  { name: "Erhan Tekin", user: "@erhantekin", img: "men/25", text: "Stok hareket geçmişi özelliği harika. Hangi ürün ne zaman girdi, ne zaman çıktı — her şey kayıt altında.", likes: 167, date: "1 hafta önce" },
  { name: "Filiz Ünal", user: "@filizunal", img: "women/25", text: "Poby'yi tüm esnaf arkadaşlarıma öneriyorum. Kullanımı kolay, fiyatı uygun, desteği mükemmel. 10/10!", likes: 498, date: "4 gün önce" },
];

/* ══════════════════════════════ HELPERS ══════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function AnimatedNumber({ target, prefix = "", duration = 1500 }: { target: number; prefix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false });

  useEffect(() => {
    if (!inView) { setValue(0); return; }
    const startTime = performance.now();
    let raf: number;
    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(update);
    }
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return <span ref={ref}>{prefix}{value.toLocaleString("tr-TR")}</span>;
}

/* ══════════════════════════ HERO ICON MAP ══════════════════════════ */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle, Calendar, DollarSign, Sparkles, Megaphone, Share2, Users, Bot,
};

function ModuleIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const Icon = ICON_MAP[name] || Bot;
  return <span style={color ? { color } : undefined}><Icon className={className} /></span>;
}

/* ══════════════════════════ HERO MODULE CARD ══════════════════════════ */

function HeroModuleCard({
  mod,
  selected,
  onToggle,
  muted,
}: {
  mod: ModuleRecommendation;
  selected: boolean;
  onToggle: () => void;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left backdrop-blur-sm transition-all ${
        selected
          ? "border-[#6366F1] bg-[#EEF2FF]/80 shadow-md shadow-[#6366F1]/10"
          : muted
          ? "border-gray-200/60 bg-white/50 opacity-70 hover:opacity-100"
          : "border-gray-200/80 bg-white/80 hover:border-gray-300"
      }`}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${mod.color}15` }}
      >
        <ModuleIcon name={mod.icon} className="h-5 w-5" color={mod.color} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{mod.name}</p>
        <p className="text-xs text-gray-500 line-clamp-1">{mod.shortDescription}</p>
        {mod.reasoning && (
          <p className="mt-0.5 text-[11px] italic text-[#4F46E5] line-clamp-1">{mod.reasoning}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-bold text-gray-600">₺{mod.basePrice}/ay</span>
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
            selected ? "border-[#6366F1] bg-[#6366F1]" : "border-gray-300"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
    </button>
  );
}

/* ══════════════════════════ TWEET CARD ══════════════════════════ */

function TweetCard({ tweet }: { tweet: (typeof tweets)[0] }) {
  return (
    <div className="mx-3 w-[340px] shrink-0 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://randomuser.me/api/portraits/${tweet.img}.jpg`}
          alt={tweet.name}
          className="h-10 w-10 rounded-full object-cover"
          loading="lazy"
        />
        <div>
          <p className="text-sm font-semibold text-gray-900">{tweet.name}</p>
          <p className="text-xs text-gray-400">{tweet.user}</p>
        </div>
      </div>
      <p className="mb-3 text-[13px] leading-relaxed text-gray-700">{tweet.text}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 text-red-400" />
          <span>{tweet.likes}</span>
        </div>
        <span>{tweet.date}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════ DASHBOARD TAB CONTENT ═══════════════════════ */

function DashboardOverview() {
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Toplam Müşteri", target: 247, prefix: "", icon: Users, change: "+18", up: true, color: "text-[#6366F1]", bg: "bg-[#EEF2FF]" },
          { label: "Bugünün Randevuları", target: 12, prefix: "", icon: Calendar, change: "+3", up: true, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Aylık Gelir", target: 48500, prefix: "₺", icon: TrendingUp, change: "+22%", up: true, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Stok Uyarısı", target: 3, prefix: "", icon: AlertTriangle, change: "Kritik", up: false, color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-400">{s.label}</span>
                <div className={`rounded-lg p-1.5 ${s.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">
                <AnimatedNumber target={s.target} prefix={s.prefix} />
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${s.up ? "text-emerald-500" : "text-red-500"}`}>
                {s.change}
              </p>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <p className="mb-3 text-xs font-semibold text-gray-500">Aylık Gelir Trendi</p>
        <div className="flex h-[100px] items-end gap-2">
          {[35, 50, 40, 65, 55, 80, 60, 75, 90, 70, 85, 95].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#6366F1] to-[#818CF8]" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-gray-400">
          <span>Oca</span><span>Şub</span><span>Mar</span><span>Nis</span><span>May</span><span>Haz</span>
          <span>Tem</span><span>Ağu</span><span>Eyl</span><span>Eki</span><span>Kas</span><span>Ara</span>
        </div>
      </div>
    </div>
  );
}

function DashboardAppointments() {
  const appointments = [
    { name: "Ahmet Yılmaz", time: "10:00", service: "Diş Dolgusu", status: "Onaylandı", statusColor: "bg-emerald-100 text-emerald-700" },
    { name: "Fatma Kaya", time: "11:30", service: "Kontrol", status: "Bekliyor", statusColor: "bg-orange-100 text-orange-700" },
    { name: "Mehmet Demir", time: "14:00", service: "Kanal Tedavisi", status: "Onaylandı", statusColor: "bg-emerald-100 text-emerald-700" },
    { name: "Ayşe Çelik", time: "15:30", service: "Diş Temizliği", status: "Bekliyor", statusColor: "bg-orange-100 text-orange-700" },
    { name: "Ali Kılıç", time: "16:00", service: "İmplant Konsültasyon", status: "Onaylandı", statusColor: "bg-emerald-100 text-emerald-700" },
  ];
  return (
    <div className="rounded-xl border border-gray-100 bg-white">
      <div className="border-b border-gray-50 px-4 py-3">
        <p className="text-xs font-semibold text-gray-500">Bugünün Randevuları</p>
      </div>
      <div className="divide-y divide-gray-50">
        {appointments.map((a) => (
          <div key={a.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-bold text-[#6366F1]">
                {a.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{a.name}</p>
                <p className="text-[11px] text-gray-400">{a.service}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500">{a.time}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${a.statusColor}`}>
                {a.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardFinance() {
  return (
    <div>
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Gelir", target: 48500, color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp },
          { label: "Gider", target: 12300, color: "text-red-600", bg: "bg-red-50", icon: TrendingDown },
          { label: "Net Kâr", target: 36200, color: "text-[#6366F1]", bg: "bg-[#EEF2FF]", icon: DollarSign },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <div className={`mx-auto mb-2 inline-flex rounded-lg p-2 ${s.bg}`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-lg font-bold text-gray-900">
                <AnimatedNumber target={s.target} prefix="₺" />
              </p>
              <p className="text-[11px] text-gray-400">{s.label}</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="border-b border-gray-50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500">Son İşlemler</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { desc: "Diş Dolgusu - Ahmet Y.", amount: "+₺1.200", positive: true },
            { desc: "Malzeme Alımı", amount: "-₺450", positive: false },
            { desc: "Kanal Tedavisi - Fatma K.", amount: "+₺2.800", positive: true },
            { desc: "Kira Ödemesi", amount: "-₺5.000", positive: false },
          ].map((t) => (
            <div key={t.desc} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700">{t.desc}</span>
              <span className={`text-sm font-semibold ${t.positive ? "text-emerald-600" : "text-red-500"}`}>
                {t.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardStock() {
  const products = [
    { name: "Kompozit Dolgu Malz.", stock: 5, min: 10, status: "critical" },
    { name: "Anestezi İğnesi", stock: 120, min: 50, status: "ok" },
    { name: "Latex Eldiven (Kutu)", stock: 8, min: 15, status: "critical" },
    { name: "Sterilizasyon Poşeti", stock: 200, min: 100, status: "ok" },
    { name: "Porselen Kron", stock: 3, min: 5, status: "critical" },
  ];
  return (
    <div className="rounded-xl border border-gray-100 bg-white">
      <div className="border-b border-gray-50 px-4 py-3">
        <p className="text-xs font-semibold text-gray-500">Stok Durumu</p>
      </div>
      <div className="divide-y divide-gray-50">
        {products.map((p) => (
          <div key={p.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Package className={`h-4 w-4 ${p.status === "critical" ? "text-red-500" : "text-gray-400"}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <p className="text-[11px] text-gray-400">Min: {p.min} adet</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">{p.stock} adet</span>
              {p.status === "critical" && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  Düşük
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardCustomers() {
  const customers = [
    { name: "Ahmet Yılmaz", lastVisit: "10 Mar 2026", total: "₺4.800", visits: 12, color: "bg-[#6366F1]" },
    { name: "Fatma Kaya", lastVisit: "8 Mar 2026", total: "₺3.200", visits: 8, color: "bg-emerald-500" },
    { name: "Mehmet Demir", lastVisit: "5 Mar 2026", total: "₺6.100", visits: 15, color: "bg-purple-500" },
    { name: "Ayşe Çelik", lastVisit: "3 Mar 2026", total: "₺2.400", visits: 6, color: "bg-orange-500" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {customers.map((c) => (
        <div key={c.name} className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.color} text-xs font-bold text-white`}>
              {c.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{c.name}</p>
              <p className="text-[11px] text-gray-400">Son ziyaret: {c.lastVisit}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{c.visits} ziyaret</span>
            <span className="font-semibold text-gray-700">Toplam: {c.total}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardEmployees() {
  const employees = [
    { name: "Dr. Elif Şahin", role: "Diş Hekimi", commission: "₺12.400", color: "bg-[#6366F1]" },
    { name: "Selin Aydın", role: "Hijyenist", commission: "₺4.200", color: "bg-emerald-500" },
    { name: "Burak Erdoğan", role: "Asistan", commission: "₺2.800", color: "bg-purple-500" },
    { name: "Derya Yılmaz", role: "Sekreter", commission: "₺1.500", color: "bg-orange-500" },
  ];
  return (
    <div className="rounded-xl border border-gray-100 bg-white">
      <div className="border-b border-gray-50 px-4 py-3">
        <p className="text-xs font-semibold text-gray-500">Personel Listesi</p>
      </div>
      <div className="divide-y divide-gray-50">
        {employees.map((e) => (
          <div key={e.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${e.color} text-xs font-bold text-white`}>
                {e.name.replace("Dr. ", "").split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{e.name}</p>
                <p className="text-[11px] text-gray-400">{e.role}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">{e.commission}</p>
              <p className="text-[10px] text-gray-400">Bu ay komisyon</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════ PAGE ══════════════════════════════ */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [tabHovered, setTabHovered] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroHovered, setHeroHovered] = useState(false);

  /* ── Inline onboarding state ── */
  const [obStep, setObStep] = useState(0); // 0=sector, 1=team, 2=pain, 3=analysis, 4=package
  const [obDirection, setObDirection] = useState(1);
  const [, setObSessionId] = useState<string | null>(null);
  const [obSector, setObSector] = useState<string | null>(null);
  const [obSectorCustom, setObSectorCustom] = useState("");
  const [obTeamSize, setObTeamSize] = useState<string | null>(null);
  const [obPainPoints, setObPainPoints] = useState<Set<string>>(new Set());
  const [obAnalysis, setObAnalysis] = useState<AnalysisResult | null>(null);
  const [obSelected, setObSelected] = useState<Set<string>>(new Set());
  const [obAnalyzing, setObAnalyzing] = useState(false);
  const [obError, setObError] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const obSessionIdRef = useRef<string | null>(null);

  const obStarted = obStep > 0 || obSector !== null;

  async function obFireUpdate(data: Record<string, unknown>) {
    const sid = obSessionIdRef.current;
    if (!sid) return;
    try {
      await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, ...data }),
      });
    } catch (err) {
      console.error("[obFireUpdate]", err);
    }
  }

  function obGoNext() { setObDirection(1); setObStep((s) => s + 1); }
  function obGoBack() { setObDirection(-1); setObStep((s) => Math.max(0, s - 1)); }

  async function startSession(): Promise<string | null> {
    if (obSessionIdRef.current) return obSessionIdRef.current;
    try {
      const res = await fetch("/api/onboarding/start", { method: "POST" });
      if (!res.ok) throw new Error("Oturum başlatılamadı");
      const d = await res.json();
      if (d.sessionId) {
        obSessionIdRef.current = d.sessionId;
        setObSessionId(d.sessionId);
        return d.sessionId;
      }
      return null;
    } catch (err) {
      console.error("[startSession]", err);
      return null;
    }
  }

  // Navigation is instant — no backend dependency for steps 0-2
  function handleSectorSelect(id: string) {
    setObSector(id);
    setObError(null);
    if (id !== "other") {
      setObDirection(1);
      setObStep(1);
      heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleSectorCustomSubmit() {
    if (!obSectorCustom.trim()) return;
    setObDirection(1);
    setObStep(1);
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleTeamSelect(id: string) {
    setObTeamSize(id);
    obGoNext();
  }

  function togglePain(id: string) {
    setObPainPoints((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleAnalyze() {
    if (obPainPoints.size === 0) return;
    setObError(null);
    setObAnalyzing(true);

    try {
      // Create session + save all collected data in one go
      const sid = await startSession();
      if (!sid) {
        throw new Error("Oturum başlatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
      }

      // Send all profile data before analyze
      await obFireUpdate({
        sector: obSector === "other" ? "other" : obSector,
        sectorCustom: obSector === "other" ? obSectorCustom.trim() : undefined,
        teamSize: obTeamSize,
        painPoints: Array.from(obPainPoints),
      });

      const res = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Analiz başarısız (${res.status})`);
      }

      const data: AnalysisResult = await res.json();

      if (!data.recommendedModules?.length) {
        throw new Error("Modül önerisi alınamadı");
      }

      setObAnalysis(data);
      setObSelected(new Set(data.recommendedModules.map((m) => m.slug)));
      // Success — now move to step 3
      setObDirection(1);
      setObStep(3);
    } catch (err) {
      console.error("[handleAnalyze]", err);
      const msg = err instanceof Error ? err.message : "Analiz sırasında bir hata oluştu.";
      setObError(msg);
    } finally {
      setObAnalyzing(false);
    }
  }

  function toggleModule(slug: string) {
    setObSelected((prev) => {
      const n = new Set(prev);
      if (n.has(slug)) n.delete(slug); else n.add(slug);
      return n;
    });
  }

  async function handleComplete() {
    const sid = obSessionIdRef.current;
    if (!sid) return;
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, selectedModules: Array.from(obSelected) }),
      });
      sessionStorage.setItem("onboardingProfileSessionId", sid);
      window.location.href = "/register";
    } catch (err) {
      console.error("[handleComplete]", err);
    }
  }

  const obTotalPrice = obAnalysis
    ? [...obAnalysis.recommendedModules, ...obAnalysis.upsellModules]
        .filter((m) => obSelected.has(m.slug))
        .reduce((sum, m) => sum + m.basePrice, 0)
    : 0;

  const obSelectedList = obAnalysis
    ? [...obAnalysis.recommendedModules, ...obAnalysis.upsellModules].filter((m) => obSelected.has(m.slug))
    : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-rotate hero slides every 5s
  useEffect(() => {
    const id = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Auto-rotate dashboard tabs every 3s, pause on hover
  useEffect(() => {
    if (tabHovered) return;
    const id = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % dashboardTabs.length);
    }, 3000);
    return () => clearInterval(id);
  }, [tabHovered, activeTab]);

  return (
    <div className="min-h-screen bg-white">
      <SoftwareApplicationJsonLd />
      <FAQJsonLd
        items={FAQ_ITEMS.map(f => ({ question: f.q, answer: f.a }))}
      />
      {/* ════════════════════════ NAVBAR ════════════════════════ */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-gray-200 bg-white/80 shadow-sm backdrop-blur-xl"
            : "bg-white/80 backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link href="/">
            <PobySVG className="h-7 sm:h-9 w-auto" />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[13px] font-medium uppercase tracking-wider text-[#1A1A2E] transition-colors hover:text-[#6366F1]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-lg border-2 border-[#6366F1] px-5 py-2.5 text-[13px] font-bold uppercase tracking-wider text-[#6366F1] transition-all hover:bg-[#6366F1] hover:text-white"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#6366F1] px-5 py-2.5 text-[13px] font-bold uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 hover:bg-[#4F46E5] hover:shadow-lg hover:shadow-[#6366F1]/30"
            >
              Kayıt Ol
            </Link>
          </div>

          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-gray-200 bg-white px-6 py-4 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-gray-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/login" className="text-sm font-semibold text-gray-700" onClick={() => setMobileMenuOpen(false)}>
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-[#6366F1] px-6 py-2.5 text-sm font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kayıt Ol
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ════════════════════════ HERO SLIDER ════════════════════════ */}
      <section
        className="relative h-[500px] sm:h-[600px] lg:h-[680px] overflow-hidden pt-20"
      >
        {/* Slides */}
        <AnimatePresence mode="wait">
          {[
            {
              key: "slide-0",
              image: "/images/hero-slide-1.png",
              title: <>AI Destekli<br /><span className="text-[#6366F1]">Akıllı Yönetim</span></>,
              desc: "Yapay zeka ile stok analizi, tedarik zinciri tahmini ve akıllı alarm sistemi.",
              cta: { label: "Hemen Başla", href: "/register" },
              cta2: { label: "Demo Gör", href: "#dashboard-preview" },
            },
            {
              key: "slide-1",
              image: "/images/hero-slide-2.png",
              title: <>Finanstan Stoka<br /><span className="text-[#6366F1]">Tek Platform</span></>,
              desc: "Gelir-gider takibi, faturalama, çalışan yönetimi ve 12+ modül tek ekranda.",
              cta: { label: "Tüm Özellikleri Keşfet", href: "/ozellikler" },
            },
            {
              key: "slide-2",
              image: "/images/hero-slide-3.png",
              title: <>Randevu & Müşteri<br /><span className="text-[#6366F1]">Yönetimi</span></>,
              desc: "Renk kodlu takvim, müşteri takibi, otomatik hatırlatmalar ve onam formları.",
              cta: { label: "Ücretsiz Deneyin", href: "/register" },
            },
          ].map((slide, idx) =>
            heroSlide === idx && (
              <motion.div
                key={slide.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0"
              >
                {/* Full background image */}
                <img
                  src={slide.image}
                  alt={`Poby ${slide.key}`}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent sm:from-white/90 sm:via-white/50" />

                {/* Text content — sol tarafta */}
                <div className="relative h-full flex items-center">
                  <div className="mx-auto w-full max-w-[1200px] px-6">
                    <div className="max-w-md lg:max-w-lg">
                      <h1 className="mb-4 text-[clamp(24px,4vw,46px)] font-extrabold leading-[1.15] text-[#1A1A2E]">
                        {slide.title}
                      </h1>
                      <p className="mb-6 text-sm sm:text-base leading-relaxed text-[#6C7293]">
                        {slide.desc}
                      </p>
                      <div className="flex gap-3">
                        <Link href={slide.cta.href} className="rounded-xl bg-[#6366F1] px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#4F46E5] hover:shadow-lg hover:shadow-[#6366F1]/25">
                          {slide.cta.label}
                        </Link>
                        {slide.cta2 && (
                          <Link href={slide.cta2.href} className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[#1A1A2E] transition-all hover:-translate-y-0.5 hover:shadow-md">
                            {slide.cta2.label}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Slider indicator dots (no interaction, just visual) */}
        <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-500 ${
                heroSlide === i ? "w-8 bg-[#6366F1]" : "w-2 bg-[#6366F1]/20"
              }`}
            />
          ))}
        </div>
      </section>

      {/* ════════════════════════ ONBOARDING SECTION ════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden px-6 py-20 bg-[#F4F6FA]">
        <div className="relative z-20 mx-auto w-full max-w-[900px] text-center">
          {/* ── Title area — compacts after step 0 ── */}
          <motion.div
            animate={obStarted ? { marginBottom: 24 } : { marginBottom: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-4 text-[clamp(24px,4vw,42px)] font-extrabold uppercase tracking-wider leading-tight text-[#1A1A2E]"
            >
              {obStarted ? (
                <>
                  Kişisel AI Asistanınız{" "}
                  <span className="text-[#6366F1]">Poby</span>
                </>
              ) : (
                <>
                  Size Özel Platformu{" "}
                  <span className="text-[#6366F1]">Kuralım</span>
                </>
              )}
            </motion.h2>

            <AnimatePresence mode="wait">
              {!obStarted ? (
                <motion.p
                  key="hero-sub"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="mx-auto mb-8 max-w-[600px] text-lg leading-relaxed text-[#6C7293]"
                >
                  Sektörünüzü seçin, ihtiyaçlarınızı belirleyin — size özel modülleri önerelim.
                </motion.p>
              ) : null}
            </AnimatePresence>
          </motion.div>

          {/* ── Progress dots (visible after step 0) ── */}
          <AnimatePresence>
            {obStarted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 flex items-center justify-center gap-2"
              >
                {obStep > 0 && (
                  <button
                    onClick={obGoBack}
                    className="mr-3 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-500 backdrop-blur-sm transition-all hover:border-gray-300 hover:text-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === obStep ? "w-7 bg-[#6366F1]" : i < obStep ? "w-2 bg-[#818CF8]" : "w-2 bg-gray-300/60"
                    }`}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Inline onboarding steps ── */}
          <AnimatePresence mode="wait" custom={obDirection}>
            {/* ── STEP 0: Sector selection ── */}
            {obStep === 0 && (
              <motion.div
                key="ob-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -200 }}
                transition={{ duration: 0.4, delay: obStarted ? 0 : 0.8 }}
              >
                <p className="mb-6 text-[15px] font-medium text-gray-500">
                  Sektörünüzü seçin, size özel platformu kuralım
                </p>

                <div className="mx-auto grid max-w-[560px] grid-cols-2 gap-3 sm:grid-cols-3">
                  {SECTOR_OPTIONS.filter((s) => s.id !== "other").map((s) => (
                    <motion.button
                      key={s.id}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSectorSelect(s.id)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 bg-white/80 p-5 backdrop-blur-sm transition-all hover:border-[#818CF8] hover:shadow-lg hover:shadow-[#6366F1]/10 ${
                        obSector === s.id ? "border-[#6366F1] bg-[#EEF2FF]/80 shadow-lg shadow-[#6366F1]/10" : "border-gray-200/80"
                      }`}
                    >
                      <span className="text-3xl">{s.emoji}</span>
                      <span className="text-sm font-semibold text-gray-800">{s.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* "Diğer" — full width below */}
                <div className="mx-auto mt-3 max-w-[560px]">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSectorSelect("other")}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 bg-white/80 p-4 backdrop-blur-sm transition-all hover:border-[#818CF8] ${
                      obSector === "other" ? "border-[#6366F1] bg-[#EEF2FF]/80" : "border-gray-200/80"
                    }`}
                  >
                    <span className="text-xl">✏️</span>
                    <span className="text-sm font-semibold text-gray-800">Diğer</span>
                  </motion.button>

                  <AnimatePresence>
                    {obSector === "other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 flex gap-2 overflow-hidden"
                      >
                        <input
                          value={obSectorCustom}
                          onChange={(e) => setObSectorCustom(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSectorCustomSubmit()}
                          placeholder="Sektörünüzü yazın..."
                          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                          autoFocus
                        />
                        <button
                          onClick={handleSectorCustomSubmit}
                          disabled={!obSectorCustom.trim()}
                          className="rounded-xl bg-[#6366F1] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#4F46E5] disabled:opacity-40"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: Team size ── */}
            {obStep === 1 && (
              <motion.div
                key="ob-1"
                custom={obDirection}
                initial={{ opacity: 0, x: obDirection > 0 ? 200 : -200 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: obDirection < 0 ? 200 : -200 }}
                transition={{ duration: 0.35 }}
              >
                <h3 className="mb-2 text-xl font-bold text-gray-900">Ekibiniz kaç kişi?</h3>
                <p className="mb-6 text-sm text-gray-500">Ekip büyüklüğünüze göre çözüm öneriyoruz</p>
                <div className="mx-auto flex max-w-[480px] flex-col gap-3 sm:flex-row">
                  {TEAM_SIZE_OPTIONS.map((t) => (
                    <motion.button
                      key={t.id}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleTeamSelect(t.id)}
                      className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-[#818CF8] hover:shadow-lg hover:shadow-[#6366F1]/10 ${
                        obTeamSize === t.id ? "border-[#6366F1] bg-[#EEF2FF]/80" : "border-gray-200/80"
                      }`}
                    >
                      <span className="text-4xl">{t.emoji}</span>
                      <span className="text-base font-semibold text-gray-800">{t.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Pain points ── */}
            {obStep === 2 && (
              <motion.div
                key="ob-2"
                custom={obDirection}
                initial={{ opacity: 0, x: obDirection > 0 ? 200 : -200 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: obDirection < 0 ? 200 : -200 }}
                transition={{ duration: 0.35 }}
              >
                <h3 className="mb-2 text-xl font-bold text-gray-900">En çok hangi konuda zorlanıyorsunuz?</h3>
                <p className="mb-6 text-sm text-gray-500">Birden fazla seçebilirsiniz</p>
                <div className="mx-auto flex max-w-[520px] flex-wrap justify-center gap-2.5">
                  {PAIN_POINT_OPTIONS.map((p) => {
                    const PainIcon = ICON_MAP[p.icon] || Bot;
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePain(p.id)}
                        disabled={obAnalyzing}
                        className={`inline-flex items-center gap-2 rounded-full border-2 bg-white/80 px-5 py-3 text-sm font-medium backdrop-blur-sm transition-all disabled:opacity-50 ${
                          obPainPoints.has(p.id)
                            ? "border-[#6366F1] bg-[#EEF2FF]/80 text-[#4F46E5] shadow-md shadow-[#6366F1]/10"
                            : "border-gray-200/80 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <PainIcon className="h-4 w-4" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                {obError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-sm font-medium text-red-600"
                  >
                    {obError}
                  </motion.p>
                )}
                <motion.button
                  whileHover={!obAnalyzing ? { scale: 1.02 } : {}}
                  whileTap={!obAnalyzing ? { scale: 0.98 } : {}}
                  onClick={handleAnalyze}
                  disabled={obPainPoints.size === 0 || obAnalyzing}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#6366F1] px-10 py-4 text-[15px] font-semibold text-white transition-all hover:bg-[#4F46E5] hover:shadow-xl hover:shadow-[#6366F1]/30 disabled:opacity-40"
                >
                  {obAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analiz ediliyor...
                    </>
                  ) : (
                    <>
                      Analiz Et
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* ── STEP 3: Analysis results ── */}
            {obStep === 3 && (
              <motion.div
                key="ob-3"
                custom={obDirection}
                initial={{ opacity: 0, x: obDirection > 0 ? 200 : -200 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: obDirection < 0 ? 200 : -200 }}
                transition={{ duration: 0.35 }}
                className="mx-auto max-w-[600px] text-left"
              >
                {obAnalysis ? (
                  <>
                    <div className="mb-5 rounded-xl border border-[#818CF8]/40 bg-[#EEF2FF]/80 p-5 backdrop-blur-sm">
                      <p className="text-sm leading-relaxed text-[#5C1B0F]">{obAnalysis.customMessage}</p>
                    </div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Sizin için önerildi</span>
                    </div>
                    <div className="space-y-2.5">
                      {obAnalysis.recommendedModules.map((mod) => (
                        <HeroModuleCard key={mod.slug} mod={mod} selected={obSelected.has(mod.slug)} onToggle={() => toggleModule(mod.slug)} />
                      ))}
                    </div>
                    {obAnalysis.upsellModules.length > 0 && (
                      <>
                        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-gray-400">Keşfet</p>
                        <div className="space-y-2.5">
                          {obAnalysis.upsellModules.map((mod) => (
                            <HeroModuleCard key={mod.slug} mod={mod} selected={obSelected.has(mod.slug)} onToggle={() => toggleModule(mod.slug)} muted />
                          ))}
                        </div>
                      </>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setObDirection(1); setObStep(4); }}
                      disabled={obSelected.size === 0}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366F1] py-4 text-[15px] font-semibold text-white transition-all hover:bg-[#4F46E5] disabled:opacity-40"
                    >
                      Paketimi Oluştur
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-sm text-red-600">{obError || "Bir hata oluştu. Lütfen tekrar deneyin."}</p>
                    <button onClick={() => { setObError(null); obGoBack(); }} className="mt-3 text-sm font-medium text-[#6366F1] hover:underline">Geri Dön</button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 4: Package summary ── */}
            {obStep === 4 && (
              <motion.div
                key="ob-4"
                custom={obDirection}
                initial={{ opacity: 0, x: 200 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -200 }}
                transition={{ duration: 0.35 }}
                className="mx-auto max-w-[520px] text-left"
              >
                <h3 className="mb-1 text-center text-xl font-bold text-gray-900">Kişisel Paketiniz</h3>
                <p className="mb-6 text-center text-sm text-gray-500">{obSelected.size} modül seçildi</p>
                <div className="space-y-2">
                  {obSelectedList.map((mod) => (
                    <div key={mod.slug} className="flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white/80 p-4 backdrop-blur-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${mod.color}15` }}>
                        <ModuleIcon name={mod.icon} className="h-5 w-5" color={mod.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{mod.name}</p>
                        <p className="text-xs text-gray-500">{mod.shortDescription}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-700">₺{mod.basePrice}/ay</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-white/80 p-5 backdrop-blur-sm border border-gray-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Toplam</span>
                    <span className="text-2xl font-bold text-gray-900">₺{obTotalPrice}/ay</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">AI kredisi kullandıkça ödeyin</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleComplete}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366F1] py-4 text-[15px] font-semibold text-white transition-all hover:bg-[#4F46E5] hover:shadow-xl hover:shadow-[#6366F1]/30"
                >
                  Hemen Başla — Ücretsiz Dene
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
                <p className="mt-4 text-center text-xs text-gray-400">14 gün ücretsiz, kredi kartı gerekmez</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ════════════════════════ DASHBOARD PREVIEW ════════════════════════ */}
      <section id="dashboard-preview" className="px-6 py-24">
        <div className="mx-auto max-w-[1100px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-center"
          >
            <span className="mb-3 inline-block text-[13px] font-semibold uppercase tracking-widest text-[#6366F1]">
              Dashboard
            </span>
            <h2 className="mb-4 text-[clamp(28px,4vw,42px)] font-extrabold uppercase tracking-wider leading-tight text-[#1A1A2E]">
              İşletmenizi Tek Bakışta Yönetin
            </h2>
            <p className="mx-auto mb-10 max-w-[500px] text-base leading-relaxed text-gray-500">
              Tüm verilerinize tek panelden ulaşın, anında kararlar alın.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            style={{ perspective: "1200px" }}
          >
            <div
              className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-3 shadow-2xl shadow-black/20 transition-transform duration-700 hover:[transform:rotateX(0deg)] [transform:rotateX(3deg)]"
              onMouseEnter={() => setTabHovered(true)}
              onMouseLeave={() => setTabHovered(false)}
            >
              {/* Browser bar */}
              <div className="mb-2 flex items-center gap-2 px-3 py-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div className="ml-3 flex-1 rounded-md bg-white/5 px-3 py-1.5 text-center text-xs text-gray-400">
                  poby.ai/dashboard
                </div>
              </div>

              {/* Dashboard container */}
              <div className="overflow-hidden rounded-lg bg-gray-50">
                {/* Tabs */}
                <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-4">
                  {dashboardTabs.map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(i)}
                      className={`relative whitespace-nowrap px-4 py-3 text-[13px] font-medium transition-colors ${
                        activeTab === i
                          ? "text-[#6366F1]"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab}
                      {activeTab === i && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-x-0 bottom-0 h-0.5 bg-[#6366F1]"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {activeTab === 0 && <DashboardOverview />}
                      {activeTab === 1 && <DashboardAppointments />}
                      {activeTab === 2 && <DashboardFinance />}
                      {activeTab === 3 && <DashboardStock />}
                      {activeTab === 4 && <DashboardCustomers />}
                      {activeTab === 5 && <DashboardEmployees />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ TWEET SLIDER ════════════════════════ */}
      <section id="reviews" className="overflow-hidden bg-[#1E1E2D] py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center px-6"
        >
          <span className="mb-3 inline-block text-[13px] font-bold uppercase tracking-widest text-[#6366F1]">
            Yorumlar
          </span>
          <h2 className="mb-4 text-[clamp(28px,4vw,42px)] font-extrabold uppercase tracking-wider leading-tight text-white">
            İşletme Sahipleri Poby&apos;yi Seviyor
          </h2>
          <p className="mx-auto max-w-[500px] text-base leading-relaxed text-[#8E8EA0]">
            Türkiye genelinde yüzlerce işletme Poby ile büyüyor
          </p>
        </motion.div>

        <div className="overflow-hidden">
          <div className="animate-scroll-left pause-on-hover flex w-max">
            {[...tweets, ...tweets].map((tweet, i) => (
              <TweetCard key={`t-${i}`} tweet={tweet} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ MODULES ════════════════════════ */}
      <section id="modules" className="px-6 py-24">
        <div className="mx-auto max-w-[1100px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <span className="mb-3 inline-block text-[13px] font-semibold uppercase tracking-widest text-[#6366F1]">
              Modüller
            </span>
            <h2 className="mb-4 text-[clamp(28px,4vw,42px)] font-extrabold uppercase tracking-wider leading-tight text-[#1A1A2E]">
              Her İhtiyacınız İçin Güçlü Modüller
            </h2>
            <p className="mx-auto max-w-[550px] text-base leading-relaxed text-gray-500">
              İşletmenizin tüm ihtiyaçlarını karşılayan kapsamlı modül yelpazesi.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {modules.map((mod, i) => (
              <motion.div
                key={mod.title}
                variants={fadeUp}
                custom={i}
                className="group cursor-default rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#818CF8] hover:shadow-lg hover:shadow-[#6366F1]/[0.06]"
              >
                <span className="mb-4 block text-3xl">{mod.icon}</span>
                <h3 className="mb-2 text-[15px] font-bold text-gray-900">{mod.title}</h3>
                <p className="text-[13px] leading-relaxed text-gray-500">{mod.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ FAQ ════════════════════════ */}
      <FaqSection />

      {/* ════════════════════════ CONTACT ════════════════════════ */}
      <ContactSection />

      {/* ════════════════════════ CTA ════════════════════════ */}
      <section className="relative overflow-hidden px-6 py-28">
        <div
          className="animate-gradient pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 25%, #818CF8 50%, #6366F1 75%, #4F46E5 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-[600px] text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-[clamp(28px,4vw,48px)] font-extrabold uppercase tracking-wider text-white"
          >
            Hemen Başlayın
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-10 max-w-[480px] text-[17px] leading-relaxed text-white/70"
          >
            İlk ay ücretsiz, kredi kartı gerekmez. Hemen başlayın ve farkı görün.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-base font-semibold text-[#6366F1] transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
            >
              Ücretsiz Hesap Oluştur
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ FOOTER ════════════════════════ */}
      <footer className="bg-[#16162A] px-6 pb-8 pt-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <Link href="/">
                <PobySVG inverted className="h-7 w-auto" />
              </Link>
              <p className="mt-3 max-w-[280px] text-[13px] leading-relaxed text-[#6C7293]">
                İşletmenizin cebindeki akıllı asistan. Tüm operasyonlarınızı tek
                panelden yönetin.
              </p>
              <div className="mt-5 space-y-2.5">
                <h5 className="text-[13px] font-bold uppercase tracking-wider text-white">İletişim</h5>
                <a href="mailto:destek@poby.ai" className="flex items-center gap-2 text-[13px] text-[#6C7293] transition-colors hover:text-[#6366F1]">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  destek@poby.ai
                </a>
                <a href="tel:+905301529356" className="flex items-center gap-2 text-[13px] text-[#6C7293] transition-colors hover:text-[#6366F1]">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  0530 152 93 56
                </a>
                <div className="flex items-start gap-2 text-[13px] text-[#6C7293]">
                  <svg className="h-3.5 w-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  19 Mayıs Mah. Şakacı Sok. No:98E Kadıköy/İstanbul
                </div>
              </div>
            </div>
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h5 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white">
                  {title}
                </h5>
                <ul className="space-y-2.5">
                  {(links as Array<{ label: string; href: string }>).map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-[13px] text-[#6C7293] transition-colors hover:text-[#6366F1]">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-center">
            <p className="text-xs text-[#6C7293]">&copy; 2026 Poby. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ══════════════════════════════ FAQ SECTION ══════════════════════════════ */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-[#6366F1]"
      >
        <span className="pr-4 text-[15px] font-medium text-[#1A1A2E]">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6C7293] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[14px] leading-relaxed text-[#6C7293]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="bg-[#F9FAFB] px-6 py-24">
      <div className="mx-auto max-w-[760px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block rounded-full bg-[#EEF2FF] px-4 py-1.5 text-[12px] font-semibold text-[#6366F1] mb-4">
            SSS
          </span>
          <h2 className="text-[clamp(24px,3.5vw,36px)] font-bold text-[#1A1A2E]">
            Sıkça Sorulan Sorular
          </h2>
          <p className="mt-3 text-[15px] text-[#6C7293]">
            Merak ettiğiniz her şeyin cevabı burada
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-gray-100 bg-white px-6 sm:px-8"
        >
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════ CONTACT SECTION ══════════════════════════════ */

function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="px-6 py-24">
      <div className="mx-auto max-w-[900px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block rounded-full bg-[#EEF2FF] px-4 py-1.5 text-[12px] font-semibold text-[#6366F1] mb-4">
            İletişim
          </span>
          <h2 className="text-[clamp(24px,3.5vw,36px)] font-bold text-[#1A1A2E]">
            Bize Ulaşın
          </h2>
          <p className="mt-3 text-[15px] text-[#6C7293]">
            Sorularınız mı var? Size yardımcı olmaktan mutluluk duyarız.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="grid gap-8 lg:grid-cols-[1fr_1.2fr]"
        >
          {/* Contact Info */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF]">
                  <Mail className="h-5 w-5 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1A1A2E]">E-posta</p>
                  <a href="mailto:destek@poby.ai" className="text-[13px] text-[#6366F1] hover:underline">destek@poby.ai</a>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF]">
                  <MessageCircle className="h-5 w-5 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1A1A2E]">Telefon</p>
                  <a href="tel:+905301529356" className="text-[13px] text-[#6366F1] hover:underline">0530 152 93 56</a>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF]">
                  <Calendar className="h-5 w-5 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1A1A2E]">Destek Saatleri</p>
                  <p className="text-[13px] text-[#6C7293]">Hafta içi 09:00 – 18:00</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <Check className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A2E]">Mesajınız Gönderildi</h3>
                <p className="mt-2 text-sm text-[#6C7293]">En kısa sürede size dönüş yapacağız.</p>
                <button onClick={() => setSent(false)} className="mt-5 text-[13px] font-medium text-[#6366F1] hover:underline">
                  Yeni mesaj gönder
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">Ad Soyad</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Adınız Soyadınız"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-[#1A1A2E] transition-colors placeholder:text-gray-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">E-posta</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="ornek@email.com"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-[#1A1A2E] transition-colors placeholder:text-gray-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">Konu</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder="Nasıl yardımcı olabiliriz?"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-[#1A1A2E] transition-colors placeholder:text-gray-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#1A1A2E]">Mesajınız</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Mesajınızı buraya yazın..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-[#1A1A2E] transition-colors placeholder:text-gray-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366F1] py-3 text-sm font-semibold text-white transition-all hover:bg-[#4F46E5] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Mesaj Gönder</>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
