# Catalog Module — Deployment Adımları

> Bu dosya `AI Catalog Generator` modülünün VPS'e deploy edilmesi için
> izlenecek adımları anlatır. Schema ve FastAPI iskeleti hazır, ama
> **migration uygulanmadı** ve **VPS'e yüklenmedi**. Sen kontrol edip
> hazır olduğunda aşağıdaki komutları sırayla çalıştır.

---

## 0. Git Commit + Push (local — HER ŞEYDEN ÖNCE)

**Tüm VPS adımları bundan sonra gelir.** Öncelikle local'de üretilmiş
tüm dosyaların commit edilip origin'e push edilmiş olması şart,
aksi halde VPS `git pull` boş döner.

```bash
# Son sanity check
DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma validate
npx tsc --noEmit
npm run build
```

Commit (tek commit — tercih edersen aşağıdaki gruplara bölebilirsin):

```bash
# Database
git add prisma/schema.prisma \
        prisma/migrations/20260414_add_catalog_module/ \
        prisma/seeds/catalog-templates.ts

# Backend (Next.js)
git add src/lib/catalog/ src/lib/services/ \
        src/app/api/admin/catalog/ \
        src/components/catalog/ \
        "src/app/(dashboard)/admin/content-studio/" \
        "src/app/(dashboard)/layout.tsx"

# FastAPI
git add python-services/

# Bağımlılıklar
git add package.json package-lock.json

# pm2 + docs
git add ecosystem.config.js \
        CLAUDE_CODE_DEPLOY.md \
        KARSTONE_TEST_GUIDE.md \
        DEPLOY_OZET.md

git commit -m "feat(catalog): AI Catalog Generator — schema + FastAPI + pipeline + UI"
git push origin main
```

Push'tan sonra GitHub'da `origin/main` başında yeni commit görünmeli;
VPS'teki `git pull` artık bu noktadan itibaren çalışacak.

---

## 1. VPS'e Çekme

```bash
ssh root@45.88.223.40
cd /var/www/klinik-asistan
git stash  # local değişiklik varsa
git pull origin main --rebase
```

---

## 2. Prisma Migration Uygulama

> Bu adım veritabanına 5 yeni tablo ekler. Geri alınabilir değil, önce yedek alın.

```bash
# Veritabanı yedeği
pg_dump "postgresql://klinik:KlinikAsistan2026@localhost:5432/klinikasistan" \
  > /root/backups/klinikasistan-$(date +%Y%m%d-%H%M).sql

# Migration uygula
cd /var/www/klinik-asistan
npx prisma migrate deploy

# Prisma client yenile
npx prisma generate

# Next.js yeniden build + restart
npm run build
pm2 restart inpobi-web
```

Eğer `migrate deploy` kullanamıyorsan (örneğin migration lock uyumsuzluğu)
doğrudan SQL ile uygulayabilirsin:

```bash
psql "postgresql://klinik:KlinikAsistan2026@localhost:5432/klinikasistan" \
  -f prisma/migrations/20260414_add_catalog_module/migration.sql

# Prisma migrations tablosuna kaydı elle ekle
psql "postgresql://klinik:KlinikAsistan2026@localhost:5432/klinikasistan" -c "
INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count, finished_at)
VALUES (gen_random_uuid()::text, 'manual', '20260414_add_catalog_module', NOW(), 1, NOW());
"
```

Doğrula:

```bash
psql "postgresql://klinik:KlinikAsistan2026@localhost:5432/klinikasistan" -c "\dt Catalog*"
```

Beklenen çıktı:

```
 Catalog | CatalogGeneration  | table
 Catalog | CatalogProduct     | table
 Catalog | CatalogProject     | table
 Catalog | CatalogSourceFile  | table
 Catalog | CatalogTemplate    | table
```

---

## 3. Python Sistem Bağımlılıkları

WeasyPrint PDF üretimi için sistem kütüphaneleri şart:

```bash
apt-get update
apt-get install -y \
  python3 python3-venv python3-pip \
  libcairo2 libpango-1.0-0 libpangoft2-1.0-0 \
  libpangocairo-1.0-0 libharfbuzz0b \
  libffi-dev libjpeg-dev shared-mime-info
```

Python versiyonunu kontrol et (3.10+ gerekli):

```bash
python3 --version
```

---

## 4. Catalog Service Kurulumu

```bash
cd /var/www/klinik-asistan/python-services/catalog-service

# Sanal ortam
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Env
cp .env.example .env
nano .env
# ANTHROPIC_API_KEY değerini gir
```

Health testi:

```bash
python main.py &
sleep 3
curl http://127.0.0.1:8001/health
# -> {"service":"poby-catalog-service","version":"0.1.0","status":"ok"}
kill %1
deactivate
```

---

## 5. pm2 ile Süreç Yönetimi

### 5.1 Önerilen: `ecosystem.config.js` (tüm süreçler tek dosyada)

Repo kökünde `ecosystem.config.js` var. İçinde 3 app tanımlı:
`inpobi-web` (Next.js), `inpobi-bot` (Telegram bot), `catalog-service`
(FastAPI uvicorn).

