# Poby PWA → Mağaza Yayınlama Rehberi

## Ön Koşullar
- [x] PWA kurulumu tamamlandı (manifest.json, service worker, ikonlar)
- [ ] VPS'te deploy edildi ve https://poby.ai çalışıyor
- [ ] Google Play Developer hesabı ($25 tek seferlik) — https://play.google.com/console
- [ ] Apple Developer hesabı ($99/yıl) — https://developer.apple.com

---

## 1. Google Play (Android) — PWABuilder ile

### Adım 1: PWABuilder'da paket oluştur
1. https://www.pwabuilder.com adresine git
2. URL alanına `https://poby.ai` yaz → "Start" tıkla
3. PWA skorunu kontrol et (manifest, service worker, https doğrulanacak)
4. "Package For Stores" → "Android" seç
5. Ayarlar:
   - **Package ID**: `ai.poby.app`
   - **App name**: `Poby`
   - **App version**: `1.0.0`
   - **Display mode**: `Standalone`
   - **Status bar color**: `#6366F1`
   - **Splash screen color**: `#F4F6FA`
   - **Signing key**: "Create new" seç (bir şifre belirle ve KAYDET!)
6. "Generate" → ZIP indir

### Adım 2: Signing key fingerprint'i al
ZIP'i aç, içindeki signing.keystore dosyasından fingerprint al:
```bash
keytool -list -v -keystore signing.keystore -alias my-key-alias
```
SHA-256 fingerprint'i kopyala.

### Adım 3: assetlinks.json güncelle
`public/.well-known/assetlinks.json` dosyasındaki `PLACEHOLDER_FINGERPRINT` yerine SHA-256 fingerprint'i yapıştır.
Commit + push + VPS'te pull.

### Adım 4: Google Play Console'a yükle
1. https://play.google.com/console → "Uygulama oluştur"
2. Uygulama adı: Poby
3. "Dahili test" → AAB dosyasını yükle
4. Store listing: açıklama, ekran görüntüleri, ikon
5. İçerik derecelendirmesi, gizlilik politikası (poby.ai/privacy gerekli)
6. Test → Production yayınla

---

## 2. App Store (iOS) — PWABuilder ile

### Adım 1: PWABuilder'da iOS paketi oluştur
1. https://www.pwabuilder.com → `https://poby.ai`
2. "Package For Stores" → "iOS" seç
3. Ayarlar:
   - **Bundle ID**: `ai.poby.app`
   - **App name**: `Poby`
   - **Status bar color**: `#6366F1`
4. "Generate" → ZIP indir

### Adım 2: Xcode'da aç ve imzala
1. ZIP'i aç → `.xcodeproj` dosyasını Xcode ile aç
2. Signing & Capabilities → Team seç (Apple Developer hesabı)
3. Bundle Identifier: `ai.poby.app`
4. Product → Archive → Distribute App → App Store Connect

### Adım 3: App Store Connect
1. https://appstoreconnect.apple.com → yeni app oluştur
2. Bilgileri doldur: açıklama, ekran görüntüleri, anahtar kelimeler
3. Gizlilik politikası URL'i
4. Review'a gönder

---

## 3. Her İki Mağaza İçin Gerekli Materyaller

### Ekran Görüntüleri
- Android: 1080x1920 (en az 2 adet)
- iOS: iPhone 6.7" (1290x2796), iPad 12.9" (2048x2732)

### Açıklama Metni (Türkçe)
```
Poby — AI Destekli İşletme Yönetim Platformu

Küçük işletmeler için tasarlanmış hepsi bir arada yönetim uygulaması.

✅ Müşteri Yönetimi — Kayıt, takip ve analiz
✅ Randevu Sistemi — Takvim görünümü, çalışan bazlı renk kodlama
✅ Finans Takibi — Gelir-gider, fatura, mali tablo
✅ Stok Yönetimi — Ürün, hareket, tedarik zinciri analizi
✅ AI Asistan — Yapay zeka destekli akıllı asistan
✅ WhatsApp & Telegram — Mesajlaşma entegrasyonu
✅ Alarm Sistemi — AI ile otomatik alarm kurma
✅ Belgeler — İK belgeleri, onam formları

Klinikler, kuaförler, restoranlar ve tüm işletmeler için ideal.
```

### Anahtar Kelimeler
```
işletme yönetimi, randevu sistemi, müşteri takibi, stok yönetimi,
AI asistan, işletme yönetim yazılımı, klinik yazılımı, kuaför randevu,
restoran yönetim, finans takibi, fatura, WhatsApp
```

### Gizlilik Politikası
https://poby.ai/privacy sayfası oluşturulmalı (mağaza zorunluluğu)

---

## Notlar
- Google Play onayı: 1-3 gün
- App Store onayı: 1-7 gün (ilk başvuruda daha uzun)
- Her iki mağazada da gizlilik politikası ZORUNLU
- App Store'da Safari WebKit kullanır (native Push Notification sınırlı)
