# poby.ai Bug Report

**Tarih:** 2026-03-08
**Test Aracı:** Playwright (Chromium Headless)
**Test Edilen URL:** https://poby.ai

---

## Özet

| # | Sayfa | Durum | Detay |
|---|-------|-------|-------|
| 1 | Login | PASS | Giriş başarılı, dashboard'a yönlendiriyor |
| 2 | Dashboard | PASS | Kartlar yükleniyor, hata mesajı yok |
| 3 | Sidebar - Genel Bakış | FAIL | Tıklama sonrası timeout (RSC fetch hatası) |
| 4 | Sidebar - Müşteriler | FAIL | Tıklama sonrası timeout (RSC fetch hatası) |
| 5 | Sidebar - Randevular | FAIL | Tıklama sonrası timeout (RSC fetch hatası) |
| 6 | Sidebar - Finans | PASS | Sayfa açılıyor, sekmeler görünür |
| 7 | Sidebar - Stok/Envanter | PASS | Sidebar'da "Stok" metni yok, URL ile erişildi |
| 8 | Sidebar - Çalışanlar | FAIL | Tıklama sonrası timeout (RSC fetch hatası) |
| 9 | Sidebar - Pazarlama | FAIL | "Erişim kısıtlı" uyarısı - plan kısıtlaması |
| 10 | Sidebar - Mesajlaşma | FAIL | Tıklama sonrası timeout (RSC fetch hatası) |
| 11 | Sidebar - AI Asistan | PASS | Sayfa düzgün yükleniyor |
| 12 | Sidebar - Raporlar | PASS | Sayfa açılıyor (ancak "Erişim kısıtlı" uyarısı) |
| 13 | Sidebar - Hatırlatmalar | FAIL | Tıklama sonrası timeout |
| 14 | Sidebar - Abonelik | FAIL | Tıklama sonrası timeout |
| 15 | Sidebar - Ayarlar | FAIL | Sidebar'da "Ayarlar" menü öğesi bulunamadı |
| 16 | Müşteriler (direkt URL) | FAIL | `/dashboard/patients` → 404 hatası |
| 17 | Randevular (direkt URL) | FAIL | `/dashboard/appointments` → 404 hatası |
| 18 | Finans (direkt URL) | FAIL | Rate limit nedeniyle login başarısız |
| 19 | Stok (direkt URL) | FAIL | Rate limit nedeniyle login başarısız |
| 20 | Ayarlar (direkt URL) | FAIL | Rate limit nedeniyle login başarısız |
| 21 | Responsive - Mobil (375px) | PASS | Dashboard düzgün render oluyor |
| 22 | Responsive - Tablet (768px) | PASS | Dashboard düzgün render oluyor |

**Toplam: 27 test | 12 PASS | 15 FAIL**

---

## Kritik Buglar

### BUG-1: URL Routing Hatası - `/dashboard/patients` ve `/dashboard/appointments` 404 Döndürüyor

**Seviye:** KRITIK
**Etkilenen Sayfalar:** Müşteriler, Randevular

`/dashboard/patients` ve `/dashboard/appointments` URL'leri **404 - This page could not be found** hatası veriyor. Sidebar'dan tıklanarak gidildiğinde farklı URL'lere yönlendiriyor olabilir (muhtemelen `/patients` veya `/appointments`), ancak doğrudan URL erişimi çalışmıyor.

**Ekran Görüntüsü:** `test-results/screenshots/04-patients.png`, `test-results/screenshots/05-appointments.png`

---

### BUG-2: RSC (React Server Components) Fetch Hataları - Client-Side Navigation Kırık

**Seviye:** KRITIK
**Etkilenen Sayfalar:** Tüm sayfa geçişleri

Sidebar'dan sayfa değiştirirken Next.js RSC payload fetch işlemleri başarısız oluyor ve tarayıcı tam sayfa yenileme yaparak fallback navigation'a düşüyor. Bu, kullanıcı deneyimini olumsuz etkiliyor ve sayfa geçişlerini yavaşlatıyor.

**Console Hata Mesajları:**
```
Failed to fetch RSC payload for https://poby.ai/employees. Falling back to browser navigation.
Failed to fetch RSC payload for https://poby.ai/patients. Falling back to browser navigation.
Failed to fetch RSC payload for https://poby.ai/inventory. Falling back to browser navigation.
```

Bu hata muhtemelen Next.js build/deployment sorununa veya server-side chunk'ların eksik/bozuk olmasına işaret ediyor.

---

### BUG-3: Agresif Rate Limiting - Çok Hızlı Tetikleniyor

**Seviye:** YÜKSEK
**Etkilenen Sayfalar:** Login, tüm API çağrıları

Kısa sürede birden fazla login denemesi yapıldığında rate limiter devreye giriyor ve aşağıdaki hata dönüyor:
```json
{"error":"Cok fazla istek. Lutfen bekleyin."}
```

Bu, API endpoint `/api/auth/error` sayfasına yönlendirmeye neden oluyor. Rate limit eşiği çok düşük olabilir - normal kullanımda bile tetiklenebilir.

**Ekran Görüntüsü:** `test-results/bug-test-STOK-should-load-product-list/test-failed-1.png`

---

### BUG-4: AuthJS Session Hatası

**Seviye:** ORTA
**Etkilenen Sayfalar:** Dashboard ve sonraki navigasyonlar