```bash
cd /var/www/klinik-asistan
mkdir -p logs

# İlk deploy'da: tüm süreçleri tanımla
pm2 start ecosystem.config.js

# Sonraki değişikliklerde (kod pull sonrası):
pm2 reload ecosystem.config.js --update-env

# pm2 listesini kalıcı olarak kaydet — reboot sonrası otomatik başlasın
pm2 save

# Sunucu reboot sonrası pm2'nin otomatik ayağa kalkması için (tek seferlik)
pm2 startup systemd -u root --hp /root
# Yukarıdaki komut bir sudo ... satırı çıktı verirse onu aynen çalıştır.

# Doğrula
pm2 list
pm2 logs catalog-service --lines 20
```

### 5.2 Alternatif: manuel pm2 start (ecosystem dosyası olmadan)

```bash
cd /var/www/klinik-asistan/python-services/catalog-service
pm2 start venv/bin/uvicorn \
  --name catalog-service \
  --cwd /var/www/klinik-asistan/python-services/catalog-service \
  --interpreter none \
  -- main:app --host 127.0.0.1 --port 8001

pm2 save
pm2 logs catalog-service --lines 20
```

### Alternatif: systemd

```bash
cat > /etc/systemd/system/poby-catalog.service <<'EOF'
[Unit]
Description=Poby AI Catalog Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/klinik-asistan/python-services/catalog-service
Environment="PATH=/var/www/klinik-asistan/python-services/catalog-service/venv/bin"
EnvironmentFile=/var/www/klinik-asistan/python-services/catalog-service/.env
ExecStart=/var/www/klinik-asistan/python-services/catalog-service/venv/bin/python main.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable poby-catalog
systemctl start poby-catalog
systemctl status poby-catalog
```

---

## 6. Next.js Tarafı için Hazırlık

Şu an Next.js tarafında henüz route/UI yok. Eklendiğinde
servis adresini ortama tanıt:

```bash
echo 'CATALOG_SERVICE_URL=http://127.0.0.1:8001' >> /var/www/klinik-asistan/.env
pm2 restart inpobi-web
```

---

## 7. Geri Alma (Rollback) Senaryosu

Migration geri almak gerekirse (veri kaybı olur):

```bash
psql "postgresql://klinik:KlinikAsistan2026@localhost:5432/klinikasistan" <<'SQL'
DROP TABLE IF EXISTS "CatalogGeneration" CASCADE;
DROP TABLE IF EXISTS "CatalogProduct" CASCADE;
DROP TABLE IF EXISTS "CatalogSourceFile" CASCADE;
DROP TABLE IF EXISTS "CatalogProject" CASCADE;
DROP TABLE IF EXISTS "CatalogTemplate" CASCADE;
DELETE FROM _prisma_migrations WHERE migration_name = '20260414_add_catalog_module';
SQL
```

Catalog service'i durdur:

```bash
pm2 delete poby-catalog
# veya
systemctl stop poby-catalog && systemctl disable poby-catalog
```

---

## 7b. File Upload Sistemi (Next.js tarafı)

Bu bölüm `AI Catalog Generator` modülünün **file upload API**
katmanını VPS'e indirir, bağımlılık kurar ve duman testleri yapar.

### 7b.1 Kod güncelleme

```bash
cd /var/www/klinik-asistan
git pull origin main --rebase
```

Yeni gelenler:

- `src/lib/catalog/storage.ts` — storage path builder, validation, sharp
  ile resim işleme, thumbnail üretimi, kota hesaplama.
- `src/lib/catalog/auth.ts` — `requireAdmin()` helper (ADMIN / SUPERADMIN).
- `src/app/api/admin/catalog/projects/route.ts` — `POST`, `GET`
- `src/app/api/admin/catalog/projects/[id]/route.ts` — `GET`, `DELETE`
- `src/app/api/admin/catalog/projects/[id]/upload/route.ts` — `POST`
- `src/app/api/admin/catalog/projects/[id]/files/route.ts` — `GET`
- `src/app/api/admin/catalog/files/[fileId]/route.ts` — `DELETE`

### 7b.2 Bağımlılıklar

`sharp` eklendi (`package.json`):

```bash
npm install
# veya zaten kuruluysa
npm ci
```

> `sharp` linuxarm/x64 prebuilt binary indirir; VPS’te ilk
> kurulumda internet erişimi gerekir. Build sunucusu
> ARM ise `npm install --arch=x64 --platform=linux sharp` gerekebilir.

### 7b.3 Storage dizini

Uygulama dosyaları disk üzerinde tutacağı için tek seferlik izin ve
ağaç kurulumu gerekir:

```bash
# Kök dizin (env ile override edilebilir; default: /var/www/klinik-asistan/storage)
mkdir -p /var/www/klinik-asistan/storage/catalog

# Sahiplik — pm2'yi hangi user ile çalıştırıyorsan onu ver.
# Tek kullanıcılı VPS'lerde genelde root:
chown -R root:root /var/www/klinik-asistan/storage
chmod 750 /var/www/klinik-asistan/storage
```

Per-klinik alt dizinler API içinden ihtiyaç anında `ensureProjectDirs()`
tarafından otomatik açılır (`{tenantId}/{projectId}/{source|photos|data|output}`
ve `photos/thumbs/`).

