# Karstone Test Kılavuzu

> AI Catalog Generator modülünün uçtan uca test senaryosu.
> Katılımcı: Karstone (doğal taş) demo verisi. Bu rehber UI üzerinden
> nasıl ilerleneceğini anlatır; API/curl akışı için
> [CLAUDE_CODE_DEPLOY.md § 7d](CLAUDE_CODE_DEPLOY.md) bölümüne bak.

---

## 0. Ön Hazırlık

Aşağıdakilerin tamamlanmış olması lazım (`CLAUDE_CODE_DEPLOY.md`
bölümleri 1–7d):

- [x] Prisma migration uygulandı (`Catalog*` tabloları)
- [x] `/var/www/klinik-asistan/storage/` mevcut
- [x] `sharp` npm paketi kurulu
- [x] Python catalog-service pm2'de çalışıyor (`curl localhost:8001/health` → 200)
- [x] `ANTHROPIC_API_KEY` ayarlı
- [x] `CATALOG_SERVICE_URL` Next.js tarafında set (default `http://127.0.0.1:8001`)
- [x] Seed çalıştı → DB'de `natural-stone-modern` şablonu var
- [x] Giriş yapacağın kullanıcı **ADMIN** veya **SUPERADMIN** rolünde

Test materyalleri:

- **1 adet referans PDF**: Karstone'un mevcut kataloğu veya benzer bir
  doğal taş firması PDF'i (~5-20 sayfa).
- **10-30 ürün fotoğrafı**: JPG/PNG. İdealde dosya adları ürün
  kodlarıyla eşleşmeli — örn. `URN-001.jpg`, `WF-1024.png`. Bu
  filename matching için en güvenilir yol. Eşleşme olmazsa sistem
  PDF'ten çıkardığı görselleri kullanır (pHash fallback).
- **Opsiyonel**: Ürün listesi Excel'i (xlsx/csv).

---

## 1. Projeyi Aç

1. Tarayıcıda **poby.ai/admin/content-studio/catalog** yoluna git.
   Sol menüde **Yönetim** altında **"Katalog Üretici"** linkinden de ulaşılır.
2. Sağ üstteki **"+ Yeni Katalog"** butonuna tıkla.

---

## 2. Wizard — 4 Adım

### Adım 1 — Proje Bilgileri

| Alan | Örnek |
| --- | --- |
| Proje Adı | `Karstone 2026 Koleksiyonu` |
| Açıklama | `AI test — doğal taş kataloğu` |
| Kaynak Dil | `Türkçe` (PDF dili ne ise o) |
| Hedef Dil | `Türkçe` |

> Kaynak ≠ Hedef olursa Claude, ürün adları / açıklamaları /
> kategorileri otomatik çevirir.

**"İleri"** → Adım 2.

### Adım 2 — Dosya Yükleme

Üç drag-drop alanı:

- **Referans PDF**: `karstone.pdf` sürükle bırak veya tıkla seç. Birden fazla PDF yükleyebilirsin.
- **Ürün Fotoğrafları** (zorunlu): klasör ya da çoklu seçim.
- **Excel / CSV** (opsiyonel): ürün listesi, fiyatlar.

> Dosyalar şu aşamada sadece **staged**. Proje son adımda
> oluşturulup toplu yüklenecek.

**"İleri"** → Adım 3.

### Adım 3 — Marka Kiti

Karstone örneği için önerilen değerler:

| Alan | Değer |
| --- | --- |
| Birincil | `#1C2332` (lacivert / koyu) |
| İkincil | `#F5F1EC` (kumlu açık) |
| Vurgu | `#B8956A` (taş/bakır) |
| Font | `Inter` veya `Playfair Display` (lüks hissi için) |

Logo upload şu an preview amaçlı — **v2**'de PDF üretimine dahil olacak.

**"İleri"** → Adım 4.

### Adım 4 — Şablon Seçimi

Tek kart: **Natural Stone — Modern & Minimal**. Seçili olduğunu doğrula.
**"Analizi Başlat"** → sırayla:

1. Proje oluşturulur (`DRAFT`).
2. Staged dosyalar tek tek `POST /upload`'a gönderilir.
3. `POST /analyze` tetiklenir, statü `ANALYZING`'e geçer.
4. Detay sayfasına yönlendirilirsin.

---

## 3. Analiz İzleme

Detay sayfası:

- Üstte **StatusTimeline**: Yüklendi → Analiz (spinner) → Hazır → Üretildi.
- Modal açık: "PDF analiz ediliyor ve ürünler çıkartılıyor".
- Status **her 3 saniyede bir** GET ile güncellenir (`useProjectPolling`).

Arkaplanda çalışan adımlar (FastAPI iş zinciri):

```
parse-pdf (pdfplumber + pymupdf)
      ↓
extract-products (Claude, sayfa batch'leri)
      ↓
match-images (filename → pHash fallback)
      ↓
translate  (sadece src ≠ tgt ise)
      ↓
CatalogProduct tablosunda satırlar oluşur
      ↓
status = READY_TO_GENERATE
```

Zaman: 5-15 dakika (PDF sayfa sayısı + Claude hızına göre).

Hata olursa statü **FAILED** olur. Logları görmek için VPS'te:

```bash
pm2 logs inpobi-web --lines 60 --nostream
pm2 logs poby-catalog --lines 60 --nostream
```

---

## 4. Ürünleri İncele / Düzenle

Analiz bittiğinde:

1. **Ürünler** tabına geç. Çıkartılan ürünler tablo olarak görünür.
2. Satıra tıkla → **ProductEditModal** açılır.
3. Düzenleyebileceğin alanlar:
   - Ürün adı, kategori, açıklama
   - Fiyat, para birimi
   - Teknik özellikler (key: value çoklu satır)
   - Görsel seçimi (projedeki tüm fotolardan grid)
   - Durum: Taslak / İncelendi / Onaylandı
