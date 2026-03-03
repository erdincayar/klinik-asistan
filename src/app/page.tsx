"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useAnimation, AnimatePresence } from "framer-motion";
import {
  Users,
  Calendar,
  DollarSign,
  FileText,
  Package,
  Bot,
  ArrowRight,
  BarChart3,
  Settings,
  Menu,
  X,
  MessageCircle,
  Send,
  Check,
  Loader2,
} from "lucide-react";

/* ──────────────────────────── DATA ──────────────────────────── */

const navLinks = [
  { href: "#features", label: "Özellikler" },
  { href: "#sectors", label: "Sektörler" },
  { href: "#", label: "Fiyatlandırma" },
  { href: "#", label: "Destek" },
];

const features = [
  {
    icon: Users,
    title: "Müşteri Yönetimi",
    description:
      "Müşteri kayıtlarını detaylı profiller ile yönetin. Geçmiş işlemler, notlar ve iletişim bilgileri tek yerde.",
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  {
    icon: Calendar,
    title: "Randevu Sistemi",
    description:
      "Akıllı takvim ile randevuları kolayca planlayın. Otomatik hatırlatmalar ve müsait slot yönetimi.",
    bg: "bg-emerald-50",
    color: "text-emerald-600",
  },
  {
    icon: DollarSign,
    title: "Finansal Takip",
    description:
      "Gelir ve giderlerinizi kategorize edin, detaylı raporlar alın. Aylık, haftalık ve günlük analizler.",
    bg: "bg-amber-50",
    color: "text-amber-600",
  },
  {
    icon: FileText,
    title: "e-Fatura Sistemi",
    description:
      "Profesyonel faturaları saniyeler içinde oluşturun. PDF export, e-posta ile gönderim ve arşivleme.",
    bg: "bg-pink-50",
    color: "text-pink-600",
  },
  {
    icon: Package,
    title: "Stok Yönetimi",
    description:
      "Ürün ve malzeme stoklarınızı takip edin. Düşük stok uyarıları, hareket geçmişi ve raporlama.",
    bg: "bg-purple-50",
    color: "text-purple-600",
  },
  {
    icon: Bot,
    title: "AI Asistan",
    description:
      "Yapay zekâ destekli akıllı asistan ile raporlar oluşturun, analizler yapın ve operasyonlarınızı optimize edin.",
    bg: "bg-sky-50",
    color: "text-sky-600",
  },
];

const sectors = [
  { emoji: "🩺", title: "Sağlık", desc: "Klinik, muayenehane, diş hekimliği" },
  { emoji: "🍴", title: "Restoran", desc: "Kafe, restoran, yemek servisi" },
  { emoji: "✂️", title: "Güzellik", desc: "Kuaför, güzellik merkezi, SPA" },
  { emoji: "🏨", title: "Otel", desc: "Otel, pansiyon, apart" },
];

const stats = [
  { target: 500, label: "Aktif İşletme", suffix: "+" },
  { target: 50, label: "İşlem / Ay", suffix: "K+" },
  { target: 99.9, label: "Uptime", suffix: "%" },
  { target: 4, label: "Sektör Desteği", suffix: "+" },
];

const sidebarItems = [
  { icon: BarChart3, label: "Dashboard", active: true },
  { icon: Users, label: "Müşteriler", active: false },
  { icon: Calendar, label: "Randevular", active: false },
  { icon: DollarSign, label: "Finans", active: false },
  { icon: FileText, label: "Faturalar", active: false },
  { icon: Package, label: "Stok", active: false },
  { icon: Bot, label: "AI Asistan", active: false },
  { icon: Settings, label: "Ayarlar", active: false },
];

const chartHeights = [45, 65, 35, 80, 55, 90, 70, 50, 75, 60, 85, 95];

const footerLinks = {
  Ürün: ["Özellikler", "Fiyatlandırma", "Entegrasyonlar"],
  Destek: ["Yardım Merkezi", "İletişim", "SSS"],
  Yasal: ["Kullanım Koşulları", "Gizlilik Politikası", "KVKK"],
};

/* ──────────────────────────── HELPERS ──────────────────────────── */

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
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedCounter({
  target,
  suffix,
}: {
  target: number;
  suffix: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const increment = target / 60;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setValue(current);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  const display =
    target >= 50 && target < 100
      ? `${Math.floor(value)}${value >= target ? suffix : ""}`
      : target === 99.9
        ? `${value >= target ? "99.9" : value.toFixed(1)}${suffix}`
        : `${Math.floor(value)}${value >= target ? suffix : ""}`;

  return <span ref={ref}>{display}</span>;
}

/* ──────────────────────── MODULE SUGGESTION ──────────────────────── */

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
          content: "Merhaba! Ben inPobi asistanı. İşletmenizi anlatır mısınız? Hangi sektörde faaliyet gösteriyorsunuz?",
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
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring", stiffness: 200 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      {/* Chat window */}
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
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 bg-blue-600 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">inPobi Asistan</p>
                <p className="text-[11px] text-blue-200">İşletmeniz için en uygun planı bulalım</p>
              </div>
            </div>

            {/* Messages */}
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

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}

              {/* Module suggestions */}
              {suggestedModules && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pt-2"
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Önerilen Modüller
                  </p>
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
                          selectedModules.has(mod.name)
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedModules.has(mod.name) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-gray-800">
                            {mod.displayName}
                          </span>
                          <span className="text-[13px] font-bold text-blue-600">
                            ₺{mod.price}/ay
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">
                          {mod.reason}
                        </p>
                      </div>
                    </button>
                  ))}

                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        Toplam ({selectedModules.size} modül)
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        ₺{selectedTotal}/ay
                      </span>
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

            {/* Input */}
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
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
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