### 7b.4 Env değişkenleri (opsiyonel)

```bash
# Varsayılanlar yeterli. Override etmek istersen:
echo 'CATALOG_STORAGE_ROOT=/var/www/klinik-asistan/storage' >> .env
echo 'CATALOG_PROJECT_QUOTA_BYTES=524288000' >> .env   # 500MB
```

### 7b.5 Build + Restart

```bash
npx prisma generate        # CatalogProject tipleri için şart
npm run build
pm2 restart inpobi-web
pm2 logs inpobi-web --lines 20
```

Build çıktısında şu route'lar görünmeli:

```
ƒ /api/admin/catalog/projects
ƒ /api/admin/catalog/projects/[id]
ƒ /api/admin/catalog/projects/[id]/files
ƒ /api/admin/catalog/projects/[id]/upload
ƒ /api/admin/catalog/files/[fileId]
```

### 7b.6 Duman testleri (curl)

Tüm endpoint'ler `requireAdmin()` arkasında → oturum cookie'si şart.
Tarayıcıda `poby.ai/admin` girişi yaptıktan sonra cookie'yi `curl -b`
ile kullanmak pratik.

Bir kereye mahsus cookie export:

```bash
# Tarayıcıda DevTools → Application → Cookies → __Secure-next-auth.session-token
# Değeri kopyala, VPS'te:
export COOKIE='__Secure-next-auth.session-token=eyJhbGciOiJ...'
export BASE='https://poby.ai'
```

> Local test için `http://localhost:3000` ve
> `next-auth.session-token` kullan.

**a) Proje oluştur**

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Deneme Kataloğu","description":"test"}'
# → {"project":{"id":"cmnx...","status":"DRAFT",...}, "quotaBytes":524288000}
```

Dönen `project.id`'yi değişkene at:

```bash
export PID=<dönen-id>
```

**b) Projeleri listele**

```bash
curl -s "$BASE/api/admin/catalog/projects" -H "Cookie: $COOKIE" | jq .
```

**c) Proje detayı**

```bash
curl -s "$BASE/api/admin/catalog/projects/$PID" -H "Cookie: $COOKIE" | jq .
```

**d) PDF yükle**

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects/$PID/upload" \
  -H "Cookie: $COOKIE" \
  -F "fileType=REFERENCE_PDF" \
  -F "files=@/tmp/sample.pdf" | jq .
```

**e) Görsel yükle (çoklu)**

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects/$PID/upload" \
  -H "Cookie: $COOKIE" \
  -F "fileType=PRODUCT_IMAGE" \
  -F "files=@/tmp/p1.jpg" \
  -F "files=@/tmp/p2.png" | jq .
# Dönüş: uploaded[{ storagePath: "catalog/<tenant>/<proj>/photos/1234_..._*.webp" }]
# Thumbnail: aynı dizindeki /thumbs/thumb_*.webp altında
```

**f) Excel yükle**

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects/$PID/upload" \
  -H "Cookie: $COOKIE" \
  -F "fileType=EXCEL_DATA" \
  -F "files=@/tmp/products.xlsx" | jq .
```

**g) Dosyaları listele**

```bash
curl -s "$BASE/api/admin/catalog/projects/$PID/files" -H "Cookie: $COOKIE" | jq .
# Sadece belirli tür:
curl -s "$BASE/api/admin/catalog/projects/$PID/files?fileType=PRODUCT_IMAGE" \
  -H "Cookie: $COOKIE" | jq .
```

**h) Dosya sil**

```bash
export FID=<dosya-id>
curl -s -X DELETE "$BASE/api/admin/catalog/files/$FID" \
  -H "Cookie: $COOKIE" | jq .
```

**i) Proje sil (cascade — dosyaları da siler)**

```bash
curl -s -X DELETE "$BASE/api/admin/catalog/projects/$PID" \
  -H "Cookie: $COOKIE" | jq .
```

### 7b.7 Disk doğrulama

```bash
ls -lh /var/www/klinik-asistan/storage/catalog/*/*/{source,photos,data,output}/ 2>/dev/null
# Silme sonrası ilgili proje klasörü kalkmış olmalı.
```

---

## 7c. PDF Analiz + AI Extraction (catalog-service)

Bu bölüm **Python catalog-service**'in analiz uçlarını (v0.2) aktive eder
ve Next.js tarafındaki `CatalogService.ts` client'ını devreye alır.

### 7c.1 Kod güncelleme

```bash
cd /var/www/klinik-asistan
git pull origin main --rebase
```

Yeni gelenler:

- `python-services/catalog-service/app/` (config, jobs, schemas, routers, services)
- `python-services/catalog-service/main.py` (router mount + job sweeper)
- `python-services/catalog-service/requirements.txt` (`imagehash`, `httpx` eklendi)
- `python-services/catalog-service/.env.example` (storage root, model, batch boyutları)
- `src/lib/services/CatalogService.ts` (Next.js → FastAPI client)

### 7c.2 Python bağımlılıklarını güncelle

