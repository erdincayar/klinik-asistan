"""Anthropic Claude wrapper for catalog extraction + translation.

Both operations batch their inputs to keep per-call token usage low
and to give finer-grained progress to the caller.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, Optional

from anthropic import AsyncAnthropic

from ..config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, EXTRACT_BATCH, TRANSLATE_BATCH
from ..schemas import ExtractedProduct, ParsedPage

log = logging.getLogger(__name__)


# ─── shared helpers ────────────────────────────────────────
def _client() -> AsyncAnthropic:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY missing — set it in catalog-service .env"
        )
    return AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*([\[{].*?[\]}])\s*```", re.DOTALL)


def _parse_json(raw: str) -> Any:
    """Tolerant JSON extractor — strips markdown fencing, finds largest [..]/{{..}}."""
    s = raw.strip()
    m = _JSON_BLOCK_RE.search(s)
    if m:
        s = m.group(1)
    # Fallback: locate outermost array or object
    if not (s.startswith("[") or s.startswith("{")):
        # try to slice from first [/{ to matching last ]/}
        start = next((i for i, c in enumerate(s) if c in "[{"), -1)
        end_char = "]" if start >= 0 and s[start] == "[" else "}"
        end = s.rfind(end_char)
        if start == -1 or end <= start:
            raise ValueError("no JSON structure found in model output")
        s = s[start : end + 1]
    return json.loads(s)


# ─── extract-products ──────────────────────────────────────
_EXTRACT_SYSTEM = (
    "Sen bir ürün kataloğu ayrıştırma asistanısın. "
    "Verilen PDF sayfa metinlerinden ürünleri yapılandırılmış olarak çıkartırsın. "
    "Yanıtını SADECE geçerli JSON array olarak ver, açıklama yazma."
)


def _extract_prompt(
    pages: list[ParsedPage],
    sector: Optional[str],
    brand: Optional[str],
    extra_context: Optional[str] = None,
) -> str:
    sector_hint = f"\nSektör: {sector}" if sector else ""
    brand_hint = f"\nMarka/firma: {brand}" if brand else ""
    ctx_hint = f"\n\n{extra_context.strip()}" if extra_context and extra_context.strip() else ""

    pages_block = "\n\n".join(
        f"=== SAYFA {p.num} ===\n{p.text.strip() or '[boş]'}" for p in pages
    )

    return f"""{sector_hint}{brand_hint}{ctx_hint}

Aşağıda bir ürün kataloğuna ait PDF sayfalarının metinleri var.
Bu sayfalardan ürünleri çıkart. Her ürün için şu şemayı doldur:

{{
  "product_code": "KOD veya null",
  "name": "Ürün adı (Türkçe)",
  "description": "Kısa açıklama (1-3 cümle) veya null",
  "technical_specs": {{"boyut": "...", "agirlik": "...", "malzeme": "...", ...}},
  "category": "Kategori veya null",
  "page_num": 1,
  "confidence": 0.85
}}

Kurallar:
- Yalnızca belirgin şekilde ürün olan öğeleri çıkart.
- technical_specs içinde mevcut olmayan alanları ATLATMA (None yazma). Yoksa yazma.
- confidence 0-1 arasında, extraction güven skorudur.
- page_num ürünün göründüğü sayfa numarası.

Sayfalar:

{pages_block}

