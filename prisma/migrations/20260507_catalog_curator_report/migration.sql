-- AI Curator çıktısını saklamak için
ALTER TABLE "CatalogProject"
  ADD COLUMN "curatorReport" JSONB;
