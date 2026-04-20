"""Pydantic request/response models."""
from __future__ import annotations

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# ─── PDF parse ──────────────────────────────────────────────
class ParsePdfRequest(BaseModel):
    pdf_path: str = Field(
        ...,
        description="Path under CATALOG_STORAGE_ROOT (or absolute), points to a PDF.",
    )
    # Where to write extracted images. Relative path recommended
    # (e.g. 'catalog/<tenant>/<project>/source/extracted/'). If omitted,
    # a sibling 'extracted_images' folder next to the pdf is used.
    extract_images_to: Optional[str] = None


class ExtractedImage(BaseModel):
    page_num: int
    bbox: list[float] = Field(default_factory=list)  # [x0,y0,x1,y1]
    path: str  # relative path from CATALOG_STORAGE_ROOT
    width: int
    height: int


class ParsedPage(BaseModel):
    num: int
    text: str
    char_count: int
    image_count: int


class DetectedProductBlock(BaseModel):
    page_num: int
    text_snippet: str
    score: float = Field(..., ge=0, le=1)


class ParsePdfResult(BaseModel):
    pages: list[ParsedPage]
    detected_products: list[DetectedProductBlock]
    extracted_images: list[ExtractedImage]


# ─── Extract products ──────────────────────────────────────
class ExtractProductsRequest(BaseModel):
    pages: list[ParsedPage]
    # Hint the sector so Claude adapts terminology.
    sector: Optional[str] = None
    # Optional vendor name
    brand: Optional[str] = None


class TechnicalSpecs(BaseModel):
    boyut: Optional[str] = None
    agirlik: Optional[str] = None
    malzeme: Optional[str] = None
    renk: Optional[str] = None

    class Config:
        extra = "allow"  # accept arbitrary extra keys from Claude


class ExtractedProduct(BaseModel):
    product_code: Optional[str] = None
    name: str
    description: Optional[str] = None
    technical_specs: dict[str, Any] = Field(default_factory=dict)
    category: Optional[str] = None
    page_num: Optional[int] = None
    confidence: float = Field(default=0.5, ge=0, le=1)


class ExtractProductsResult(BaseModel):
    products: list[ExtractedProduct]
    batches: int


# ─── Match images ──────────────────────────────────────────
class MatchImagesRequest(BaseModel):
    products: list[ExtractedProduct]
    # Candidate photos uploaded by the user (relative or absolute paths).
    photo_files: list[str] = Field(default_factory=list)
    # Images extracted from the PDF (from /parse-pdf).
    extracted_images: list[ExtractedImage] = Field(default_factory=list)
    # pHash threshold (lower = stricter). Default 10.
    phash_threshold: int = 10


class MatchEntry(BaseModel):
    product_code: Optional[str]
    product_name: str
    image_path: Optional[str]
    method: Literal["filename", "phash", "unmatched"]
    score: float = Field(default=0.0, ge=0, le=1)


class MatchImagesResult(BaseModel):
    matches: list[MatchEntry]
    # productCode -> path map for convenience
    map: dict[str, str]


# ─── Translate ─────────────────────────────────────────────
class TranslateRequest(BaseModel):
    products: list[ExtractedProduct]
    source_language: str = "tr"
    target_language: str = "tr"
    # Sector terminology hint (NATURAL_STONE, COSMETICS, TEXTILE, RESTAURANT_MENU, GENERAL)
    sector: Optional[str] = None


class TranslateResult(BaseModel):
    products: list[ExtractedProduct]
    batches: int


# ─── Generate catalog ──────────────────────────────────────
class BrandKit(BaseModel):
    primary: str = "#1F2937"
    secondary: str = "#F9FAFB"
    accent: str = "#D4A574"
    logo_path: Optional[str] = None  # CATALOG_STORAGE_ROOT-relative
    font_family: str = "Inter"


class ContactInfo(BaseModel):
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


class CatalogMetadata(BaseModel):
    title: str = "Ürün Kataloğu"
    subtitle: Optional[str] = None
    company_name: Optional[str] = None
    edition: Optional[str] = None
    year: Optional[int] = None
    language: str = "tr"
    contact_info: Optional[ContactInfo] = None


class GenerateCatalogProduct(BaseModel):
    """What the generator actually needs. Richer than ExtractedProduct:
    allows pre-attached image + price/currency."""
    product_code: Optional[str] = None
    name: str
    description: Optional[str] = None
    technical_specs: dict[str, Any] = Field(default_factory=dict)
    category: Optional[str] = None
    image_path: Optional[str] = None  # CATALOG_STORAGE_ROOT-relative or absolute
    price: Optional[float] = None
    currency: Optional[str] = None


class GenerateCatalogRequest(BaseModel):
    products: list[GenerateCatalogProduct]
    template_slug: str = "natural-stone-modern"
    brand_kit: BrandKit = Field(default_factory=BrandKit)
    metadata: CatalogMetadata = Field(default_factory=CatalogMetadata)
    # Where to write the output PDF. Relative to CATALOG_STORAGE_ROOT.
    # If omitted, writes next to CWD under `generated_catalogs/`.
    output_dir: Optional[str] = None
    # Whether to also rasterize each page to PNG preview. Default true.
    generate_previews: bool = True
    preview_dpi: int = 144


class GenerateCatalogResult(BaseModel):
    pdf_path: str  # relative to CATALOG_STORAGE_ROOT
    preview_paths: list[str] = Field(default_factory=list)
    page_count: int
    file_size: int


# ─── Jobs ──────────────────────────────────────────────────
JobStatus = Literal["pending", "running", "completed", "failed"]


class JobRef(BaseModel):
    job_id: str


class JobInfo(BaseModel):
    job_id: str
    kind: str
    status: JobStatus
    progress: Optional[float] = None  # 0..1
    message: Optional[str] = None
    error: Optional[str] = None
    result: Optional[Any] = None
    created_at: float
    updated_at: float
