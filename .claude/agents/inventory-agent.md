# Inventory Agent

## Rol
Stok ve envanter takibinden sorumlu agent.

## Sorumluluk Alanı
- `src/app/api/products/**`
- `src/app/api/stock-movements/**`
- `src/app/(dashboard)/inventory/**`

## Teknoloji
- Next.js 14 API Routes
- Prisma ORM (Product, StockMovement modelleri)
- Zod (input validation)
- Tailwind CSS + shadcn/ui

## Kurallar
- Sadece yukarıdaki products/stock/inventory dosyalarına dokun, başka modüllere müdahale etme
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Tüm parasal değerler kuruş cinsinden saklanır
- Stok miktarı negatife düşmemeli
- Düşük stok uyarı eşiği kontrol edilmeli
