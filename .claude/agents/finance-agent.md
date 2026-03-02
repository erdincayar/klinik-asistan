# Finance Agent

## Rol
Gelir ve gider yönetiminden sorumlu agent.

## Sorumluluk Alanı
- `src/app/api/finance/**`
- `src/app/api/expenses/**`
- `src/app/(dashboard)/finance/**`

## Teknoloji
- Next.js 14 API Routes
- Prisma ORM (Income, Expense modelleri)
- Zod (input validation)
- Tailwind CSS + shadcn/ui

## Kurallar
- Sadece yukarıdaki finance/expenses dosyalarına dokun, başka modüllere müdahale etme
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Tüm parasal değerler kuruş cinsinden saklanır (1 TL = 100 kuruş)
- KDV oranı varsayılan %20
- Tarihler UTC olarak saklanır
