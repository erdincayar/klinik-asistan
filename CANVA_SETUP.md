# Canva Entegrasyonu Kurulumu

Poby Katalog Üretici üzerinden üretilen PDF'leri doğrudan Canva'ya
gönderip orada düzenlemeyi sağlar. Tek seferlik kurulum:

1. Canva Developer Portal'da bir app oluştur.
2. OAuth Client ID + Secret'i VPS `.env`'ine yaz.
3. Admin paneli üzerinden "Canva Hesabı Bağla" butonuna bas → onay ver → bağlantı tamam.

Bundan sonra her üretilen katalog için **Canva'da Düzenle** butonu aktif olur.

---

## 1. Canva Developer App oluştur

1. https://www.canva.com/developers/ → **New app**.
2. **App name**: `Poby Catalog` (istediğin adı ver).
3. **Description**: "Transfers generated product catalogs from Poby.ai into Canva for final edits."
4. **OAuth redirect URL**:
   ```
   https://poby.ai/api/admin/catalog/canva/callback
   ```
   (staging için aynı yolun staging domain'iyle eklenebilir)
5. **Scopes** (aşağıdaki tüm scope'lar şart):
   - `design:content:read`
   - `design:content:write`
   - `design:meta:read`
   - `asset:read`
   - `asset:write`
   - `profile:read`
6. App'i kaydet. Canva sana şunları verir:
   - **Client ID**
   - **Client secret**

> Canva bu scope'ları app review sürecinden geçmeden de geliştirme modunda
> açıyor. Sadece kendi hesabın + ekip üyesi hesapları bağlayabilir.
> Prodüksiyonda dış kullanıcılara açılacaksa Canva'dan app review istemen
> gerekir (form başvurusu, birkaç iş günü).

## 2. VPS `.env` güncelle

```bash
ssh root@45.88.223.40
cd /var/www/klinik-asistan

cat >> .env <<'EOF'

# Canva Connect API
CANVA_CLIENT_ID=xxxxxxxxxxxxxxxx
CANVA_CLIENT_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
CANVA_REDIRECT_URI=https://poby.ai/api/admin/catalog/canva/callback
EOF

pm2 restart inpobi-web
```

Env değişkenlerinin görünür olduğunu doğrula:

```bash
curl -sS -H "Cookie: $COOKIE" https://poby.ai/api/admin/catalog/canva/status | jq
# → {"configured": true, "connected": false, ...}
```

`configured: false` dönüyorsa üç env değişkeninden biri yok veya pm2
restart edilmedi.

## 3. Admin panelden hesap bağla

1. `https://poby.ai/admin/content-studio/catalog` aç (ADMIN veya SUPERADMIN).
2. Bir projeye gir → **Ayarlar** sekmesi → **Canva Bağlantısı** kartı.
3. **Canva Hesabı Bağla** butonuna bas → Canva'ya yönlenir → hesabını seç → izinleri onayla.
4. Geri yönlenirsin, liste sayfasında "Canva bağlandı" toast'ı çıkar.

## 4. Kataloğu Canva'ya gönder

1. Üretilmiş bir proje aç (status `COMPLETED`).
2. Üst barda **Canva'da Düzenle** butonuna bas.
3. Kısa bir yüklenme süresinin ardından Canva editörü yeni sekmede açılır — istediğin düzenlemeyi yap, istersen Canva'dan tekrar indir.

> **Not:** Canva'da yapılan değişiklikler Poby'ye geri senkron olmaz.
> Canva'da indirdiğin PDF'i tekrar Poby kaynağı olarak kullanmak istersen
> dosya yükleme üzerinden yeni bir proje olarak ekleyebilirsin.

---

## Sorun giderme

| Belirti | Sebep | Çözüm |
| --- | --- | --- |
| Buton "Canva sunucuda yapılandırılmamış" diyor | `.env` eksik | Yukarıda §2 |
| Buton Canva'ya yönlendirmiyor | pm2 restart yapılmadı | `pm2 restart inpobi-web` |
| "invalid_state" hatası | Cookie süresi dolmuş veya farklı tarayıcı | Yeniden dene; aynı tarayıcıdan |
| `428 Precondition Required` | Canva bağlantısı yok/kopmuş | Ayarlar → Canva'ya Bağla |
| `502 Canva token endpoint HTTP 401` | Client ID/Secret yanlış veya redirect URI eşleşmiyor | Canva app ayarlarını kontrol et |
| Asset upload timeout | Çok büyük PDF (>50MB) veya ağ yavaşlığı | Katalog sayfa sayısını azalt ya da tekrar dene |
| Import design failed | Canva taraflı hata (nadiren) | `pm2 logs inpobi-web` ile detay, tekrar dene |

---

## Teknik akış (referans)

```
[Admin] --(OAuth)--> [Canva] --(code, state)--> /canva/callback
                                                     │
                                                     ▼
                            prisma.catalogCanvaConnection.upsert()

[Admin] -- Canva'da Düzenle -->  /projects/[id]/canva-send
                                       │
                                       ├─ getValidAccessToken()  (refresh if needed)
                                       ├─ POST  /v1/asset-uploads   (PDF bytes)
                                       ├─ poll  /v1/asset-uploads/{job}
                                       ├─ POST  /v1/imports          (asset_id → design)
                                       ├─ poll  /v1/imports/{job}
                                       └─ return edit_url
```

Kodlar:
- `src/lib/catalog/canva.ts` — client, token refresh, upload & import
- `src/app/api/admin/catalog/canva/{auth,callback,status}/route.ts` — OAuth
- `src/app/api/admin/catalog/projects/[id]/canva-send/route.ts` — tek tıkla aktarım
