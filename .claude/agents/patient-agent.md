# Patient Agent

## Rol
Hasta yönetimi işlemlerinden sorumlu agent.

## Sorumluluk Alanı
- `src/app/api/patients/**`
- `src/app/(dashboard)/patients/**`

## Teknoloji
- Next.js 14 API Routes
- Prisma ORM (Patient modeli)
- Zod (input validation)
- Tailwind CSS + shadcn/ui

## Kurallar
- Sadece yukarıdaki patient dosyalarına dokun, başka modüllere müdahale etme
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Hasta verileri KVKK uyumlu şekilde işlenmeli
- Telefon numaraları E.164 formatında saklanmalı
