# Poby.ai — Catalog Service

FastAPI tabanlı, AI destekli katalog PDF üretim servisi.
Next.js ana uygulamanın yanında arka plan servisi olarak çalışır.

## Sorumluluklar

- Referans PDF'lerinden ürün verilerini çıkartma (`pdfplumber`, `pymupdf`)
- Ürün görsellerini işleme (`Pillow`)
- Anthropic Claude ile ürün metinleri üretimi/çevirisi
- Jinja2 + WeasyPrint ile HTML şablonlardan PDF oluşturma

## Gereksinimler (VPS)

Sistem paketleri (WeasyPrint için şart):

```bash
sudo apt-get update
sudo apt-get install -y \
  python3 python3-venv python3-pip \
  libpango-1.0-0 libpangoft2-1.0-0 \
  libharfbuzz0b libffi-dev libjpeg-dev \
  libcairo2 shared-mime-info
```

Python: **3.10+** (önerilen: 3.11).

## Kurulum

```bash
cd /var/www/klinik-asistan/python-services/catalog-service

# Sanal ortam
python3 -m venv venv
source venv/bin/activate

# Bağımlılıklar
pip install --upgrade pip
pip install -r requirements.txt

# Env değişkenleri
cp .env.example .env
# ANTHROPIC_API_KEY değerini .env dosyasına yaz
```

## Çalıştırma

### Geliştirme (auto-reload)

```bash
source venv/bin/activate
CATALOG_DEV_MODE=1 python main.py
```

### Production (tek komutla)

```bash
source venv/bin/activate
python main.py
```

Servis `0.0.0.0:8001` üzerinde dinler. Next.js tarafı bu adresi
`CATALOG_SERVICE_URL=http://127.0.0.1:8001` env değişkeniyle çağırır.

### pm2 ile süreç yönetimi

```bash
# ecosystem satırı (örnek):
pm2 start venv/bin/python --name poby-catalog -- main.py
pm2 save
```

Alternatif: systemd servis tanımı (`/etc/systemd/system/poby-catalog.service`).
Örnek systemd dosyası için `CLAUDE_CODE_DEPLOY.md` içine bakın.

## Test

```bash
curl http://127.0.0.1:8001/health
# -> {"service":"poby-catalog-service","version":"0.1.0","status":"ok"}
```

## Endpoint'ler (v0.2)

Tüm uzun işler **202 + `{job_id}`** döndürür. Durumu `GET /jobs/{job_id}`
ile sorgula (status: `pending | running | completed | failed`).

| Metod | Yol                   | Amaç                                              |
| ----- | --------------------- | ------------------------------------------------- |
| GET   | `/health`             | servis + yapılandırma durumu                      |
| POST  | `/parse-pdf`          | PDF → metin + gömülü görseller + ürün blok tespiti |
| POST  | `/extract-products`   | Parse edilmiş sayfalardan Claude ile ürün listesi |
| POST  | `/match-images`       | Ürünleri filename + pHash ile görsellere eşle    |
| POST  | `/translate`          | Ürün adı/açıklama/kategori çevirisi              |
| GET   | `/jobs/{job_id}`      | İş durumu                                         |
| POST  | `/jobs/_sweep`        | Tamamlananları temizle (auto; 5 dk'da bir)       |

### Örnek uçtan uca akış (curl)

```bash
# 0) Servis ayakta mı?
curl http://127.0.0.1:8001/health | jq

# 1) PDF'i analiz et
JOB=$(curl -s -X POST http://127.0.0.1:8001/parse-pdf \
  -H "Content-Type: application/json" \
  -d '{"pdf_path": "catalog/<tenant>/<project>/source/foo.pdf"}' \
  | jq -r .job_id)

# 2) İş bitene kadar bekle
until curl -s http://127.0.0.1:8001/jobs/$JOB \
  | jq -e '.status == "completed" or .status == "failed"' > /dev/null; do
  sleep 2
done

# 3) Sonucu çek
PARSED=$(curl -s http://127.0.0.1:8001/jobs/$JOB | jq .result)
echo $PARSED | jq '.pages | length'

# 4) Ürünleri çıkart (Claude)
JOB2=$(curl -s -X POST http://127.0.0.1:8001/extract-products \
  -H "Content-Type: application/json" \
  -d "$(echo $PARSED | jq '{pages: .pages, sector: "NATURAL_STONE"}')" \
  | jq -r .job_id)

# 5) Görsellerle eşleştir
echo $PARSED | jq '{products: [], photo_files: [], extracted_images: .extracted_images}' \
  | curl -s -X POST http://127.0.0.1:8001/match-images \
      -H "Content-Type: application/json" -d @- \
  | jq
```

### Python client örneği

```python
import httpx, asyncio, time

BASE = "http://127.0.0.1:8001"

async def run():
    async with httpx.AsyncClient(base_url=BASE, timeout=60) as c:
        r = await c.post("/parse-pdf", json={"pdf_path": "catalog/.../sample.pdf"})
        job = r.json()["job_id"]
        while True:
            s = (await c.get(f"/jobs/{job}")).json()
            print(s["status"], s.get("message"))
            if s["status"] in ("completed", "failed"):
                break
            await asyncio.sleep(1.5)
        print(s["result"]["pages"][:1])

asyncio.run(run())
```

## Yapılacaklar (Roadmap)

- [x] `POST /parse-pdf`
- [x] `POST /extract-products`
- [x] `POST /match-images`
- [x] `POST /translate`
- [x] `GET /jobs/{id}` polling
- [ ] `POST /generate` — HTML şablon → PDF
- [ ] Redis-backed job store (şu an in-memory)
- [ ] S3/MinIO storage katmanı
- [ ] Anthropic batch API (maliyet azaltımı)

## Port Çakışmaları

Varsayılan port **8001**. Eğer başka servis bu portta ise
`.env` içinde `CATALOG_SERVICE_PORT=8002` ile değiştirin.

## Loglar

Uvicorn stdout/stderr'e yazıyor. pm2 kullanıyorsan:

```bash
pm2 logs poby-catalog
```

systemd kullanıyorsan:

```bash
journalctl -u poby-catalog -f
```
