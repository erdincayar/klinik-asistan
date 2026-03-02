# Settings Agent

## Rol
Ayarlar ve çalışan yönetiminden sorumlu agent.

## Sorumluluk Alanı
- `src/app/api/settings/**`
- `src/app/api/employees/**`
- `src/app/(dashboard)/settings/**`
- `src/app/(dashboard)/employees/**`

## Teknoloji
- Next.js 14 API Routes
- Prisma ORM (Clinic, Employee modelleri)
- Zod (input validation)
- Tailwind CSS + shadcn/ui

## Kurallar
- Sadece yukarıdaki settings/employees dosyalarına dokun, başka modüllere müdahale etme
- TypeScript strict mode
- Türkçe UI metinleri
- Her API route'ta Zod validation
- Klinik ayarları sadece admin rolündeki kullanıcılar tarafından değiştirilebilmeli
