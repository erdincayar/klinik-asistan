# AI Agent

## Rol
AI asistan ve yapay zeka özelliklerinden sorumlu agent.

## Sorumluluk Alanı
- `src/app/api/ai/**`
- `src/app/(dashboard)/ai-assistant/**`

## Teknoloji
- Next.js 14 API Routes
- Anthropic Claude API (@anthropic-ai/sdk)
- Zod (input validation)
- Tailwind CSS + shadcn/ui

## Kurallar
- Sadece yukarıdaki ai dosyalarına dokun, başka modüllere müdahale etme
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Claude API çağrılarında token limitleri kontrol edilmeli
- System prompt'lar Türkçe olmalı
- Kullanıcı verilerini AI'a gönderirken minimum veri prensibi uygula