```bash
cd /var/www/klinik-asistan/python-services/catalog-service
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

`imagehash` yeni — PIL üzerine inşa edilir. WeasyPrint için kurulan sistem
kütüphaneleri bu adımda da yeterlidir.

### 7c.3 .env kontrolü

```bash
cat /var/www/klinik-asistan/python-services/catalog-service/.env
```

Zorunlu / önerilen değerler:

```
ANTHROPIC_API_KEY=sk-ant-...
CATALOG_STORAGE_ROOT=/var/www/klinik-asistan/storage   # Next.js storage ile aynı
# ANTHROPIC_MODEL=claude-sonnet-4-6
# CATALOG_EXTRACT_BATCH=5
# CATALOG_TRANSLATE_BATCH=10
```

> `CATALOG_STORAGE_ROOT`, Next.js `src/lib/catalog/storage.ts` içindeki
> kök ile **aynı** olmak zorunda. Next.js relative path gönderir,
> FastAPI bu köke göre çözer. Farklı olursa dosya bulunamaz.

### 7c.4 Servisi yeniden başlat

pm2 ile:

```bash
pm2 restart poby-catalog
pm2 logs poby-catalog --lines 30
```

systemd ile:

```bash
systemctl restart poby-catalog
journalctl -u poby-catalog -n 40 -f
```

### 7c.5 Next.js tarafına env ekle

```bash
grep CATALOG_SERVICE_URL /var/www/klinik-asistan/.env \
  || echo 'CATALOG_SERVICE_URL=http://127.0.0.1:8001' >> /var/www/klinik-asistan/.env

pm2 restart inpobi-web
```

### 7c.6 Duman testleri (curl)

```bash
# Health — Anthropic anahtarı görünüyor mu?
curl -s http://127.0.0.1:8001/health | jq
# "anthropic_configured": true olmalı.

# 1) PDF analizini başlat
JOB=$(curl -s -X POST http://127.0.0.1:8001/parse-pdf \
  -H "Content-Type: application/json" \
  -d '{"pdf_path":"catalog/<TENANT>/<PROJECT>/source/sample.pdf"}' \
  | jq -r .job_id)
echo "parse job: $JOB"

# 2) Tamamlanmasını bekle
until curl -s http://127.0.0.1:8001/jobs/$JOB \
  | jq -e '.status == "completed" or .status == "failed"' > /dev/null; do
  curl -s http://127.0.0.1:8001/jobs/$JOB \
    | jq -r '"  \(.status) \((.progress // 0)*100|floor)% \(.message // "")"'
  sleep 2
done

