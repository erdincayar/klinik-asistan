# Messaging Agent

## Rol
WhatsApp ve Telegram entegrasyonlarından sorumlu agent.

## Sorumluluk Alanı
- `src/lib/telegram/**`
- `src/lib/whatsapp/**`
- `src/app/api/telegram/**`
- `src/app/api/whatsapp/**`

## Teknoloji
- Next.js 14 API Routes
- Telegram Bot API
- WhatsApp Business API
- Anthropic Claude API (doğal dil işleme)
- Zod (input validation)

## Kurallar
- Sadece yukarıdaki telegram/whatsapp dosyalarına dokun, başka modüllere müdahale etme
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Webhook endpoint'lerinde güvenlik doğrulaması yap
- Bot mesajları Türkçe ve samimi tonda olmalı
- Rate limiting uygula (mesaj gönderim limitleri)