/* ──────────────────────────── COMPONENT ──────────────────────────── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const previewControls = useAnimation();
  const previewRef = useRef(null);
  const previewInView = useInView(previewRef, { once: true, margin: "-100px" });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (previewInView) {
      previewControls.start({ opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } });
    }
  }, [previewInView, previewControls]);

  return (
    <div className="min-h-screen bg-white">
      {/* ════════════ NAVBAR ════════════ */}
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

          {/* Desktop links */}
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
              className="inline-flex items-center gap-2 rounded-[10px] bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30"
            >
              Giriş Yap
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
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
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Giriş Yap
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ════════════ HERO ════════════ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pb-20 pt-32">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,#dbeafe_0%,transparent_70%)]" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating cards */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="absolute left-[5%] top-[25%] z-10 hidden items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-lg shadow-black/[0.04] lg:flex"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-emerald-50 text-lg">
            ✔
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">12 randevu</p>
            <p className="text-xs text-gray-400">bugün tamamlandı</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="absolute right-[5%] top-[20%] z-10 hidden items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-lg shadow-black/[0.04] lg:flex"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-blue-50 text-lg">
            📊
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">+34% gelir</p>
            <p className="text-xs text-gray-400">bu ay arttı</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="absolute bottom-[25%] left-[8%] z-10 hidden items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-lg shadow-black/[0.04] lg:flex"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-amber-50 text-lg">
            📦
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Stok uyarısı</p>
            <p className="text-xs text-gray-400">3 ürün azaldı</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="absolute bottom-[20%] right-[8%] z-10 hidden items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-lg shadow-black/[0.04] lg:flex"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-pink-50 text-lg">
            🤖
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">AI Asistan</p>
            <p className="text-xs text-gray-400">rapor hazırlandı</p>
          </div>
        </motion.div>

        {/* Hero content */}
        <div className="relative z-20 mx-auto max-w-[800px] text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[13px] font-medium text-blue-700"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            Yeni: AI destekli işletme yönetimi
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-5 text-[clamp(40px,6vw,72px)] font-extrabold leading-[1.05] tracking-[-2px] text-gray-900"
          >
            İşletmeni yönet,
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              geleceğini planla.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mx-auto mb-10 max-w-[560px] text-lg leading-relaxed text-gray-500"
          >
            inPobi ile klinik, restoran, kuaför veya eczane farketmez — tüm
            işletme operasyonlarını tek panelden yönetin.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30"
            >
              Ücretsiz Dene
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-gray-300 bg-transparent px-8 py-3.5 text-[15px] font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50"
            >
              Özellikleri Gör
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════ DASHBOARD PREVIEW ════════════ */}
      <section className="px-6 pb-24">
        <motion.div
          ref={previewRef}
          initial={{ opacity: 0, y: 60 }}
          animate={previewControls}
          className="mx-auto max-w-[1100px]"
          style={{ perspective: "1000px" }}
        >
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-3 shadow-2xl shadow-black/15 transition-transform duration-500 hover:[transform:rotateX(0deg)] [transform:rotateX(4deg)]">
            {/* Browser bar */}
            <div className="mb-2 flex items-center gap-2 px-3 py-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div className="ml-2 flex-1 rounded-md bg-white/5 px-3 py-1.5 text-center text-xs text-gray-400">
                inpobi.com/dashboard
              </div>
            </div>

            {/* Dashboard content */}
            <div className="flex overflow-hidden rounded-lg bg-white">
              {/* Sidebar */}
              <div className="hidden w-[220px] shrink-0 border-r border-gray-200 bg-gray-50 p-5 md:block">
                <div className="mb-6 px-1 text-base font-bold text-blue-600">
                  inPobi
                </div>
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] ${
                        item.active
                          ? "bg-blue-50 font-semibold text-blue-700"
                          : "text-gray-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  );
                })}
              </div>

              {/* Main */}
              <div className="flex-1 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Dashboard</h3>
                  <div className="flex gap-2">
                    <span className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600">
                      Bu Hafta
                    </span>
                    <span className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white">
                      Rapor İndir
                    </span>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: "Toplam Müşteri", value: "1,284", change: "+12%", up: true },
                    { label: "Bugünün Randevuları", value: "18", change: "+3 yeni", up: true },
                    { label: "Aylık Gelir", value: "₺84,500", change: "+34%", up: true },
                    { label: "Stok Uyarıları", value: "3", change: "Kontrol et", up: false },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <p className="text-xs text-gray-400">{s.label}</p>
                      <p className="mt-1.5 text-[22px] font-bold text-gray-900">
                        {s.value}
                      </p>
                      <p
                        className={`mt-1 text-[11px] font-semibold ${
                          s.up ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {s.change}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex h-[200px] items-end gap-3 px-6 py-5">
                    {chartHeights.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, height: 0 }}
                        whileInView={{ opacity: 1, height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ════════════ FEATURES ════════════ */}
      <section id="features" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-[1100px]">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-3 inline-block text-[13px] font-semibold uppercase tracking-widest text-blue-600"
          >
            Özellikler
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-tight text-gray-900"
          >
            İşletmeni yönetmek için
            <br />
            ihtiyacın olan her şey.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-14 max-w-[500px] text-base leading-relaxed text-gray-500"
          >
            Tek platform üzerinden müşteri yönetimi, randevu, finans, stok ve
            daha fazlasını AI destekli araçlarla yönet.
          </motion.p>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  custom={i}
                  className="group cursor-default rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/[0.06]"
                >
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}
                  >
                    <Icon className={`h-[22px] w-[22px] ${feature.color}`} />
                  </div>
                  <h3 className="mb-2 text-[17px] font-bold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ════════════ SECTORS ════════════ */}
      <section id="sectors" className="px-6 py-24">
        <div className="mx-auto max-w-[1100px] text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-3 inline-block text-[13px] font-semibold uppercase tracking-widest text-blue-600"
          >
            Sektörler
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-[clamp(28px,4vw,42px)] font-extrabold tracking-tight text-gray-900"
          >
            Her işletme için tasarlandı.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-14 max-w-[500px] text-base leading-relaxed text-gray-500"
          >
            Sektörünüz ne olursa olsun, inPobi işletmenize uyum sağlar.
          </motion.p>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 gap-5 lg:grid-cols-4"
          >
            {sectors.map((sector, i) => (
              <motion.div
                key={sector.title}
                variants={fadeUp}
                custom={i}
                className="cursor-default rounded-2xl border border-gray-200 bg-white px-6 py-8 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-600/[0.08]"
              >
                <span className="mb-4 block text-4xl">{sector.emoji}</span>
                <h4 className="mb-1.5 text-base font-bold text-gray-900">
                  {sector.title}
                </h4>
                <p className="text-[13px] leading-snug text-gray-500">
                  {sector.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ STATS BAR ════════════ */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-16">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-10 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[42px] font-extrabold tracking-tight text-white">
                <AnimatedCounter target={stat.target} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-sm text-blue-200">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="relative overflow-hidden px-6 py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,#eff6ff_0%,transparent_70%)]" />
        <div className="relative z-10 mx-auto max-w-[600px] text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-[clamp(28px,4vw,48px)] font-extrabold tracking-[-1.5px] text-gray-900"
          >
            İşletmeni dijitalleştir,
            <br />
            bir adım öne geç.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-10 max-w-[480px] text-[17px] leading-relaxed text-gray-500"
          >
            14 gün ücretsiz dene, kredi kartı gerekmez. Hemen başla ve farkı
            gör.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-[14px] bg-blue-600 px-10 py-4 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30"
            >
              Hemen Başla
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 pb-8 pt-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            {/* Brand */}
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

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h5 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-gray-800">
                  {title}
                </h5>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <Link
                        href="#"
                        className="text-[13px] text-gray-500 transition-colors hover:text-blue-600"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6 text-center">
            <p className="text-xs text-gray-400">
              &copy; 2026 inPobi. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>

      {/* ════════════ AI ONBOARDING CHAT ════════════ */}
      <OnboardingChat />
    </div>
  );
}
