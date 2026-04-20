"""PDF parsing — pdfplumber for text, pymupdf for embedded images.

Both libraries are synchronous; we wrap calls in asyncio.to_thread
so the FastAPI event loop stays responsive.
"""
from __future__ import annotations

import asyncio
import logging
import re
from pathlib import Path
from typing import Callable, Optional

import fitz  # pymupdf
import pdfplumber

from ..config import CATALOG_STORAGE_ROOT, make_rel, resolve_storage_path
from ..schemas import (
    DetectedProductBlock,
    ExtractedImage,
    ParsedPage,
    ParsePdfResult,
)

log = logging.getLogger(__name__)


# Heuristic patterns that hint at "this block describes a product".
_CODE_RE = re.compile(r"\b[A-ZĞÜŞİÖÇ]{2,5}[\s-]?\d{2,6}\b")  # URN-001, WF1234
_PRICE_RE = re.compile(r"\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:₺|TL|EUR|€|\$|USD)", re.IGNORECASE)
_DIM_RE = re.compile(r"\b\d+(?:[.,]\d+)?\s*(?:x|×)\s*\d+", re.IGNORECASE)
_SPEC_KEYWORDS = [
    "boyut", "ölçü", "ağırlık", "malzeme", "renk", "ebat",
    "dimension", "weight", "material", "color",
]


def _block_score(text: str) -> float:
    """Simple heuristic score [0..1] for 'is this a product block?'."""
    if not text or len(text.strip()) < 20:
        return 0.0
    score = 0.0
    if _CODE_RE.search(text):
        score += 0.35
    if _PRICE_RE.search(text):
        score += 0.25
    if _DIM_RE.search(text):
        score += 0.2
    lower = text.lower()
    kw_hits = sum(1 for k in _SPEC_KEYWORDS if k in lower)
    score += min(kw_hits * 0.1, 0.2)
    return min(score, 1.0)


def _parse_sync(
    pdf_abs: Path,
    images_out_abs: Path,
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> ParsePdfResult:
    images_out_abs.mkdir(parents=True, exist_ok=True)

    pages: list[ParsedPage] = []
    detected: list[DetectedProductBlock] = []
    extracted: list[ExtractedImage] = []

    # ── TEXT (pdfplumber) ──
    with pdfplumber.open(str(pdf_abs)) as pdf:
        total = len(pdf.pages) or 1
        for i, page in enumerate(pdf.pages):
            page_num = i + 1
            text = page.extract_text() or ""
            img_count = len(page.images or [])
            pages.append(
                ParsedPage(
                    num=page_num,
                    text=text,
                    char_count=len(text),
                    image_count=img_count,
                )
            )

            # Block-level detection: split on blank lines, score each block
            for block in re.split(r"\n\s*\n", text):
                s = _block_score(block)
                if s >= 0.45:
                    detected.append(
                        DetectedProductBlock(
                            page_num=page_num,
                            text_snippet=block.strip()[:300],
                            score=round(s, 2),
                        )
                    )

            if progress_cb:
                progress_cb(0.5 * (i + 1) / total, f"Metin: sayfa {page_num}/{total}")

    # ── IMAGES (pymupdf) ──
    try:
        doc = fitz.open(str(pdf_abs))
        total = doc.page_count or 1
        saved_hashes: set[bytes] = set()
        for i in range(doc.page_count):
            page_num = i + 1
            page = doc.load_page(i)
            for img_index, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                try:
                    base = doc.extract_image(xref)
                except Exception as e:  # noqa: BLE001
                    log.warning("extract_image failed p=%s x=%s: %s", page_num, xref, e)
                    continue
                img_bytes = base.get("image")
                if not img_bytes:
                    continue
                # De-dupe identical images (common on catalog headers/footers)
                sig = img_bytes[:64]
                if sig in saved_hashes:
                    continue
                saved_hashes.add(sig)

                ext = base.get("ext", "png")
                fname = f"p{page_num:03d}_i{img_index:02d}.{ext}"
                out_abs = images_out_abs / fname
                out_abs.write_bytes(img_bytes)

                # bbox of first occurrence
                bbox = [0.0, 0.0, 0.0, 0.0]
                try:
                    rects = page.get_image_rects(xref)
                    if rects:
                        r = rects[0]
                        bbox = [float(r.x0), float(r.y0), float(r.x1), float(r.y1)]
                except Exception:
                    pass

                extracted.append(
                    ExtractedImage(
                        page_num=page_num,
                        bbox=bbox,
                        path=make_rel(out_abs),
                        width=int(base.get("width") or 0),
                        height=int(base.get("height") or 0),
                    )
                )

            if progress_cb:
                progress_cb(0.5 + 0.5 * (i + 1) / total, f"Görsel: sayfa {page_num}/{total}")

        doc.close()
    except Exception as e:  # noqa: BLE001
        log.warning("pymupdf image extract failed: %s", e)

    return ParsePdfResult(
        pages=pages,
        detected_products=detected,
        extracted_images=extracted,
    )


async def parse_pdf(
    pdf_rel_or_abs: str,
    extract_images_to: Optional[str] = None,
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> ParsePdfResult:
    pdf_abs = resolve_storage_path(pdf_rel_or_abs)
    if not pdf_abs.is_file():
        raise FileNotFoundError(f"PDF not found: {pdf_rel_or_abs}")

    if extract_images_to:
        images_out = resolve_storage_path(extract_images_to)
    else:
        images_out = pdf_abs.parent / "extracted_images" / pdf_abs.stem

    return await asyncio.to_thread(_parse_sync, pdf_abs, images_out, progress_cb)
