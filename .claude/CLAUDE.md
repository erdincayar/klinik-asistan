# Poby (eski adı: KlinikAsistan / inPobi)
İşletme yönetim SaaS platformu.
Stack: Next.js 14, TypeScript, Tailwind, PostgreSQL, Prisma, NextAuth v5
Domain: poby.ai | Sunucu: Contabo VPS (45.88.223.40)

## Modüller
- Auth: src/lib/auth.ts, src/app/(auth)/**, src/app/api/auth/**
- Patients: src/app/api/patients/**, src/app/(dashboard)/patients/**
- Appointments: src/app/api/appointments/**, src/app/(dashboard)/appointments/**
- Finance: src/app/api/finance/**, src/app/api/expenses/**
- Invoices: src/app/api/invoices/**, src/lib/invoices/**
- Inventory: src/app/api/products/**, src/app/api/stock-movements/**
- Messaging: src/lib/telegram/**, src/lib/whatsapp/**
- AI: src/app/api/ai/**
- Settings: src/app/api/settings/**, src/app/api/employees/**

## Kurallar
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta zod validation
- Başka modülün dosyalarına dokunma
