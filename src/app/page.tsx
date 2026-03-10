"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Users,
  Calendar,
  DollarSign,
  Package,
  Bot,
  ArrowRight,
  Menu,
  X,
  MessageCircle,
  Send,
  Check,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Heart,
  Play,
} from "lucide-react";

/* ══════════════════════════════ DATA ══════════════════════════════ */

const navLinks = [
  { href: "#features", label: "Özellikler" },
  { href: "#modules", label: "Modüller" },
  { href: "#reviews", label: "Yorumlar" },
];

const footerLinks = {
  Ürün: ["Özellikler", "Fiyatlandırma", "Entegrasyonlar"],
  Destek: ["Yardım Merkezi", "İletişim", "SSS"],
  Yasal: ["Kullanım Koşulları", "Gizlilik Politikası", "KVKK"],
};

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

/* ══════════════════════════ ONBOARDING CHAT ══════════════════════════ */

interface SuggestedModule {
  name: string;
  displayName: string;
  price: number;
  reason: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function OnboardingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestedModules, setSuggestedModules] = useState<SuggestedModule[] | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [sessionId] = useState(() => `onb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Merhaba! Ben Poby asistanı. İşletmenizi anlatır mısınız? Hangi sektörde faaliyet gösteriyorsunuz?",
        },
      ]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, sessionId }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      }
      if (data.suggestedModules) {
        setSuggestedModules(data.suggestedModules);
        const allNames = new Set<string>(data.suggestedModules.map((m: SuggestedModule) => m.name));
        setSelectedModules(allNames);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Bir hata oluştu, tekrar dener misiniz?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleModule(name: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleStartNow() {
    if (suggestedModules) {
      const selected = suggestedModules.filter((m) => selectedModules.has(m.name));
      sessionStorage.setItem("selectedModules", JSON.stringify(selected));
      sessionStorage.setItem("onboardingSessionId", sessionId);
    }
    window.location.href = "/register";
  }

  const selectedTotal = suggestedModules
    ? suggestedModules.filter((m) => selectedModules.has(m.name)).reduce((sum, m) => sum + m.price, 0)
    : 0;

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring", stiffness: 200 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" as const }}
            className="fixed bottom-24 right-6 z-[60] flex w-[380px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/10"
            style={{ height: suggestedModules ? "560px" : "480px" }}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 bg-blue-600 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Poby Asistan</p>
                <p className="text-[11px] text-blue-200">İşletmeniz için en uygun planı bulalım</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}

              {suggestedModules && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Önerilen Modüller</p>
                  {suggestedModules.map((mod) => (
                    <button
                      key={mod.name}
                      onClick={() => toggleModule(mod.name)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                        selectedModules.has(mod.name)
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          selectedModules.has(mod.name) ? "border-blue-600 bg-blue-600" : "border-gray-300"
                        }`}
                      >
                        {selectedModules.has(mod.name) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-gray-800">{mod.displayName}</span>
                          <span className="text-[13px] font-bold text-blue-600">₺{mod.price}/ay</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">{mod.reason}</p>
                      </div>
                    </button>
                  ))}

                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Toplam ({selectedModules.size} modül)</span>
                      <span className="text-lg font-bold text-gray-900">₺{selectedTotal}/ay</span>
                    </div>
                  </div>

                  <button
                    onClick={handleStartNow}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700"
                  >
                    Hemen Başla
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {!suggestedModules && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Mesajınızı yazın..."
                    disabled={loading}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ══════════════════════════ TWEET CARD ══════════════════════════ */

function TweetCard({ tweet }: { tweet: (typeof tweets)[0] }) {
  return (
    <div className="mx-3 w-[340px] shrink-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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
          { label: "Toplam Müşteri", value: "247", icon: Users, change: "+18", up: true, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Bugünün Randevuları", value: "12", icon: Calendar, change: "+3", up: true, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Aylık Gelir", value: "₺48.500", icon: TrendingUp, change: "+22%", up: true, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Stok Uyarısı", value: "3", icon: AlertTriangle, change: "Kritik", up: false, color: "text-red-600", bg: "bg-red-50" },
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
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
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
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-blue-400" style={{ height: `${h}%` }} />
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
    { name: "Fatma Kaya", time: "11:30", service: "Kontrol", status: "Bekliyor", statusColor: "bg-amber-100 text-amber-700" },
    { name: "Mehmet Demir", time: "14:00", service: "Kanal Tedavisi", status: "Onaylandı", statusColor: "bg-emerald-100 text-emerald-700" },
    { name: "Ayşe Çelik", time: "15:30", service: "Diş Temizliği", status: "Bekliyor", statusColor: "bg-amber-100 text-amber-700" },
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
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
          { label: "Gelir", value: "₺48.500", color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp },
          { label: "Gider", value: "₺12.300", color: "text-red-600", bg: "bg-red-50", icon: TrendingDown },
          { label: "Net Kâr", value: "₺36.200", color: "text-blue-600", bg: "bg-blue-50", icon: DollarSign },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 text-center">
              <div className={`mx-auto mb-2 inline-flex rounded-lg p-2 ${s.bg}`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
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
    { name: "Ahmet Yılmaz", lastVisit: "10 Mar 2026", total: "₺4.800", visits: 12, color: "bg-blue-500" },
    { name: "Fatma Kaya", lastVisit: "8 Mar 2026", total: "₺3.200", visits: 8, color: "bg-emerald-500" },
    { name: "Mehmet Demir", lastVisit: "5 Mar 2026", total: "₺6.100", visits: 15, color: "bg-purple-500" },
    { name: "Ayşe Çelik", lastVisit: "3 Mar 2026", total: "₺2.400", visits: 6, color: "bg-amber-500" },
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
    { name: "Dr. Elif Şahin", role: "Diş Hekimi", commission: "₺12.400", color: "bg-blue-500" },
    { name: "Selin Aydın", role: "Hijyenist", commission: "₺4.200", color: "bg-emerald-500" },
    { name: "Burak Erdoğan", role: "Asistan", commission: "₺2.800", color: "bg-purple-500" },
    { name: "Derya Yılmaz", role: "Sekreter", commission: "₺1.500", color: "bg-amber-500" },
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tweetsRow1 = tweets.slice(0, 25);
  const tweetsRow2 = tweets.slice(25, 50);

  return (
    <div className="min-h-screen bg-white">
      {/* ════════════════════════ NAVBAR ════════════════════════ */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-gray-200 bg-white/80 shadow-sm backdrop-blur-xl"
            : "bg-white/80 backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-blue-600">in</span>
            <span className="text-gray-800">Pobi</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-[10px] border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="rounded-[10px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30"
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
                className="inline-flex items-center justify-center rounded-[10px] bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Kayıt Ol
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pb-20 pt-32">
        {/* Animated gradient background */}
        <div
          className="animate-gradient pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 25%, #e0e7ff 50%, #dbeafe 75%, #eff6ff 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(37,99,235,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.04) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Hero content */}
        <div className="relative z-20 mx-auto max-w-[900px] text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-1.5 text-[13px] font-medium text-blue-700 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            AI destekli yeni nesil işletme yönetimi
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-6 text-[clamp(32px,5.5vw,64px)] font-extrabold leading-[1.1] tracking-[-2px] text-gray-900"
          >
            Kişisel AI Asistanınız{" "}
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Poby
            </span>
            <br />
            Her İşleminizde Yanınızda
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mx-auto mb-10 max-w-[600px] text-lg leading-relaxed text-gray-500"
          >
            Randevu, finans, stok, çalışan yönetimi ve daha fazlası — hepsi tek
            platformda, yapay zeka destekli.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
            >
              Ücretsiz Başla
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => {
                document.getElementById("dashboard-preview")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-gray-300 bg-white/80 px-8 py-4 text-[15px] font-semibold text-gray-700 backdrop-blur-sm transition-all hover:border-gray-400 hover:bg-white"
            >
              <Play className="h-4 w-4" />
              Demo İzle
            </button>
          </motion.div>
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
            <span className="mb-3 inline-block text-[13px] font-semibold uppercase tracking-widest text-blue-600">
              Dashboard
            </span>
            <h2 className="mb-4 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-tight text-gray-900">
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
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-3 shadow-2xl shadow-black/20 transition-transform duration-700 hover:[transform:rotateX(0deg)] [transform:rotateX(3deg)]">
              {/* Browser bar */}
              <div className="mb-2 flex items-center gap-2 px-3 py-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div className="ml-3 flex-1 rounded-md bg-white/5 px-3 py-1.5 text-center text-xs text-gray-400">
                  inpobi.com/dashboard
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
                          ? "text-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab}
                      {activeTab === i && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600"
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
      <section id="reviews" className="overflow-hidden bg-gray-50 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center px-6"
        >
          <span className="mb-3 inline-block text-[13px] font-semibold uppercase tracking-widest text-blue-600">
            Yorumlar
          </span>
          <h2 className="mb-4 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-tight text-gray-900">
            İşletme Sahipleri Poby&apos;yi Seviyor
          </h2>
          <p className="mx-auto max-w-[500px] text-base leading-relaxed text-gray-500">
            Türkiye genelinde yüzlerce işletme Poby ile büyüyor
          </p>
        </motion.div>

        {/* Row 1 — scrolls left */}
        <div className="mb-6 overflow-hidden">
          <div className="animate-scroll-left pause-on-hover flex w-max">
            {[...tweetsRow1, ...tweetsRow1].map((tweet, i) => (
              <TweetCard key={`r1-${i}`} tweet={tweet} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="overflow-hidden">
          <div className="animate-scroll-right pause-on-hover flex w-max">
            {[...tweetsRow2, ...tweetsRow2].map((tweet, i) => (
              <TweetCard key={`r2-${i}`} tweet={tweet} />
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
            <span className="mb-3 inline-block text-[13px] font-semibold uppercase tracking-widest text-blue-600">
              Modüller
            </span>
            <h2 className="mb-4 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-tight text-gray-900">
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
                className="group cursor-default rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/[0.06]"
              >
                <span className="mb-4 block text-3xl">{mod.icon}</span>
                <h3 className="mb-2 text-[15px] font-bold text-gray-900">{mod.title}</h3>
                <p className="text-[13px] leading-relaxed text-gray-500">{mod.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ CTA ════════════════════════ */}
      <section className="relative overflow-hidden px-6 py-28">
        <div
          className="animate-gradient pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 25%, #3b82f6 50%, #2563eb 75%, #1d4ed8 100%)",
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
            className="mb-4 text-[clamp(28px,4vw,48px)] font-extrabold tracking-[-1.5px] text-white"
          >
            Hemen Başlayın
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-10 max-w-[480px] text-[17px] leading-relaxed text-blue-100"
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
              className="inline-flex items-center gap-2 rounded-[14px] bg-white px-10 py-4 text-base font-semibold text-blue-600 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
            >
              Ücretsiz Hesap Oluştur
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ FOOTER ════════════════════════ */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 pb-8 pt-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="text-xl font-extrabold">
                <span className="text-blue-600">in</span>
                <span className="text-gray-800">Pobi</span>
              </Link>
              <p className="mt-3 max-w-[280px] text-[13px] leading-relaxed text-gray-500">
                İşletmenizin cebindeki akıllı asistan. Tüm operasyonlarınızı tek
                panelden yönetin.
              </p>
            </div>
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h5 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  {title}
                </h5>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-[13px] text-gray-500 transition-colors hover:text-blue-600">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center">
            <p className="text-xs text-gray-400">&copy; 2026 inPobi. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>

      {/* AI Onboarding Chat */}
      <OnboardingChat />
    </div>
  );
}
