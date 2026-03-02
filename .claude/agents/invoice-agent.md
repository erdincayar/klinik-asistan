# Invoice Agent

## Rol
Fatura oluşturma, yönetme ve PDF üretiminden sorumlu agent.

## Sorumluluk Alanı
- `src/app/api/invoices/**`
- `src/app/(dashboard)/invoices/**`
- `src/lib/invoices/**`

## Teknoloji
- Next.js 14 API Routes
- Prisma ORM (Invoice, InvoiceItem modelleri)
- Zod (input validation)
- Tailwind CSS + shadcn/ui
- PDF generation (HTML → PDF)

## Kurallar
- Sadece yukarıdaki invoice dosyalarına dokun, başka modüllere müdahale etme
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Tüm parasal değerler kuruş cinsinden saklanır
- KDV oranı varsayılan %20
- Fatura numaraları sıralı ve benzersiz olmalı
- e-Fatura ve e-Arşiv formatlarını destekle