# 3) Pages dizisini al, extract-products'a yolla
PARSED=$(curl -s http://127.0.0.1:8001/jobs/$JOB | jq .result)

JOB2=$(curl -s -X POST http://127.0.0.1:8001/extract-products \
  -H "Content-Type: application/json" \
  -d "$(echo $PARSED | jq '{pages: .pages, sector: "NATURAL_STONE"}')" \
  | jq -r .job_id)
echo "extract job: $JOB2"

# 4) Ürünleri bekle
until curl -s http://127.0.0.1:8001/jobs/$JOB2 \
  | jq -e '.status == "completed" or .status == "failed"' > /dev/null; do
  sleep 2
done
curl -s http://127.0.0.1:8001/jobs/$JOB2 | jq '.result.products | length'

# 5) Çeviri (isteğe bağlı — kaynak!=hedef dili için)
curl -s http://127.0.0.1:8001/jobs/$JOB2 | jq '.result.products' \
  | jq -c '{products: ., source_language: "en", target_language: "tr"}' \
  | curl -s -X POST http://127.0.0.1:8001/translate \
      -H "Content-Type: application/json" -d @- | jq

# 6) Eşleştirme (uploaded photos + pdf extracted images)
cat <<EOF | curl -s -X POST http://127.0.0.1:8001/match-images \
  -H "Content-Type: application/json" -d @- | jq
{
  "products": $(curl -s http://127.0.0.1:8001/jobs/$JOB2 | jq .result.products),
  "photo_files": [
    "catalog/<TENANT>/<PROJECT>/photos/xxx.webp"
  ],
  "extracted_images": $(echo $PARSED | jq .extracted_images),
  "phash_threshold": 10
}
EOF
```

### 7c.7 Next.js → FastAPI duman testi (server-side)

`CatalogService` sadece sunucu tarafında (API route, cron, vb.) çağrılmalı.
Hızlı doğrulama için tek seferlik bir script:

```bash
cd /var/www/klinik-asistan
node -e "
const { CatalogService } = require('./.next/standalone/src/lib/services/CatalogService.js');
CatalogService.health().then(console.log).catch(console.error);
"
```

(Veya geliştirme sırasında bir test API route'u ekleyip tarayıcıdan çağır.)

### 7c.8 Troubleshooting

| Belirti | Olası sebep | Çözüm |
| --- | --- | --- |
| `anthropic_configured: false` | `.env` içinde `ANTHROPIC_API_KEY` yok | `.env` ekle, servisi restart |
| `invalid path: path escapes storage root` | `pdf_path` CATALOG_STORAGE_ROOT dışında | Relative path gönder, yoksa root'u düzelt |
| Job `failed` + `FileNotFoundError` | Next.js `storagePath` ile FastAPI kökü uyuşmuyor | `CATALOG_STORAGE_ROOT` iki tarafta eşleş |
| `no JSON structure found in model output` | Model beklenmedik formatta yanıtladı | Batch'i böl (ör. `CATALOG_EXTRACT_BATCH=3`) |
| pHash tamamen başarısız | `PIL` görseli açamıyor | İlgili dosya kayıtlara (`pm2 logs`) bakıp manuel incele |

---

## 7d. PDF Üretim + Pipeline (analyze/generate/download)

Bu bölüm ilk şablonu (`natural-stone-modern`) devreye alır, FastAPI'ye
`/generate-catalog` uç noktasını ekler ve Next.js tarafında uçtan uca
pipeline route'larını aktive eder.

### 7d.1 Kod güncelleme

```bash
cd /var/www/klinik-asistan
git pull origin main --rebase
```

Yeni / değişen dosyalar:

- `python-services/catalog-service/templates/natural-stone-modern/*`
  (main, cover, toc, divider, product, back, styles.css, assets/)
- `python-services/catalog-service/app/services/generator.py`
- `python-services/catalog-service/app/routers/generate.py`
- `python-services/catalog-service/app/schemas.py` (GenerateCatalog* eklendi)
- `python-services/catalog-service/main.py` (generate router mount)
- `prisma/seeds/catalog-templates.ts`
- `src/lib/catalog/jobQueue.ts`
- `src/lib/catalog/pipeline.ts`
- `src/app/api/admin/catalog/projects/[id]/analyze/route.ts`
- `src/app/api/admin/catalog/projects/[id]/generate/route.ts`
- `src/app/api/admin/catalog/projects/[id]/download/route.ts`

### 7d.2 Catalog-service: bağımlılık ve restart

`requirements.txt` değişmedi (WeasyPrint + Jinja2 zaten vardı). Yine de
`venv`'de eksik paket olmadığından emin ol:

```bash
cd /var/www/klinik-asistan/python-services/catalog-service
source venv/bin/activate
pip install -r requirements.txt
deactivate

pm2 restart poby-catalog
pm2 logs poby-catalog --lines 20
```

WeasyPrint sistem bağımlılıkları için § 3 kurulu olmalı.

### 7d.3 Prisma template seed

```bash
cd /var/www/klinik-asistan
npx tsx prisma/seeds/catalog-templates.ts
# beklenen: [seed] created natural-stone-modern
```

Tekrar çalıştırmak idempotent (upsert).

### 7d.4 Next.js: build + restart

```bash
npx prisma generate
npm run build
pm2 restart inpobi-web
pm2 logs inpobi-web --lines 20
```

Build çıktısında 8 yeni/var olan catalog route'u görünmeli:

```
/api/admin/catalog/projects
/api/admin/catalog/projects/[id]
/api/admin/catalog/projects/[id]/upload
/api/admin/catalog/projects/[id]/files
/api/admin/catalog/projects/[id]/analyze
/api/admin/catalog/projects/[id]/generate
/api/admin/catalog/projects/[id]/download
/api/admin/catalog/files/[fileId]
```

### 7d.5 Karstone uçtan uca test akışı

**Önkoşul**: Admin olarak giriş yap, session cookie'sini çıkart:

```bash
export COOKIE='__Secure-next-auth.session-token=...'
export BASE='https://poby.ai'
```

#### Adım 1 — Proje oluştur

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects" \
  -H "Cookie: $COOKIE" -H "Content-Type: application/json" \
  -d '{"name":"Karstone 2026 Koleksiyonu","targetLanguage":"tr"}' | jq
export PID=<dönen-id>
```

#### Adım 2 — Test PDF yükle

Karstone kataloğunun (veya örnek PDF'in) yolu VPS'te `/root/karstone.pdf`
diyelim:

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects/$PID/upload" \
  -H "Cookie: $COOKIE" \
  -F "fileType=REFERENCE_PDF" \
  -F "files=@/root/karstone.pdf" | jq
```

#### Adım 3 — Ürün fotoğraflarını yükle (çoklu)

Dosya adları ürün koduyla eşleşirse (örn. `URN-001.jpg`) filename
matching devreye girer; eşleşmezse PDF'den çıkartılmış görsellere
pHash fallback kullanılır.

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects/$PID/upload" \
  -H "Cookie: $COOKIE" \
  -F "fileType=PRODUCT_IMAGE" \
  -F "files=@/root/photos/URN-001.jpg" \
  -F "files=@/root/photos/URN-002.jpg" \
  -F "files=@/root/photos/URN-003.jpg" | jq
```

#### Adım 4 — Analyze pipeline'ı tetikle

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects/$PID/analyze" \
  -H "Cookie: $COOKIE" -H "Content-Type: application/json" \
  -d '{"sector":"NATURAL_STONE","brand":"Karstone"}' | jq
# → {"queued": true, "status": "ANALYZING"}
```

Durum izle:

```bash
until curl -s "$BASE/api/admin/catalog/projects/$PID" -H "Cookie: $COOKIE" \
  | jq -e '.project.status == "READY_TO_GENERATE" or .project.status == "FAILED"' > /dev/null; do
  curl -s "$BASE/api/admin/catalog/projects/$PID" -H "Cookie: $COOKIE" \
    | jq -r '.project.status'
  sleep 5
done
```

FastAPI tarafındaki job ilerlemesini aynı anda izleyebilirsin:

```bash
pm2 logs poby-catalog --lines 40 --nostream
```

Tamamlanınca ürün sayısı:

```bash
curl -s "$BASE/api/admin/catalog/projects/$PID" -H "Cookie: $COOKIE" \
  | jq '.project._count.products'
```

#### Adım 5 — PDF üret

```bash
curl -s -X POST "$BASE/api/admin/catalog/projects/$PID/generate" \
  -H "Cookie: $COOKIE" -H "Content-Type: application/json" \
  -d '{
    "templateSlug": "natural-stone-modern",
    "brandKit": {
      "primary": "#1C2332",
      "secondary": "#F5F1EC",
      "accent": "#B8956A",
      "fontFamily": "Inter"
    },
    "metadata": {
      "title": "Karstone Doğal Taş Koleksiyonu",
      "subtitle": "2026 Edisyonu",
      "companyName": "Karstone",
      "edition": "Vol. 01",
      "year": 2026,
      "contactInfo": {
        "address": "Örnek Mah. No:1, Kayseri",
        "phone": "+90 352 000 00 00",
        "email": "info@karstone.com",
        "website": "karstone.com"
      }
    }
  }' | jq
# → {"queued": true, "status": "GENERATING"}
```

Durumu izle (→ COMPLETED | FAILED):

```bash
until curl -s "$BASE/api/admin/catalog/projects/$PID" -H "Cookie: $COOKIE" \
  | jq -e '.project.status == "COMPLETED" or .project.status == "FAILED"' > /dev/null; do
  curl -s "$BASE/api/admin/catalog/projects/$PID" -H "Cookie: $COOKIE" \
    | jq -r '.project.status'
  sleep 4
done
```

#### Adım 6 — PDF'i indir

```bash
curl -s -L -o /tmp/karstone.pdf \
  -H "Cookie: $COOKIE" \
  "$BASE/api/admin/catalog/projects/$PID/download"

open /tmp/karstone.pdf   # veya: xdg-open / start
```

Üretilen önizleme PNG'lerini de diskten kontrol edebilirsin:

```bash
ls -lh /var/www/klinik-asistan/storage/catalog/<TENANT>/$PID/output/preview/*/
```

### 7d.6 Beklenen çıktı

- `/var/www/klinik-asistan/storage/catalog/<tenant>/<project>/output/catalog-natural-stone-modern-YYYYMMDD-HHMMSS.pdf`
- Aynı dizinde `preview/<pdf-stem>/page-001.png`, `page-002.png`, …
- DB'de `CatalogGeneration` satırı: `status="COMPLETED"`, `pdfPath`, `pageCount`, `fileSize`
- `CatalogProject.status = "COMPLETED"`, `templateId = <natural-stone-modern>`
- İndirilen PDF yapısı:
  1. Kapak (marka rengi + başlık)
  2. İçindekiler (kategori bazlı)
  3. Her kategori için: ayraç sayfası + ürünler (sol görsel, sağ bilgi)
  4. Arka kapak (iletişim bilgileri)

### 7d.7 Troubleshooting

| Belirti | Olası sebep | Çözüm |
| --- | --- | --- |
| `Projede ürün yok` | analyze adımı başarısız veya hiç çalışmadı | `GET /projects/[id]` → `status=FAILED` ise `pm2 logs inpobi-web` incele |
| `template not found: ...` | Template dosyaları VPS'e çekilmedi | git pull sonrası `ls python-services/catalog-service/templates/` |
| PDF boş / sayfa 2-3 | Ürün yok → sadece cover+toc+back | Daha çok REFERENCE_PDF yükle veya sector ayarla |
| Font render boş kare | Sistemde Inter yok, font fetch başarısız | `apt-get install fonts-inter` veya `brand_kit.font_family="Helvetica"` |
| WeasyPrint `BrokenImage` | image_path dosyada yok | `match-images` hiç eşleme bulamamış; önce fotoları yükle |
| Download 410 | Üretim başarılı ama PDF diskten silinmiş | Yeniden generate tetikle |
| `CatalogGeneration_pkey constraint` | Seed çalıştırılmadan generate edildi | `npx tsx prisma/seeds/catalog-templates.ts` |

### 7d.8 Arkaplan kuyruğu notu

Şu an Next.js tarafındaki pipeline [`src/lib/catalog/jobQueue.ts`]
içindeki **in-process FIFO kuyrukta** çalışıyor. Süreç yeniden başlarsa
bekleyen/çalışan işler kaybolur. Analyze + generate en fazla 15-20 dk
sürdüğü için MVP'de yeterli. Sprint 2'de BullMQ'ya geçiş (dosyadaki
`TODO(sprint2)` bloğuna bakın).

---

## 7e. Admin Panel UI (Katalog Üretici)

Bu bölüm Next.js tarafında tam UI'ı (3 sayfa + 4 bileşen + 2 yardımcı
API) aktive eder. Bu noktadan sonra tüm işlemler admin panelden
(UI'dan) yapılabilir; curl artık zorunlu değil.

### 7e.1 Kod güncelleme

```bash
cd /var/www/klinik-asistan
git pull origin main --rebase
```

Yeni dosyalar:

- `src/components/catalog/` — StatusBadge, StatusTimeline, FileUploadZone,
  ProductEditModal, GenerationProgressModal, useProjectPolling
- `src/app/(dashboard)/admin/content-studio/catalog/page.tsx` (liste)
- `src/app/(dashboard)/admin/content-studio/catalog/new/page.tsx` (4-adım wizard)
- `src/app/(dashboard)/admin/content-studio/catalog/[id]/page.tsx` (detay + tabs)
- `src/app/api/admin/catalog/products/[id]/route.ts` (PATCH/DELETE)
- `src/app/api/admin/catalog/projects/[id]/products/route.ts` (GET list)
- `src/app/api/admin/catalog/files/[fileId]/raw/route.ts` (stream — thumbnail önizleme)
- `src/app/(dashboard)/layout.tsx` (sidebar'a "Katalog Üretici" linki, page title map)

### 7e.2 Build + restart

```bash
npx prisma generate
npm run build
pm2 restart inpobi-web
```

Build çıktısında şu rotalar olmalı:

```
○ /admin/content-studio/catalog
○ /admin/content-studio/catalog/new
ƒ /admin/content-studio/catalog/[id]
ƒ /api/admin/catalog/projects/[id]/products
ƒ /api/admin/catalog/products/[id]
ƒ /api/admin/catalog/files/[fileId]/raw
```

### 7e.3 Erişim

1. `poby.ai/admin/content-studio/catalog` → sol sidebar **Yönetim → Katalog Üretici**.
2. ADMIN veya SUPERADMIN yetkisi gerekir (sidebar linki bu rollere açılır).

### 7e.4 Karstone pilot senaryosu

Ayrı bir dosyaya çıkartıldı: **[KARSTONE_TEST_GUIDE.md](KARSTONE_TEST_GUIDE.md)**.

Oradan takip ederek wizard → analiz → ürün düzenleme → üretim → indirme
akışını uçtan uca dene.

### 7e.5 UI'dan kullanılan background job pattern

- **Analyze** ve **Generate** çağrıları anında `{ queued: true }` döner.
- Sayfa `useProjectPolling` hook'u ile her 3 saniyede bir
  `GET /projects/[id]` çağırır, statü değişince UI kendini günceller.
- `GenerationProgressModal` ANALYZING/GENERATING sırasında açık.
- **TODO(sprint2)**: BullMQ'ya taşıma — `src/lib/catalog/jobQueue.ts`
  içindeki notu uygulamaya al.

### 7e.6 Troubleshooting

| Belirti | Olası neden | Çözüm |
| --- | --- | --- |
| Sidebar'da "Katalog Üretici" yok | Rol ADMIN/SUPERADMIN değil | `psql` ile User.role güncelle, logout/login |
| Yeni Katalog butonu 403 | Clinic yok (onboarding tamamlanmamış) | Dashboard'a gir, onboarding akışını bitir |
| Foto thumbnail kırık | `thumbs/` altında dosya yok → ilk upload öncesi dizin yoktu | Upload route `ensureProjectDirs()` çağırır; tekrar yükle |
| Wizard son adımda 400 | Dosya yok veya kota dolu | Dosyaları yükleyebildiğinden emin ol; quota panel alt bar |
| PDF preview sayfası 404 (iframe) | PDF üretilmedi veya silindi | "Katalog Üret" butonuna bas |
| Toast "Üretim devam ederken…" | Project status GENERATING | İşlem bitene kadar bekle (modal otomatik izler) |

---

## 7f. Dosya Yorumları + Canva Entegrasyonu (20260420 güncelleme)

### 7f.1 Yeni dosyalar (git pull sonrası VPS'te otomatik gelir)

- `prisma/migrations/20260420_catalog_notes_and_canva/migration.sql`
  → `CatalogSourceFile.userNote + aiNote + aiAnalyzedAt`
  → `CatalogGeneration.canvaDesignId + canvaEditUrl + canvaSentAt`
  → `CatalogCanvaConnection` (1 tablo)
- API: `/api/admin/catalog/files/[fileId]` (PATCH — note), `/files/[fileId]/analyze`
- API: `/api/admin/catalog/canva/{auth,callback,status}`, `/projects/[id]/canva-send`
- Lib: `src/lib/catalog/canva.ts`
- UI: `src/components/catalog/FileNoteCard.tsx`, detail page Files tab + Settings'te Canva kartı
- Doc: `CANVA_SETUP.md` — Canva Developer App kurulumu

### 7f.2 Deploy adımları

```bash
cd /var/www/klinik-asistan
git pull origin main --rebase

# Node paketleri değişmedi (xlsx zaten mevcut) — yine de güncelle
npm ci

# Migration uygula
npx prisma migrate deploy
npx prisma generate

# FastAPI tarafında sadece prompt genişlemesi var, yeni paket yok
pm2 restart catalog-service

# Next.js build + restart
npm run build
pm2 restart inpobi-web

# Doğrula
curl -s http://127.0.0.1:8001/health | jq
psql "postgresql://klinik:KlinikAsistan2026@localhost:5432/klinikasistan" \
  -c "SELECT COUNT(*) FROM \"CatalogCanvaConnection\";"
```

### 7f.3 Canva kurulumu

Ayrı dosyada: [CANVA_SETUP.md](CANVA_SETUP.md). 3 adım:
1. https://www.canva.com/developers/ → yeni app
2. `.env`'e `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REDIRECT_URI` ekle
3. `pm2 restart inpobi-web` → Ayarlar → Canva'ya Bağla

---

## 8. Doğrulama Checklist

- [ ] Yedek alındı
- [ ] `npx prisma migrate deploy` başarılı
- [ ] 5 tablo veritabanında görünüyor
- [ ] `npm run build` hatasız
- [ ] `pm2 status` → `inpobi-web` online
- [ ] Sistem paketleri kuruldu (pango, cairo, vb.)
- [ ] Python venv hazır, pip install başarılı
- [ ] `curl localhost:8001/health` 200 döndürüyor
- [ ] `pm2 status` → `poby-catalog` online
- [ ] `CATALOG_SERVICE_URL` env set
- [ ] `sharp` paket kuruldu (`node_modules/sharp/` var)
- [ ] `/var/www/klinik-asistan/storage/catalog/` dizini mevcut, yazma izni OK
- [ ] `/api/admin/catalog/projects` 200 (ADMIN cookie ile) döndürüyor
- [ ] PDF/görsel/excel upload curl testleri başarılı
- [ ] Görsel yükleme sonrası `photos/` ve `photos/thumbs/` altında `.webp` üretiliyor
- [ ] Proje silindiğinde fiziksel dizin de kalkıyor
- [ ] `curl /health` → `anthropic_configured: true`
- [ ] `CATALOG_STORAGE_ROOT` Next.js ile FastAPI arasında aynı
- [ ] `CATALOG_SERVICE_URL` env set (Next.js tarafında)
- [ ] `/parse-pdf` → `/jobs/{id}` curl zinciri `completed` dönüyor
- [ ] `/extract-products` → ürün listesi dönüyor
- [ ] `/match-images` filename eşleşmeleri bulunuyor
- [ ] `/translate` hedef dile çeviri üretiyor
- [ ] `prisma/seeds/catalog-templates.ts` çalıştırıldı (`natural-stone-modern` DB'de)
- [ ] `templates/natural-stone-modern/` VPS'te mevcut
- [ ] `/generate-catalog` curl ile test edildi, PDF oluştu
- [ ] `/api/admin/catalog/projects/[id]/analyze` → status ANALYZING → READY_TO_GENERATE
- [ ] `/api/admin/catalog/projects/[id]/generate` → status GENERATING → COMPLETED
- [ ] `/api/admin/catalog/projects/[id]/download` ile PDF indi
- [ ] `CatalogGeneration` tablosunda `COMPLETED` satır var
- [ ] `output/preview/<pdf-stem>/page-*.png` üretildi
- [ ] Sol sidebar'da "Yönetim → Katalog Üretici" linki görünüyor
- [ ] `/admin/content-studio/catalog` liste sayfası yükleniyor
- [ ] `/new` wizard 4 adımı çalışıyor, analiz başlatabiliyor
- [ ] Detay sayfasındaki StatusTimeline canlı güncelleniyor
- [ ] Ürünler tab'ında edit modal açılıp kaydediyor
- [ ] Önizleme iframe PDF'i gösteriyor
- [ ] WhatsApp paylaşım linki açılıyor

Her adım geçtikten sonra modülü geliştirmeye başlayabiliriz.

---

## 9. Özet Rota Listesi (tek bakışta)

### API (Next.js)

```
POST   /api/admin/catalog/projects
GET    /api/admin/catalog/projects
GET    /api/admin/catalog/projects/[id]
DELETE /api/admin/catalog/projects/[id]
POST   /api/admin/catalog/projects/[id]/upload
GET    /api/admin/catalog/projects/[id]/files
GET    /api/admin/catalog/projects/[id]/products
POST   /api/admin/catalog/projects/[id]/analyze
POST   /api/admin/catalog/projects/[id]/generate
GET    /api/admin/catalog/projects/[id]/download
DELETE /api/admin/catalog/files/[fileId]
GET    /api/admin/catalog/files/[fileId]/raw(?thumb=1)
PATCH  /api/admin/catalog/products/[id]
DELETE /api/admin/catalog/products/[id]
```

### FastAPI (catalog-service)

```
GET    /health
POST   /parse-pdf          → job_id
POST   /extract-products   → job_id
POST   /match-images       → job_id
POST   /translate          → job_id
POST   /generate-catalog   → job_id
GET    /jobs/{job_id}
POST   /jobs/_sweep
```

### UI sayfaları

```
/admin/content-studio/catalog           → Liste + "+ Yeni" butonu
/admin/content-studio/catalog/new       → 4-adım wizard
/admin/content-studio/catalog/[id]      → Detay + 4 tab
```

Sprint 2 yol haritası: BullMQ, Redis job store, çoklu şablon seti,
S3 storage, logo upload'ın PDF'e entegrasyonu, GA-benzeri "katalog
performansı" paneli.
