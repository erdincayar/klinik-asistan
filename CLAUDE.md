# KlinikAsistan — Proje Kılavuzu

## Proje Açıklaması
Doktor klinikleri ve küçük işletmeler için AI destekli SaaS uygulaması.
Hasta kaydı, gelir-gider takibi, WhatsApp entegrasyonu ve AI asistan içerir.

## Teknoloji Yığını
- Frontend: Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- Backend: Next.js API Routes, tRPC
- Veritabanı: PostgreSQL, Prisma ORM
- Auth: NextAuth.js (Auth.js v5)
- AI: Anthropic Claude API (@anthropic-ai/sdk)
- Deployment: Vercel

## Kodlama Kuralları
- TypeScript strict mode
- Fonksiyonel React bileşenleri
- Türkçe kullanıcı arayüzü, İngilizce kod
- Zod ile input validasyonu
- Responsive tasarım (mobile-first)
- KDV oranı varsayılan %20
- Tüm parasal değerler kuruş cinsinden saklanır
- Tarihler UTC olarak saklanır

## Komutlar
- npm run dev — geliştirme sunucusu
- npx prisma migrate dev — veritabanı migration
- npm run build — production build
