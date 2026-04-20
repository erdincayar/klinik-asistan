"""Match product entries to candidate images.

Strategy:
  1. Filename match: product_code appears in basename (case-insensitive).
  2. Fallback: perceptual hash (pHash) against PDF-extracted images if
     a product has a page_num and we have an extracted image from the
     same page. Selects the nearest pHash under threshold.
"""
from __future__ import annotations

import asyncio
import logging
import re
from pathlib import Path
from typing import Optional

import imagehash
from PIL import Image

from ..config import resolve_storage_path
from ..schemas import ExtractedImage, ExtractedProduct, MatchEntry, MatchImagesResult

log = logging.getLogger(__name__)

_NON_ALNUM = re.compile(r"[^A-Za-z0-9]+")


def _normalise(s: str) -> str:
    return _NON_ALNUM.sub("", s).lower()


def _filename_match(product: ExtractedProduct, photo_paths: list[Path]) -> Optional[Path]:
    if not product.product_code:
        return None
    code = _normalise(product.product_code)
    if not code:
        return None
    for p in photo_paths:
        stem = _normalise(p.stem)
        if code in stem or stem.startswith(code):
            return p
    return None


def _safe_phash(abs_path: Path) -> Optional[imagehash.ImageHash]:
    try:
        with Image.open(abs_path) as im:
            return imagehash.phash(im.convert("RGB"))
    except Exception as e:  # noqa: BLE001
        log.warning("phash failed for %s: %s", abs_path, e)
        return None


def _phash_score(distance: int, threshold: int) -> float:
    # distance 0 → score 1.0, distance threshold → score 0.0
    if distance >= threshold:
        return 0.0
    return round(1.0 - (distance / threshold), 3)


def _match_sync(
    products: list[ExtractedProduct],
    photo_files: list[str],
    extracted_images: list[ExtractedImage],
    phash_threshold: int,
) -> MatchImagesResult:
    photo_paths: list[Path] = []
    for p in photo_files:
        try:
            photo_paths.append(resolve_storage_path(p))
        except ValueError:
            log.warning("photo path rejected: %s", p)

    # Pre-compute pHash for every candidate once
    photo_hashes: dict[Path, imagehash.ImageHash] = {}
    extracted_hashes: dict[str, imagehash.ImageHash] = {}

    for p in photo_paths:
        h = _safe_phash(p)
        if h is not None:
            photo_hashes[p] = h

    for ex in extracted_images:
        try:
            abs_p = resolve_storage_path(ex.path)
        except ValueError:
            continue
        h = _safe_phash(abs_p)
        if h is not None:
            extracted_hashes[ex.path] = h

    matches: list[MatchEntry] = []
    out_map: dict[str, str] = {}

    for product in products:
        # 1) filename
        hit = _filename_match(product, photo_paths)
        if hit is not None:
            rel = _to_rel(hit)
            matches.append(
                MatchEntry(
                    product_code=product.product_code,
                    product_name=product.name,
                    image_path=rel,
                    method="filename",
                    score=1.0,
                )
            )
            if product.product_code:
                out_map[product.product_code] = rel
            continue

        # 2) pHash against extracted images (prefer same-page)
        same_page = [
            ex for ex in extracted_images if ex.page_num == (product.page_num or -1)
        ]
        candidates = same_page if same_page else extracted_images

        # Compare each extracted candidate against all photo hashes
        best: Optional[tuple[Path, int]] = None
        # If user uploaded photos exist, match extracted → photo
        if photo_hashes and candidates:
            for ex in candidates:
                ex_hash = extracted_hashes.get(ex.path)
                if ex_hash is None:
                    continue
                for p_path, p_hash in photo_hashes.items():
                    d = int(ex_hash - p_hash)
                    if best is None or d < best[1]:
                        best = (p_path, d)
        # Otherwise fall back to using the extracted image itself as the product image
        if best is None and candidates:
            # Prefer the largest extracted image on the product's page
            ranked = sorted(
                (ex for ex in candidates if ex.path in extracted_hashes),
                key=lambda e: (e.width * e.height),
                reverse=True,
            )
            if ranked:
                ex = ranked[0]
                matches.append(
                    MatchEntry(
                        product_code=product.product_code,
                        product_name=product.name,
                        image_path=ex.path,
                        method="phash",
                        score=0.5,  # weak-but-useful fallback
                    )
                )
                if product.product_code:
                    out_map[product.product_code] = ex.path
                continue

        if best is not None and best[1] <= phash_threshold:
            rel = _to_rel(best[0])
            matches.append(
                MatchEntry(
                    product_code=product.product_code,
                    product_name=product.name,
                    image_path=rel,
                    method="phash",
                    score=_phash_score(best[1], phash_threshold),
                )
            )
            if product.product_code:
                out_map[product.product_code] = rel
            continue

        # unmatched
        matches.append(
            MatchEntry(
                product_code=product.product_code,
                product_name=product.name,
                image_path=None,
                method="unmatched",
                score=0.0,
            )
        )

    return MatchImagesResult(matches=matches, map=out_map)


def _to_rel(abs_path: Path) -> str:
    # Return as CATALOG_STORAGE_ROOT-relative if possible, else str
    from ..config import CATALOG_STORAGE_ROOT

    try:
        return str(abs_path.resolve().relative_to(CATALOG_STORAGE_ROOT))
    except ValueError:
        return str(abs_path)


async def match_images(
    products: list[ExtractedProduct],
    photo_files: list[str],
    extracted_images: list[ExtractedImage],
    phash_threshold: int = 10,
) -> MatchImagesResult:
    return await asyncio.to_thread(
        _match_sync, products, photo_files, extracted_images, phash_threshold
    )
