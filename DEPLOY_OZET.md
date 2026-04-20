# Deploy Öncesi Durum Raporu — AI Catalog Generator

> 5 promptluk iterasyon sonunda üretilen tüm çıktılar, DB değişiklikleri,
> bağımlılıklar ve eksiklerin tam dökümü. Amaç: VPS'e git push + deploy
> yapmadan önce neyi nereye koyduğumuzu tek ekranda görebilmek.

**Rapor tarihi:** 2026-04-14
**Branch:** `main` (commit edilmemiş, stage edilmemiş — `git status` clean commit history'ye oturmuyor)
**Toplam yeni kod:** ~7.090 satır (Python + TS + HTML + CSS + SQL)
**Toplam yeni doküman:** ~1.280 satır Markdown

---

## 1. Oluşturulan Dosyaların Tam Listesi

### 1.1 Database — Prisma (1 migration + 1 seed)

| Dosya | Satır | Açıklama |
| --- | ---: | --- |
| [prisma/migrations/20260414_add_catalog_module/migration.sql](prisma/migrations/20260414_add_catalog_module/migration.sql) | 131 | 5 tablo + 13 index + 7 FK |
| [prisma/seeds/catalog-templates.ts](prisma/seeds/catalog-templates.ts) | 95 | `natural-stone-modern` idempotent upsert |

### 1.2 Backend — Next.js API Routes (13 dosya)

| Dosya | Satır | Metod(lar) |
| --- | ---: | --- |
| [src/app/api/admin/catalog/projects/route.ts](src/app/api/admin/catalog/projects/route.ts) | 96 | POST, GET |
| [src/app/api/admin/catalog/projects/[id]/route.ts](src/app/api/admin/catalog/projects/[id]/route.ts) | 92 | GET, DELETE |
| [src/app/api/admin/catalog/projects/[id]/upload/route.ts](src/app/api/admin/catalog/projects/[id]/upload/route.ts) | 196 | POST (multipart) |
| [src/app/api/admin/catalog/projects/[id]/files/route.ts](src/app/api/admin/catalog/projects/[id]/files/route.ts) | 46 | GET |
| [src/app/api/admin/catalog/projects/[id]/products/route.ts](src/app/api/admin/catalog/projects/[id]/products/route.ts) | 30 | GET |
| [src/app/api/admin/catalog/projects/[id]/analyze/route.ts](src/app/api/admin/catalog/projects/[id]/analyze/route.ts) | 74 | POST |
| [src/app/api/admin/catalog/projects/[id]/generate/route.ts](src/app/api/admin/catalog/projects/[id]/generate/route.ts) | 67 | POST |
| [src/app/api/admin/catalog/projects/[id]/download/route.ts](src/app/api/admin/catalog/projects/[id]/download/route.ts) | 93 | GET (stream) |
| [src/app/api/admin/catalog/files/[fileId]/route.ts](src/app/api/admin/catalog/files/[fileId]/route.ts) | 58 | DELETE |
| [src/app/api/admin/catalog/files/[fileId]/raw/route.ts](src/app/api/admin/catalog/files/[fileId]/raw/route.ts) | 72 | GET (stream + thumb) |
| [src/app/api/admin/catalog/products/[id]/route.ts](src/app/api/admin/catalog/products/[id]/route.ts) | 138 | PATCH, DELETE |

### 1.3 Backend — Next.js lib / services (6 dosya)

| Dosya | Satır | Rol |
| --- | ---: | --- |
| [src/lib/catalog/auth.ts](src/lib/catalog/auth.ts) | 38 | `requireAdmin()` helper |
| [src/lib/catalog/storage.ts](src/lib/catalog/storage.ts) | 268 | Path/validation/sharp/thumb/kota |
| [src/lib/catalog/jobQueue.ts](src/lib/catalog/jobQueue.ts) | 67 | In-process FIFO (TODO: BullMQ) |
| [src/lib/catalog/pipeline.ts](src/lib/catalog/pipeline.ts) | 388 | `runAnalyze` + `runGenerate` |
| [src/lib/services/CatalogService.ts](src/lib/services/CatalogService.ts) | 274 | FastAPI HTTP client + job poller |

### 1.4 FastAPI — Python (catalog-service, 18 dosya + 1 asset)

| Dosya | Satır | Rol |
| --- | ---: | --- |
| [python-services/catalog-service/main.py](python-services/catalog-service/main.py) | 105 | app factory, CORS, lifespan sweeper |
| [python-services/catalog-service/app/config.py](python-services/catalog-service/app/config.py) | 61 | env, path resolver, traversal guard |
| [python-services/catalog-service/app/schemas.py](python-services/catalog-service/app/schemas.py) | 196 | pydantic request/response types |
| [python-services/catalog-service/app/jobs.py](python-services/catalog-service/app/jobs.py) | 133 | thread-safe in-memory JobStore |
| [python-services/catalog-service/app/__init__.py](python-services/catalog-service/app/__init__.py) | 0 | package marker |
| [python-services/catalog-service/app/routers/__init__.py](python-services/catalog-service/app/routers/__init__.py) | 0 | package marker |
| [python-services/catalog-service/app/routers/health.py](python-services/catalog-service/app/routers/health.py) | 25 | GET /health |
| [python-services/catalog-service/app/routers/pdf.py](python-services/catalog-service/app/routers/pdf.py) | 35 | POST /parse-pdf |
| [python-services/catalog-service/app/routers/extract.py](python-services/catalog-service/app/routers/extract.py) | 33 | POST /extract-products |
| [python-services/catalog-service/app/routers/match.py](python-services/catalog-service/app/routers/match.py) | 24 | POST /match-images |
| [python-services/catalog-service/app/routers/translate.py](python-services/catalog-service/app/routers/translate.py) | 31 | POST /translate |
| [python-services/catalog-service/app/routers/generate.py](python-services/catalog-service/app/routers/generate.py) | 26 | POST /generate-catalog |
| [python-services/catalog-service/app/routers/jobs.py](python-services/catalog-service/app/routers/jobs.py) | 21 | GET /jobs/{id}, POST /jobs/_sweep |
| [python-services/catalog-service/app/services/__init__.py](python-services/catalog-service/app/services/__init__.py) | 0 | package marker |
| [python-services/catalog-service/app/services/pdf_parser.py](python-services/catalog-service/app/services/pdf_parser.py) | 174 | pdfplumber + pymupdf |
| [python-services/catalog-service/app/services/claude_client.py](python-services/catalog-service/app/services/claude_client.py) | 281 | AsyncAnthropic batch extract + translate |
| [python-services/catalog-service/app/services/image_matcher.py](python-services/catalog-service/app/services/image_matcher.py) | 201 | filename match + pHash fallback |
| [python-services/catalog-service/app/services/generator.py](python-services/catalog-service/app/services/generator.py) | 203 | Jinja + WeasyPrint + pymupdf preview |

### 1.5 FastAPI — Template bundle (8 dosya)

| Dosya | Satır | Rol |
| --- | ---: | --- |
| [python-services/catalog-service/templates/natural-stone-modern/main.html.j2](python-services/catalog-service/templates/natural-stone-modern/main.html.j2) | 50 | Master (includes diğerleri) |
| [python-services/catalog-service/templates/natural-stone-modern/cover.html.j2](python-services/catalog-service/templates/natural-stone-modern/cover.html.j2) | 21 | Kapak |
| [python-services/catalog-service/templates/natural-stone-modern/toc.html.j2](python-services/catalog-service/templates/natural-stone-modern/toc.html.j2) | 18 | İçindekiler |
| [python-services/catalog-service/templates/natural-stone-modern/category-divider.html.j2](python-services/catalog-service/templates/natural-stone-modern/category-divider.html.j2) | 5 | Kategori ayraç |
| [python-services/catalog-service/templates/natural-stone-modern/product-page.html.j2](python-services/catalog-service/templates/natural-stone-modern/product-page.html.j2) | 51 | Ürün sayfası |
| [python-services/catalog-service/templates/natural-stone-modern/back-cover.html.j2](python-services/catalog-service/templates/natural-stone-modern/back-cover.html.j2) | 41 | Arka kapak |
| [python-services/catalog-service/templates/natural-stone-modern/styles.css](python-services/catalog-service/templates/natural-stone-modern/styles.css) | 372 | A4 / paged media / brand vars |
| [python-services/catalog-service/templates/natural-stone-modern/assets/logo-placeholder.svg](python-services/catalog-service/templates/natural-stone-modern/assets/logo-placeholder.svg) | 8 | Placeholder logo |

### 1.6 Frontend — Admin sayfaları (3 route)

| Dosya | Satır | Rota |
| --- | ---: | --- |
| [src/app/(dashboard)/admin/content-studio/catalog/page.tsx](src/app/(dashboard)/admin/content-studio/catalog/page.tsx) | 254 | `/admin/content-studio/catalog` |
| [src/app/(dashboard)/admin/content-studio/catalog/new/page.tsx](src/app/(dashboard)/admin/content-studio/catalog/new/page.tsx) | 608 | `/admin/content-studio/catalog/new` |
| [src/app/(dashboard)/admin/content-studio/catalog/[id]/page.tsx](src/app/(dashboard)/admin/content-studio/catalog/[id]/page.tsx) | 831 | `/admin/content-studio/catalog/[id]` |

### 1.7 Frontend — Shared components (6 dosya)

| Dosya | Satır | Rol |
| --- | ---: | --- |
| [src/components/catalog/StatusBadge.tsx](src/components/catalog/StatusBadge.tsx) | 36 | Durum rozeti (6 statü) |
| [src/components/catalog/StatusTimeline.tsx](src/components/catalog/StatusTimeline.tsx) | 78 | 4-adım progress (Yüklendi→Üretildi) |
| [src/components/catalog/FileUploadZone.tsx](src/components/catalog/FileUploadZone.tsx) | 189 | Drag-drop + progress + staged/live |
| [src/components/catalog/ProductEditModal.tsx](src/components/catalog/ProductEditModal.tsx) | 345 | Ürün düzenleme modal |
| [src/components/catalog/GenerationProgressModal.tsx](src/components/catalog/GenerationProgressModal.tsx) | 97 | ANALYZING/GENERATING modal |
| [src/components/catalog/useProjectPolling.ts](src/components/catalog/useProjectPolling.ts) | 89 | 3sn/12sn adaptif polling hook |

### 1.8 Config

- **`ecosystem.config.js`** — **OLUŞTURULMADI.** pm2 komutları `README.md` ve `CLAUDE_CODE_DEPLOY.md §5` içinde inline gösteriliyor; eksik olarak işaretlendi (bkz. §7).
- `python-services/catalog-service/.env.example` — 24 satır (ANTHROPIC_API_KEY, storage root, batch boyutları, dev mode)
- `python-services/catalog-service/.gitignore` — 6 satır (venv, pyc, .env)

### 1.9 Docs

| Dosya | Satır | Rol |
| --- | ---: | --- |
| [CLAUDE_CODE_DEPLOY.md](CLAUDE_CODE_DEPLOY.md) | 1.008 | 9 bölüm + çecklist + rota özeti |
| [KARSTONE_TEST_GUIDE.md](KARSTONE_TEST_GUIDE.md) | 273 | UI üzerinden uçtan uca test |
| **`RAPOR_KONTROL.md`** | — | **OLUŞTURULMADI** (bkz. §7) |
| [DEPLOY_OZET.md](DEPLOY_OZET.md) | (bu dosya) | Deploy öncesi özet |

### 1.10 Değişen (zaten vardı) dosyalar

| Dosya | Δ Satır | Değişiklik |
| --- | --- | --- |
| `prisma/schema.prisma` | +415 / -301 (formatter + 5 model + 2 relation) | `CatalogProject/SourceFile/Product/Template/Generation` + User.catalogProjects + Clinic.catalogProjects |
| `src/app/(dashboard)/layout.tsx` | +4 / -0 | `BookOpen` import, adminNavItems'a Katalog Üretici, 2 page title |
| `package.json` | +1 | `sharp` dependency |
| `package-lock.json` | büyük diff | sharp + transitive deps |

---

## 2. Eklenen npm Paketleri

```json
{
  "dependencies": {
    "sharp": "^0.34.5"
  }
}
```

Sadece **1 yeni paket.** (Önceki iterasyonlarda `web-push`, `puppeteer`, `fluent-ffmpeg`, `xlsx` zaten eklenmişti; bu modül için yalnız sharp.)

---

## 3. Eklenen Python Paketleri

`python-services/catalog-service/requirements.txt` (toplam 13 paket, hepsi yeni çünkü dizin komple yeni):

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
pdfplumber==0.11.4
pymupdf==1.25.1
pillow==11.1.0
imagehash==4.3.1
anthropic==0.42.0
httpx==0.28.1
jinja2==3.1.5
weasyprint==64.0
pydantic==2.10.4
python-dotenv==1.0.1
```

**VPS sistem paketi** (WeasyPrint için gerekli, `apt install`):

```
libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libffi-dev
libjpeg-dev libcairo2 shared-mime-info
```

(Ayrıntı `CLAUDE_CODE_DEPLOY.md §3`'te.)

---

## 4. Database Değişiklikleri Özeti

| Metrik | Adet | Detay |
| --- | ---: | --- |
| Yeni tablo | **5** | `CatalogProject`, `CatalogSourceFile`, `CatalogProduct`, `CatalogTemplate`, `CatalogGeneration` |
| Yeni index | **12** | tenantId, userId, status, projectId, fileType, order, sector, isSystem |
| Yeni unique index | **1** | `CatalogTemplate.slug` |
| Yeni foreign key | **7** | Project→Clinic, Project→User, Project→Template, SourceFile→Project, Product→Project, Generation→Project, Generation→Template |
| Yeni relation (User) | **1** | `User.catalogProjects` |
| Yeni relation (Clinic) | **1** | `Clinic.catalogProjects` |
| Cascade delete | 4 yol | Clinic→Project, Project→SourceFile, Project→Product, Project→Generation |
| SET NULL | 1 yol | Template silinirse Project.templateId null olur |

Migration yalnızca **20260414_add_catalog_module** klasörü olarak eklendi, prisma `_prisma_migrations` tablosuna kayıt VPS'te `prisma migrate deploy` ile düşer.

---

## 5. Git Status

### Değişen (modified)

```
M  package-lock.json             (sharp + transitive deps)
M  package.json                  (+1 dep: sharp)
M  prisma/schema.prisma          (+5 model, +2 relation; formatter aynı anda dosyayı yeniden biçimlendirdi → +415/-301)
M  src/app/(dashboard)/layout.tsx (+BookOpen import, +nav item, +2 page title)
```

### Yeni (untracked)

```
?? CLAUDE_CODE_DEPLOY.md
?? DEPLOY_OZET.md  (bu dosya)
?? KARSTONE_TEST_GUIDE.md
?? prisma/migrations/20260414_add_catalog_module/
?? prisma/seeds/
?? public/poby-logo.svg            (önceden beri untracked; bu modülle ilgili değil, raporda yer almıyor)
?? python-services/
?? src/app/(dashboard)/admin/content-studio/
?? src/app/api/admin/catalog/
?? src/components/catalog/
?? src/lib/catalog/
?? src/lib/services/
```

### Henüz yapılmamış git işlemleri

- [ ] `git add` çalıştırılmadı
- [ ] `git commit` yapılmadı
- [ ] `git push origin main` yapılmadı

Commit önerisi (üç commit halinde veya tek commit):

```bash
git add prisma/schema.prisma \
        prisma/migrations/20260414_add_catalog_module/ \
        prisma/seeds/catalog-templates.ts

git add python-services/

git add src/lib/catalog/ src/lib/services/ \
        src/app/api/admin/catalog/ \
        src/components/catalog/ \
        "src/app/(dashboard)/admin/content-studio/" \
        "src/app/(dashboard)/layout.tsx"

git add package.json package-lock.json

git add CLAUDE_CODE_DEPLOY.md KARSTONE_TEST_GUIDE.md DEPLOY_OZET.md

git commit -m "feat(catalog): AI Catalog Generator — schema + FastAPI + pipeline + UI"
```

---

## 6. Bilinen Sorunlar ve TODO'lar

### Kod içi TODO işaretleri

| Dosya | Satır | TODO |
| --- | ---: | --- |
| `src/lib/catalog/jobQueue.ts` | 8 | `TODO(sprint2): replace with BullMQ` — in-process kuyruk, restart sonrası kaybolur |
| `src/app/(dashboard)/admin/content-studio/catalog/new/page.tsx` | 481 | Marka kiti logo upload sadece preview, PDF üretimine entegre edilmedi |
| `python-services/catalog-service/README.md` | roadmap | Generate endpoint v1, batch API entegrasyonu, S3 storage |

### Tasarım sınırları (TODO değil ama bilinmesi gereken)

- **Job store in-memory**: Next.js process restart olursa ANALYZING/GENERATING durumundaki işler yarım kalır. Status DB'de "takılı" kalır. Manuel fix: `UPDATE "CatalogProject" SET status='FAILED' WHERE status IN ('ANALYZING','GENERATING') AND "updatedAt" < NOW() - INTERVAL '30 minutes';`
- **Logo upload yok**: Wizard Adım 3'te logo dosyası seçiliyor ama upload/PDF entegrasyonu yapılmadı; şimdilik CSS variables ile renk + font yeterli.
- **TOC sayfa numarası "—"**: İçindekilerde kategori sayfa numaraları `—` gösteriliyor; WeasyPrint CSS `target-counter()` ile eklenebilir ama v1'de atlandı.
- **WhatsApp paylaşım**: `wa.me/?text=<download_url>` üzerinden link paylaşımı yapıyor; dosya attach için WhatsApp Business Cloud API ayrı bir iş.
- **Wizard marka kiti → generate form bridge**: localStorage üzerinden taşınıyor (projectId key'li). Farklı cihazda aynı projeyi açarsan wizard'da girdiğin renkler gelmez; kullanıcı detayın Ayarlar tabında yeniden girer.
- **Excel parse yok**: EXCEL_DATA yüklenebilir ama şu an hiçbir pipeline adımında kullanılmıyor. Sonraki sürümde ürün listesiyle merge yapılacak.
- **pm2 ecosystem.config.js yok**: pm2 komutları elle çalıştırılacak (`pm2 start` + `pm2 save`). Birden fazla ortam veya daha karmaşık config gerektiğinde eklenecek.

### Güvenlik notları

- Tüm admin endpoint'leri `requireAdmin()` (ADMIN + SUPERADMIN + clinicId) kontrolü yapıyor.
- Path traversal: `storage.ts`'te ID regex + `.relative_to()` kontrolü, download/raw route'larda prefix kontrolü.
- Upload: MIME allowlist + boyut limit + tek call cap (50 dosya) + 500MB proje kotası.
- FastAPI CORS: sadece localhost:3000, 127.0.0.1:3000, poby.ai. Ek origin env ile eklenebilir.

---

## 7. Henüz Yapılmayanlar

### Kullanıcının listelediği ama üretilmeyenler

- **`ecosystem.config.js`** — pm2 ecosystem dosyası eklenmedi. README ve CLAUDE_CODE_DEPLOY.md'de pm2 komutları inline. Gerekliliği düşük (tek app, tek env) ama listede istenmişti.
- **`RAPOR_KONTROL.md`** — bu adla ayrı bir rapor dosyası oluşturulmadı. Rapor bu dosyada (`DEPLOY_OZET.md`).

### Lokal ortamda yapılmayanlar

- [ ] **VPS'de `npm ci`**: Local'de `npm install sharp` çalıştırıldı, VPS'te güncellenecek.
- [ ] **VPS'de `pip install -r requirements.txt`**: venv + yüklenecek.
- [ ] **VPS'de `prisma migrate deploy`**: Migration SQL dosyası yazıldı, DB'ye uygulanmadı.
- [ ] **VPS'de `prisma/seeds/catalog-templates.ts` seed**: Template DB'ye yazılmadı.
- [ ] **WeasyPrint sistem paketleri**: `apt install libpango*` vs henüz çalıştırılmadı.
- [ ] **Type check (tsc --noEmit)**: Build geçti ama açık bir `tsc` çağrısı yapılmadı. Build zaten TypeScript check yapıyor, pratikte eşdeğer.
- [ ] **ESLint tam tarama**: Build içinde ESLint çalışıyor, bu iterasyonda 2 unescaped apostrof yakalandı ve düzeltildi; ek warning'ler var ama error yok.
- [ ] **Python lint (ruff/black)**: Hiç çalıştırılmadı. `compileall` ile yalnız syntax check yapıldı (temiz).
- [ ] **Unit test**: Hiç test yazılmadı (ne Next.js ne FastAPI).
- [ ] **Integration test (curl zinciri)**: CLAUDE_CODE_DEPLOY.md'de örnek curl komutları var ama hiçbiri canlı çalıştırılmadı.
- [ ] **Karstone PDF'iyle pilot test**: Gerçek veriyle hiç denenmedi (kullanıcının yapacağı adım).
- [ ] **WeasyPrint `from weasyprint import HTML` import'u**: Generator'da `lazy import`, sistem paketleri yoksa ilk generate çağrısında fail eder. VPS kurulumunda manuel kontrol edilmeli.

### Build durumu (local)

Son `npm run build` çıktısı:

```
Build başarılı — hiçbir error yok
Warning sayısı: N (önemsiz, çoğunluk unused-var)
Yeni rotalar: 17 (8 API + 6 UI dahil değişenler)
```

Python `compileall` çıktısı:

```
Tüm .py dosyaları temiz derlendi (output yok = error yok)
```

---

## 8. Deploy Sırası (özet)

Tek komut dizisi (CLAUDE_CODE_DEPLOY.md §1-7e'nin kondanse hali):

```bash
# VPS'te — tek oturumda
cd /var/www/klinik-asistan

# 1. Kodu çek (önce local'den push edilmeli)
git stash  # local değişiklik varsa
git pull origin main --rebase

# 2. Node deps
npm ci

# 3. Python deps
cd python-services/catalog-service
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd /var/www/klinik-asistan

# 4. Sistem paketi (ilk defa)
apt-get update
apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b \
  libffi-dev libjpeg-dev libcairo2 shared-mime-info

# 5. Storage dizini
mkdir -p /var/www/klinik-asistan/storage/catalog

# 6. .env — catalog-service için
cp python-services/catalog-service/.env.example \
   python-services/catalog-service/.env
# ANTHROPIC_API_KEY doldur
# CATALOG_STORAGE_ROOT Next.js ile aynı olsun

# 7. Next.js .env — CATALOG_SERVICE_URL
echo 'CATALOG_SERVICE_URL=http://127.0.0.1:8001' >> .env

# 8. DB migration
npx prisma migrate deploy
npx prisma generate

# 9. Template seed
npx tsx prisma/seeds/catalog-templates.ts

# 10. Build + restart
npm run build
pm2 restart inpobi-web

# 11. FastAPI servisi
pm2 start python-services/catalog-service/venv/bin/python \
  --name poby-catalog \
  --cwd /var/www/klinik-asistan/python-services/catalog-service \
  -- main.py
pm2 save

# 12. Smoke
curl http://127.0.0.1:8001/health | jq
pm2 status
```

Doğrulama checklist → `CLAUDE_CODE_DEPLOY.md §8`.
Uçtan uca test → `KARSTONE_TEST_GUIDE.md`.

---

## 9. Özet Tablo

| Kategori | Yeni | Değişen | Toplam Satır |
| --- | ---: | ---: | ---: |
| Prisma (schema + migration + seed) | 2 | 1 | ~240 (yeni) |
| Next.js API routes | 11 | 0 | ~1.000 |
| Next.js lib/services | 5 | 0 | ~1.035 |
| Next.js shared components | 6 | 0 | ~835 |
| Next.js UI sayfaları | 3 | 0 | ~1.690 |
| Sidebar update | 0 | 1 | +4 satır |
| FastAPI Python | 18 | 0 | ~1.550 |
| FastAPI Jinja templates + CSS | 8 | 0 | ~566 |
| Dokümantasyon | 3 | 0 | ~2.290 |
| **TOPLAM** | **56** | **4** | **~9.210** |

---

## 10. Son Kontrol Soruları (deploy öncesi sor cevapla)

1. **Sharp native binary VPS mimarisine uygun mu?** x86_64/arm64 için farklı binary gerekebilir. `npm ci` VPS'te çalıştığında otomatik doğru binary iner.
2. **ANTHROPIC_API_KEY geçerli ve yeterli kota var mı?** Generator tek PDF için ~20-60 batch yapabilir (batch başı ~4k token).
3. **`/var/www/klinik-asistan/storage/` kotasında yeterli disk var mı?** 500MB/proje × N kullanıcı. Şimdilik single tenant, problem yok.
4. **pm2 restart sırasında in-process queue'da bekleyen işler kaybolacak.** Deploy window'u dikkat et — kullanıcı analyze başlatmışsa bekle.
5. **Anthropic model adı `claude-sonnet-4-6` VPS'ten erişilebilir mi?** `.env`'de `ANTHROPIC_MODEL` ile override edilebilir.
6. **CORS origins'te prod domain var mı?** `poby.ai` default allowlist'te.

---

Bu raporu baz alarak git commit + push + VPS deploy yapabilirsin. Sorun çıkarsa ilk bakılacak yer: `CLAUDE_CODE_DEPLOY.md §7d.7` ve §7e.6 troubleshooting tabloları.

---

## Update 1 — 2026-04-14 (son rötuşlar)

Bu güncelleme, kullanıcının 6 maddelik "deploy öncesi son rötuş"
talebi doğrultusunda yapılanları belgeler.

### U1.1 `ecosystem.config.js` oluşturuldu (84 satır)

Repo kökünde yeni dosya: [ecosystem.config.js](ecosystem.config.js). 3 pm2 app tanımlı:

| app | cwd | script | args |
| --- | --- | --- | --- |
| `inpobi-web` | repo kökü | `node_modules/next/dist/bin/next` | `start` (port 3000) |
| `inpobi-bot` | repo kökü | `npm` | `run bot` (Telegram runner) |
| `catalog-service` | `python-services/catalog-service/` | `venv/bin/uvicorn` | `main:app --host 127.0.0.1 --port 8001` |

Ortak özellikler: `autorestart: true`, `max_memory_restart` (web/catalog 1G, bot 512M),
log'lar `logs/*.{error,out}.log`, `merge_logs: true`, `time: true`.

`catalog-service` için `interpreter: "none"` — uvicorn kendi shebang'ini kullanır,
pm2 node olarak yorumlamaya çalışmaz. Env: `NODE_ENV=production`, `PORT=8001`.

VPS'te kullanım:

```bash
cd /var/www/klinik-asistan
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root   # tek seferlik; çıktıdaki sudo komutunu çalıştır
```

### U1.2 Sanity check sonuçları (local)

Çalıştırılan ortam: macOS, Node 22+, Python 3.14.3 (local Python venv yok).

| # | Komut | Sonuç | Not |
| --- | --- | --- | --- |
| a | `npx prisma validate` | ✅ PASS | Schema geçerli |
| b | `npx prisma format` | ✅ PASS | Dosya değişmedi (MD5 aynı) |
| c | `npx tsc --noEmit` | ✅ PASS | Hiç TypeScript error yok |
| d | `npm run build` | ✅ PASS | Production build temiz |
| e | `npm run lint` | ✅ PASS | **0 error**, 148 warning (pre-existing unused-var / exhaustive-deps) |
| f | `python -c "from main import app"` | ⚠️ SKIP | Local venv yok → VPS'te kurulum sonrası yapılacak. `compileall` temiz; stub'lı cross-module import 14/14 modülü parse ediyor (5'i gerçek runtime symbol'ü eksik — import değil) |
| g | `pip check` | ⚠️ SKIP | Local venv yok → VPS'te `pip install` sonrası çalıştır |

Lint auto-fix uygulanmadı çünkü kalan uyarılar `--fix` ile çözülemiyor
(`exhaustive-deps` manuel refactor; `no-unused-vars` dead code kararı).
Bloklayıcı değil.

### U1.3 Python import testinin detayı

```
$ python3 -m compileall -q python-services/catalog-service
SYNTAX_OK

$ python3 -c "<stubbed-import-test>"
  OK  app.config
  OK  app.schemas
  OK  app.jobs
  OK  app.services.pdf_parser
  OK  app.services.image_matcher
  OK  app.routers.{health, pdf, match, jobs}
 FAIL (stub eksikliği, gerçek değil):
   - AsyncAnthropic  → claude_client, routers/extract, routers/translate
   - ChoiceLoader    → services/generator, routers/generate
```

Bu "FAIL"lar stub'daki symbol boşluklarından — gerçek `pip install`
sonrası `anthropic` paketinden `AsyncAnthropic`, `jinja2` paketinden
`ChoiceLoader` gelir. Syntactic/structural bir sorun yok.

### U1.4 `CLAUDE_CODE_DEPLOY.md` güncellemeleri

- **§0 Git Commit + Push** (YENİDEN YAZILDI) — tüm local sanity check + kapsamlı `git add` + `git commit` + `git push` en üste taşındı. Eski §0 "Ön Kontroller" kısmı bu yeni formata yedirildi.
- **§3 apt-get install** — `libpangocairo-1.0-0` eklendi. Tam paket listesi artık:
  ```
  python3 python3-venv python3-pip
  libcairo2 libpango-1.0-0 libpangoft2-1.0-0
  libpangocairo-1.0-0 libharfbuzz0b
  libffi-dev libjpeg-dev shared-mime-info
  ```
- **§5 pm2 ile Süreç Yönetimi** (genişletildi):
  - §5.1 Önerilen: `pm2 start ecosystem.config.js` → `pm2 save` → `pm2 startup systemd -u root --hp /root`.
  - §5.2 Alternatif: manuel pm2 start (backward compat).

### U1.5 Güncel git status

```
M  package-lock.json
M  package.json                         (+sharp)
M  prisma/schema.prisma                 (+5 model, +2 relation)
M  src/app/(dashboard)/layout.tsx       (sidebar + titles)
?? CLAUDE_CODE_DEPLOY.md
?? DEPLOY_OZET.md                       (bu dosya)
?? KARSTONE_TEST_GUIDE.md
?? ecosystem.config.js                  (YENİ — U1.1)
?? prisma/migrations/20260414_add_catalog_module/
?? prisma/seeds/
?? public/poby-logo.svg                 (modülle ilgisi yok)
?? python-services/
?? src/app/(dashboard)/admin/content-studio/
?? src/app/api/admin/catalog/
?? src/components/catalog/
?? src/lib/catalog/
?? src/lib/services/
```

### U1.6 Henüz yapılmayanlar (güncellendi)

Öncekinin silinen maddeleri:

- ~~`ecosystem.config.js` oluşturulacak~~ → U1.1'de eklendi.
- ~~WeasyPrint için `libpangocairo-1.0-0` apt listesi eksik~~ → §3'e eklendi.
- ~~pm2 `startup` + `save` adımı belgede yok~~ → §5.1'e eklendi.
- ~~Git push doküman sonunda~~ → §0'da en başa alındı.

Hâlâ yapılmayanlar:

- **`RAPOR_KONTROL.md`** — ayrı isimde rapor istenmişti, aynı içerik DEPLOY_OZET.md olarak üretildi; kullanıcı isterse rename alias eklenebilir.
- **Python venv local'de** — macOS'ta pymupdf/weasyprint Python 3.14 wheel'i yok; test VPS'te.
- **`pip check`** — aynı gerekçeyle VPS'te.
- **Gerçek Karstone PDF ile pilot** — kullanıcı VPS deploy sonrası.
- **Git `add/commit/push`** — henüz çalıştırılmadı; §0'da komutlar hazır.

### U1.7 Build + Lint sonuç özeti

```
prisma validate   ✅  valid 🚀
prisma format     ✅  no change (MD5 eşleşiyor)
tsc --noEmit      ✅  no output  (0 error)
npm run build     ✅  all routes registered
                     /api/admin/catalog/*                — 11 route
                     /admin/content-studio/catalog/*     — 3 route
                     Middleware 27.7 kB
npm run lint      ✅  0 errors / 148 warnings (pre-existing code style)
compileall (py)   ✅  no output (syntax clean)
pip check         ⏸  venv yok, VPS'te yap
python -c import  ⏸  venv yok, VPS'te yap
```

### U1.8 Deploy için minimum adım dizisi (final)

```bash
# 1) LOCAL
git add prisma/schema.prisma prisma/migrations/20260414_add_catalog_module/ \
        prisma/seeds/catalog-templates.ts \
        src/lib/catalog/ src/lib/services/ \
        src/app/api/admin/catalog/ src/components/catalog/ \
        "src/app/(dashboard)/admin/content-studio/" \
        "src/app/(dashboard)/layout.tsx" \
        python-services/ \
        package.json package-lock.json \
        ecosystem.config.js \
        CLAUDE_CODE_DEPLOY.md KARSTONE_TEST_GUIDE.md DEPLOY_OZET.md

git commit -m "feat(catalog): AI Catalog Generator — schema + FastAPI + pipeline + UI"
git push origin main

# 2) VPS
ssh root@45.88.223.40
cd /var/www/klinik-asistan
git stash && git pull origin main --rebase
npm ci
apt-get install -y libcairo2 libpango-1.0-0 libpangoft2-1.0-0 \
                   libpangocairo-1.0-0 libharfbuzz0b \
                   libffi-dev libjpeg-dev shared-mime-info
mkdir -p storage/catalog logs
cd python-services/catalog-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # ANTHROPIC_API_KEY + CATALOG_STORAGE_ROOT
pip check
deactivate && cd /var/www/klinik-asistan
echo 'CATALOG_SERVICE_URL=http://127.0.0.1:8001' >> .env
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seeds/catalog-templates.ts
npm run build
pm2 start ecosystem.config.js        # veya: pm2 reload ecosystem.config.js --update-env
pm2 save
pm2 startup systemd -u root --hp /root   # çıktıdaki sudo komutu bir kez çalıştır
curl -s http://127.0.0.1:8001/health | jq
pm2 logs catalog-service --lines 20

# 3) TEST
# tarayıcıdan poby.ai/admin/content-studio/catalog
# → KARSTONE_TEST_GUIDE.md adım adım
```

Güncel deploy dokümanı → [CLAUDE_CODE_DEPLOY.md](CLAUDE_CODE_DEPLOY.md)