4. **Kaydet** → PATCH `/api/admin/catalog/products/[id]`.
5. Silmek istersen kırmızı **Sil** butonu.

> Filename eşleşmesi doğru çalışmadıysa görsel grid'inden doğru
> fotoğrafı manuel seçebilirsin. Bu hem kar, hem içerik kalitesi
> açısından en kritik kontrol adımı.

---

## 5. Ayarlar Tabı

PDF üretimi için son ince ayarlar:

- **Marka Kiti**: wizard'daki değerler localStorage'dan hidrate edilir;
  burada değiştirebilirsin.
- **Katalog Bilgileri**: başlık, alt başlık, firma adı, edisyon, yıl.
- **İletişim**: arka kapakta yer alacak (adres, telefon, e-posta, web).
- **Şablon**: şu an sadece `natural-stone-modern`. Gelecekte buradan seçeceksin.

---

## 6. Kataloğu Üret

Sağ üst **"Katalog Üret"** butonu → `POST /generate`. Status `GENERATING`.

Arkaplan:

```
FastAPI /generate-catalog
  → Jinja2 render (main + includes)
  → WeasyPrint PDF
  → pymupdf ile her sayfa PNG preview
  → CatalogGeneration satırı (COMPLETED)
  → status = COMPLETED
```

Zaman: 30 sn – 3 dk (ürün sayısına göre).

---

## 7. Önizleme

**Önizleme** tabına geç → iframe'de PDF açılır. Sayfa aşağı/yukarı
kaydırarak tüm kataloğu gözden geçir.

> İframe arka planda `GET /download` endpoint'ini çağırıyor. Bu
> endpoint `CatalogGeneration.pdfPath`'i resolver'a verip dosyayı
> stream ediyor.

---

## 8. İndirme ve Paylaşım

Üst barda:

- **PDF İndir** → tarayıcı PDF'i doğrudan iner
  (`attachment; filename="karstone-2026-koleksiyonu.pdf"`).
- **WhatsApp** → `wa.me/?text=...` ile paylaşım penceresi açar,
  PDF linkini otomatik doldurur.

---

## 9. Beklenen Çıktı

**Dosya sistemi:**

```
/var/www/klinik-asistan/storage/catalog/<tenantId>/<projectId>/
├── source/                     # Karstone referans PDF
├── photos/                     # Ürün fotoları (webp)
│   └── thumbs/                 # 200px thumbnail'lar
├── data/                       # Opsiyonel xlsx
└── output/
    ├── catalog-natural-stone-modern-YYYYMMDD-HHMMSS.pdf
    └── preview/
        └── catalog-natural-stone-modern-YYYYMMDD-HHMMSS/
            ├── page-001.png
            ├── page-002.png
            └── ...
```

**Veritabanı:**

- `CatalogProject.status = "COMPLETED"`, `templateId = <natural-stone-modern>`
- `CatalogProduct` satırları — her ürün için
- `CatalogSourceFile` — tüm yüklenen dosyalar
- `CatalogGeneration` — `status = "COMPLETED"`, `pdfPath`, `pageCount`, `fileSize`

**PDF yapısı:**

1. **Kapak** — marka renkli, başlık, alt başlık, edisyon/yıl
2. **İçindekiler** — kategori bazlı, ürün sayıları
3. Her kategori için: **Ayraç** + **Ürün sayfaları** (sol görsel, sağ detay)
4. **Arka kapak** — iletişim bilgileri

---

## 10. Sorun Giderme (UI tarafı)

| Belirti | Muhtemel neden | Çözüm |
| --- | --- | --- |
| "Katalog Üret" pasif | Projede ürün yok veya analiz devam ediyor | Önce Analiz'i bekle, ürünler tab'ında kontrol et |
| Wizard Adım 4'te ilerleme | Adım 2 zorunlu alan eksik | En az 1 PDF + 1 foto yükle |
| Ürün tablosu boş | Analiz FAILED veya Claude ürün bulamadı | Logları incele (`pm2 logs`), farklı PDF dene |
| Görseller bozuk | WeasyPrint dosyayı açamadı | Fotoğrafı PNG veya JPG'ye çevir, tekrar yükle |
| iframe preview 404 | PDF henüz oluşmadı veya diskten silindi | "Katalog Üret" yeniden çalıştır |
| WhatsApp linki boş açılıyor | Henüz PDF yok → "Önce katalog üretin" uyarısı | Generate sonrası tekrar dene |
| Toast "Yetkisiz" | Rol ADMIN/SUPERADMIN değil | `psql` ile rolü güncelle |

---

## 11. Başarı Kriterleri

- [ ] Wizard adımları sorunsuz ilerledi
- [ ] Dosyalar `usedFormatted` kotasına dahil edildi
- [ ] Analiz tamamlandı → ürünler listelendi
- [ ] Ürünlerin en az %70'inde filename veya pHash eşleşmesi var
- [ ] Ürün düzenleme kaydediliyor
- [ ] PDF üretildi, en az kapak + TOC + ürün sayfaları + arka kapak
- [ ] PNG preview'lar oluştu
- [ ] İndirme çalışıyor
- [ ] WhatsApp paylaşım linki doğru text ile açıyor

Checklist tamamlandığında MVP akışı pilotu tamamlanmış olur. Eksik
kalan kısımlar için `CLAUDE_CODE_DEPLOY.md §7d.7` (troubleshooting)
ve `python-services/catalog-service/README.md` roadmap bölümüne
bakın.
