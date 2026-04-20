"""Catalog PDF generator.

Renders a Jinja2 template stack into one HTML document and compiles it
with WeasyPrint. Optionally rasterises each page with pymupdf for
preview thumbnails.
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections import OrderedDict
from pathlib import Path
from typing import Callable, Optional

import fitz  # pymupdf
from jinja2 import (
    ChoiceLoader,
    Environment,
    FileSystemLoader,
    StrictUndefined,
    select_autoescape,
)

from ..config import CATALOG_STORAGE_ROOT, make_rel, resolve_storage_path
from ..schemas import (
    BrandKit,
    CatalogMetadata,
    GenerateCatalogProduct,
    GenerateCatalogRequest,
    GenerateCatalogResult,
)

log = logging.getLogger(__name__)

TEMPLATES_ROOT = Path(__file__).resolve().parents[2] / "templates"


def _absolute_for_html(rel_or_abs: Optional[str]) -> Optional[str]:
    """
    Turn a CATALOG_STORAGE_ROOT-relative path into a file:// URI that
    WeasyPrint can resolve. If it's already absolute, trust it.
    """
    if not rel_or_abs:
        return None
    try:
        p = resolve_storage_path(rel_or_abs)
    except ValueError:
        # Maybe a template-bundled asset? Try that as fallback.
        cand = TEMPLATES_ROOT / rel_or_abs
        p = cand.resolve() if cand.exists() else None
    if p is None or not p.exists():
        return None
    return p.as_uri()


def _group_by_category(
    products: list[GenerateCatalogProduct],
) -> list[tuple[str, list[GenerateCatalogProduct]]]:
    """Preserve first-seen category order. Uncategorised → 'Genel'."""
    buckets: OrderedDict[str, list[GenerateCatalogProduct]] = OrderedDict()
    for p in products:
        key = (p.category or "Genel").strip() or "Genel"
        buckets.setdefault(key, []).append(p)
    return list(buckets.items())


def _prepare_products(
    products: list[GenerateCatalogProduct],
) -> list[GenerateCatalogProduct]:
    """Rewrite image_path to file:// URIs so WeasyPrint can load them."""
    out: list[GenerateCatalogProduct] = []
    for p in products:
        cloned = p.model_copy()
        cloned.image_path = _absolute_for_html(p.image_path)
        out.append(cloned)
    return out


def _prepare_brand_kit(brand: BrandKit) -> BrandKit:
    cloned = brand.model_copy()
    if brand.logo_path:
        cloned.logo_path = _absolute_for_html(brand.logo_path)
    return cloned


def _resolve_template_dir(template_slug: str) -> Path:
    tdir = TEMPLATES_ROOT / template_slug
    if not tdir.is_dir():
        raise FileNotFoundError(f"template not found: {template_slug}")
    return tdir


def _render_html_sync(req: GenerateCatalogRequest) -> tuple[str, Path]:
    tdir = _resolve_template_dir(req.template_slug)
    css_path = tdir / "styles.css"
    css_text = css_path.read_text(encoding="utf-8") if css_path.exists() else ""

    env = Environment(
        loader=ChoiceLoader([FileSystemLoader(str(tdir))]),
        autoescape=select_autoescape(["html", "htm"]),
        undefined=StrictUndefined,  # surface missing vars early
        trim_blocks=True,
        lstrip_blocks=True,
    )

    products_by_category = _group_by_category(_prepare_products(req.products))
    brand_kit = _prepare_brand_kit(req.brand_kit)
    metadata = req.metadata.model_copy()
    if metadata.year is None:
        metadata.year = time.gmtime().tm_year

    html = env.get_template("main.html.j2").render(
        base_css=css_text,
        brand_kit=brand_kit,
        metadata=metadata,
        products_by_category=products_by_category,
    )
    return html, tdir


def _pdf_output_path(req: GenerateCatalogRequest) -> Path:
    if req.output_dir:
        out_abs = resolve_storage_path(req.output_dir)
    else:
        out_abs = CATALOG_STORAGE_ROOT / "generated_catalogs"
    out_abs.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d-%H%M%S")
    slug = "".join(c if c.isalnum() else "-" for c in req.template_slug).strip("-")
    return out_abs / f"catalog-{slug}-{ts}.pdf"


def _rasterize_previews(
    pdf_abs: Path,
    out_dir: Path,
    dpi: int,
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    written: list[Path] = []
    with fitz.open(str(pdf_abs)) as doc:
        total = doc.page_count or 1
        for i in range(doc.page_count):
            pix = doc.load_page(i).get_pixmap(matrix=mat, alpha=False)
            out = out_dir / f"page-{i + 1:03d}.png"
            pix.save(str(out))
            written.append(out)
            if progress_cb:
                progress_cb(
                    0.9 + 0.1 * (i + 1) / total,
                    f"Önizleme: {i + 1}/{total}",
                )
    return written


def _generate_sync(
    req: GenerateCatalogRequest,
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> GenerateCatalogResult:
    if progress_cb:
        progress_cb(0.1, "Şablon hazırlanıyor")

    html, tdir = _render_html_sync(req)

    if progress_cb:
        progress_cb(0.4, "PDF oluşturuluyor")

    # Import WeasyPrint lazily — it's heavy and its native deps are the
    # only reason we don't import at module top.
    from weasyprint import HTML  # type: ignore

    pdf_abs = _pdf_output_path(req)
    # base_url = template dir so relative asset URLs (assets/foo.svg) work
    HTML(string=html, base_url=str(tdir)).write_pdf(target=str(pdf_abs))

    # Page count + size + previews
    if progress_cb:
        progress_cb(0.8, "Sayfa bilgileri")

    previews: list[Path] = []
    with fitz.open(str(pdf_abs)) as doc:
        page_count = doc.page_count
    file_size = pdf_abs.stat().st_size

    if req.generate_previews:
        preview_dir = pdf_abs.parent / "preview" / pdf_abs.stem
        previews = _rasterize_previews(pdf_abs, preview_dir, req.preview_dpi, progress_cb)

    return GenerateCatalogResult(
        pdf_path=make_rel(pdf_abs),
        preview_paths=[make_rel(p) for p in previews],
        page_count=page_count,
        file_size=file_size,
    )


async def generate_catalog(
    req: GenerateCatalogRequest,
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> GenerateCatalogResult:
    return await asyncio.to_thread(_generate_sync, req, progress_cb)
