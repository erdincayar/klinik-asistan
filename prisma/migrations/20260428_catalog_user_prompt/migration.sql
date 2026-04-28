-- CatalogProject: serbest prompt + çıktı tipi + dinamik veri şeması
ALTER TABLE "CatalogProject"
  ADD COLUMN "userPrompt" TEXT,
  ADD COLUMN "outputType" TEXT NOT NULL DEFAULT 'PDF_CATALOG',
  ADD COLUMN "dataSchema" JSONB;

-- CatalogProduct: custom alanlar için dinamik haznesi
ALTER TABLE "CatalogProduct"
  ADD COLUMN "extra" JSONB;