Sadece JSON array döndür.
""".strip()


async def extract_products(
    pages: list[ParsedPage],
    sector: Optional[str] = None,
    brand: Optional[str] = None,
    extra_context: Optional[str] = None,
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> tuple[list[ExtractedProduct], int]:
    """Run Claude over page batches, collect products."""
    if not pages:
        return [], 0

    client = _client()
    all_products: list[ExtractedProduct] = []
    total_batches = (len(pages) + EXTRACT_BATCH - 1) // EXTRACT_BATCH

    for bi, start in enumerate(range(0, len(pages), EXTRACT_BATCH)):
        batch = pages[start : start + EXTRACT_BATCH]
        prompt = _extract_prompt(batch, sector, brand, extra_context)

        if progress_cb:
            progress_cb(bi / total_batches, f"Claude batch {bi + 1}/{total_batches}")

        try:
            resp = await client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=4096,
                system=_EXTRACT_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as e:  # noqa: BLE001
            log.exception("claude extract batch failed")
            raise

        text = "".join(
            block.text for block in resp.content if getattr(block, "type", "") == "text"
        )

        try:
            data = _parse_json(text)
        except Exception as e:  # noqa: BLE001
            log.warning("extract batch %s: JSON parse failed, skipping. %s", bi, e)
            continue

        if not isinstance(data, list):
            log.warning("extract batch %s: expected list, got %s", bi, type(data).__name__)
            continue

        for item in data:
            if not isinstance(item, dict):
                continue
            # Guarantee required fields
            try:
                product = ExtractedProduct(
                    product_code=item.get("product_code"),
                    name=str(item.get("name") or "").strip() or "Adsız Ürün",
                    description=item.get("description"),
                    technical_specs=item.get("technical_specs") or {},
                    category=item.get("category"),
                    page_num=item.get("page_num"),
                    confidence=float(item.get("confidence") or 0.5),
                )
                all_products.append(product)
            except Exception as e:  # noqa: BLE001
                log.warning("extract batch %s: bad item skipped: %s", bi, e)

    if progress_cb:
        progress_cb(1.0, "Çıkartma tamamlandı")

    return all_products, total_batches


# ─── translate ─────────────────────────────────────────────
_TRANSLATE_SYSTEM = (
    "Sen profesyonel bir teknik çevirmensin. Ürün kataloğu metinlerini "
    "kaynak dilden hedef dile, sektörel terminolojiyi koruyarak, "
    "kuru ve teknik bir Türkçe üslubuyla çevirirsin. "
    "Yanıtını SADECE geçerli JSON array olarak ver."
)


def _translate_prompt(
    products: list[ExtractedProduct],
    src: str,
    tgt: str,
    sector: Optional[str],
) -> str:
    sector_hint = f"\nSektör: {sector}" if sector else ""
    items = [
        {
            "idx": i,
            "name": p.name,
            "description": p.description,
            "category": p.category,
        }
        for i, p in enumerate(products)
    ]
    return f"""Kaynak dil: {src}
Hedef dil: {tgt}{sector_hint}

Aşağıdaki ürünleri çevir. Her ürün için aynı idx'le birlikte şu
alanları çevirilmiş olarak döndür: name, description, category.

Kurallar:
- Teknik terimler ve ürün kodları ORİJİNAL bırakılmalı (örn: "WF-100", "RAL 9005").
- Rakamlar, boyutlar, birimler olduğu gibi korunacak.
- Çeviri kuru ve teknik olacak, pazarlama üslubu katmayacaksın.

Girdi:
{json.dumps(items, ensure_ascii=False)}

Çıktı (örnek format):
[{{"idx":0,"name":"...","description":"...","category":"..."}}, ...]

Sadece JSON array döndür.
""".strip()


async def translate_products(
    products: list[ExtractedProduct],
    source_language: str,
    target_language: str,
    sector: Optional[str] = None,
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> tuple[list[ExtractedProduct], int]:
    """Translate in batches of TRANSLATE_BATCH. Returns new product list."""
    if not products:
        return [], 0
    if source_language == target_language:
        return list(products), 0

    client = _client()
    result = [p.model_copy() for p in products]
    total_batches = (len(products) + TRANSLATE_BATCH - 1) // TRANSLATE_BATCH

    for bi, start in enumerate(range(0, len(products), TRANSLATE_BATCH)):
        batch = products[start : start + TRANSLATE_BATCH]
        prompt = _translate_prompt(batch, source_language, target_language, sector)

        if progress_cb:
            progress_cb(bi / total_batches, f"Çeviri batch {bi + 1}/{total_batches}")

        try:
            resp = await client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=4096,
                system=_TRANSLATE_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception:
            log.exception("claude translate batch failed")
            raise

        text = "".join(
            block.text for block in resp.content if getattr(block, "type", "") == "text"
        )

        try:
            data = _parse_json(text)
        except Exception as e:  # noqa: BLE001
            log.warning("translate batch %s: JSON parse failed. %s", bi, e)
            continue

        if not isinstance(data, list):
            continue

        for item in data:
            if not isinstance(item, dict):
                continue
            try:
                local_idx = int(item.get("idx"))
            except (TypeError, ValueError):
                continue
            global_idx = start + local_idx
            if 0 <= global_idx < len(result):
                p = result[global_idx]
                if item.get("name"):
                    p.name = str(item["name"])
                if item.get("description") is not None:
                    p.description = item.get("description")
                if item.get("category") is not None:
                    p.category = item.get("category")
                result[global_idx] = p

    if progress_cb:
        progress_cb(1.0, "Çeviri tamamlandı")

    return result, total_batches
