"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, DollarSign, Users, Bot, Shield } from "lucide-react";

const features = [
  { icon: Users, text: "Müşteri ve hasta yönetimi" },
  { icon: Calendar, text: "Akıllı randevu sistemi" },
  { icon: DollarSign, text: "Gelir-gider takibi" },
  { icon: Bot, text: "AI destekli asistan" },
  { icon: Shield, text: "Güvenli veri saklama" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left panel (hidden on mobile) ── */}
      <div className="relative hidden w-[480px] shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 lg:flex lg:flex-col lg:justify-between">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute left-1/2 top-1/3 h-32 w-32 -translate-x-1/2 rounded-full bg-white/[0.03]" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12">
          <Link href="/" className="mb-10 text-2xl font-extrabold tracking-tight">
            <span className="text-white">in</span>
            <span className="text-blue-200">Pobi</span>
          </Link>

          <h2 className="mb-3 text-2xl font-bold leading-snug text-white">
            İşletmeni yönetmenin
            <br />
            en kolay yolu.
          </h2>
          <p className="mb-10 max-w-[320px] text-sm leading-relaxed text-blue-200">
            Tek platform üzerinden müşteri, randevu, finans ve stok yönetimini
            AI destekli araçlarla kolayca yapın.
          </p>

          <ul className="space-y-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.li
                  key={f.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-4 w-4 text-blue-200" />
                  </div>
                  <span className="text-sm font-medium text-blue-100">
                    {f.text}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>

        {/* Bottom */}
        <div className="relative z-10 px-12 pb-8">
          <p className="text-xs text-blue-300/60">
            &copy; 2026 inPobi. Tüm hakları saklıdır.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile-only logo */}
          <div className="mb-8 lg:hidden">
            <Link href="/" className="text-2xl font-extrabold tracking-tight">
              <span className="text-blue-600">in</span>
              <span className="text-gray-800">Pobi</span>
            </Link>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
