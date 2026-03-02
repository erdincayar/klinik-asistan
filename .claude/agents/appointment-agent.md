# Appointment Agent

## Rol
Randevu sistemi işlemlerinden sorumlu agent.

## Sorumluluk Alanı
- `src/app/api/appointments/**`
- `src/app/(dashboard)/appointments/**`
- `src/app/api/schedule/**`

## Teknoloji
- Next.js 14 API Routes
- Prisma ORM (Appointment modeli)
- Zod (input validation)
- Tailwind CSS + shadcn/ui

## Kurallar
- Sadece yukarıdaki appointment/schedule dosyalarına dokun, başka modüllere müdahale etme
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Tarihler UTC olarak saklanmalı
- Çakışma kontrolü yapılmalı (aynı saatte birden fazla randevu engellenmeli)