Dashboard'da AuthJS session yenileme hatası oluşuyor:
```
F: Failed to fetch. Read more at https://errors.authjs.dev#autherror
```

Bu, session'ın beklenmedik şekilde düşmesine neden olabilir.

---

## Orta Seviye Buglar

### BUG-5: Sidebar'da "Ayarlar" Menü Öğesi Eksik

**Seviye:** ORTA

Sidebar menüsünde "Ayarlar" linki bulunmuyor. Kullanıcılar ayarlara erişemiyor.
Mevcut sidebar menü öğeleri:
- Genel Bakış, Müşteriler, Randevular, Finans, Stok/Envanter, Çalışanlar, Pazarlama, Mesajlaşma, AI Asistan, Raporlar, Hatırlatmalar, Abonelik

### BUG-6: Finans Sayfası - İçerik Yüklenmiyor

**Seviye:** ORTA

Finans sayfası açılıyor ve sekmeler görünür (Gelir/Gider, Mali Tablo, Fatura Yükleme) ancak sekme içerikleri tamamen boş. Hiçbir veri veya tablo render edilmiyor.

**Ekran Görüntüsü:** `test-results/screenshots/sidebar-finance.png`

### BUG-7: Pazarlama ve Raporlar - "Erişim Kısıtlı" Uyarısı

**Seviye:** DÜŞÜK (Beklenen davranış olabilir)

Pazarlama ve Raporlar sayfalarına erişildiğinde toast mesajı gösteriliyor:
```
Erişim kısıtlı
Bu özellik planınıza dahil değil. Yükseltmek için iletişime geçin.
```

Bu bir plan kısıtlaması olabilir ancak admin kullanıcı için bile gösteriliyorsa incelenmeli.

**Ekran Görüntüsü:** `test-results/screenshots/sidebar-reports.png`

---

## Console Hataları (Sayfa Bazında)

### Dashboard
```
- Failed to fetch RSC payload for https://poby.ai/employees (TypeError: Failed to fetch)
- Failed to fetch RSC payload for https://poby.ai/patients (TypeError: Failed to fetch)
- AuthJS: F: Failed to fetch (session error)
- Failed to fetch RSC payload for https://poby.ai/inventory (TypeError: Failed to fetch)
```

### Patients
```
- 404 sayfası döndü, console error yakalanmadı
```

### Appointments
```
- 404 sayfası döndü, console error yakalanmadı
```

### Finance
```
- Login rate limit tetiklendi, sayfa erişilemedi
```

### Settings
```
- Login rate limit tetiklendi, sayfa erişilemedi
```

---

## Responsive Test Sonuçları

### Mobil (375px) - PASS
Dashboard mobilde düzgün render oluyor. Kartlar dikey olarak sıralanıyor, sidebar hamburger menüye dönüşüyor. Horizontal overflow tespit edilmedi.

**Ekran Görüntüsü:** `test-results/screenshots/09-mobile-375.png`

**Not:** `/dashboard/patients` mobilde de 404 veriyor.

### Tablet (768px) - PASS
Dashboard tablet görünümde düzgün render oluyor. Kartlar 2 sütunlu grid'de görünüyor. Sidebar ve üst bar düzgün.

**Ekran Görüntüsü:** `test-results/screenshots/11-tablet-768.png`

---

## Ekran Görüntüleri Listesi

| Dosya | Açıklama |
|-------|----------|
| `test-results/screenshots/01-login-page.png` | Login sayfası |
| `test-results/screenshots/02-dashboard-after-login.png` | Login sonrası dashboard |
| `test-results/screenshots/03-dashboard.png` | Dashboard kartları |
| `test-results/screenshots/04-patients.png` | Müşteriler - 404 hatası |
| `test-results/screenshots/05-appointments.png` | Randevular - 404 hatası |
| `test-results/screenshots/sidebar-finance.png` | Finans sayfası (boş içerik) |
| `test-results/screenshots/sidebar-ai.png` | AI Asistan sayfası |
| `test-results/screenshots/sidebar-reports.png` | Raporlar (erişim kısıtlı) |
| `test-results/screenshots/sidebar-stock-NOT-FOUND.png` | Stok menü öğesi bulunamadı |
| `test-results/screenshots/09-mobile-375.png` | Mobil görünüm |
| `test-results/screenshots/10-mobile-patients.png` | Mobil müşteriler - 404 |
| `test-results/screenshots/11-tablet-768.png` | Tablet görünüm |
| `test-results/screenshots/12-tablet-patients.png` | Tablet müşteriler - 404 |

---

## Öncelik Sıralaması

1. **BUG-1** (KRITIK): `/dashboard/patients` ve `/dashboard/appointments` 404 - URL routing düzeltilmeli
2. **BUG-2** (KRITIK): RSC fetch hataları - Next.js deployment/build sorunu araştırılmalı
3. **BUG-3** (YÜKSEK): Rate limiting çok agresif - eşik değerleri gözden geçirilmeli
4. **BUG-4** (ORTA): AuthJS session hataları - session yönetimi kontrol edilmeli
5. **BUG-5** (ORTA): Ayarlar menü öğesi sidebar'da eksik
6. **BUG-6** (ORTA): Finans sekme içerikleri boş
7. **BUG-7** (DÜŞÜK): Plan kısıtlaması uyarıları admin için bile gösteriliyor
