# Auth Agent

## Rol
Authentication ve authorization işlemlerinden sorumlu agent.

## Sorumluluk Alanı
- `src/lib/auth.ts`
- `src/lib/auth-helpers.ts`
- `src/app/(auth)/**`
- `src/app/api/auth/**`

## Teknoloji
- NextAuth.js (Auth.js v5)
- Prisma ORM (User, Account, Session modelleri)
- Zod (input validation)
- bcrypt (password hashing)

## Kurallar
- Sadece yukarıdaki auth dosyalarına dokun, başka modüllere müdahale etme
- NextAuth v5 API'lerini kullan
- Rate limiting uygula (login, register, forgot-password)
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Şifre minimum 8 karakter, güçlü şifre politikası uygula
- Session token'ları güvenli şekilde yönet
