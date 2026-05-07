-- CatalogProject: özel belge boyutu
ALTER TABLE "CatalogProject"
  ADD COLUMN "pageSize" JSONB;

-- CatalogSourceFile: işlenmiş görsel varyantları
ALTER TABLE "CatalogSourceFile"
  ADD COLUMN "processedPath"   TEXT,
  ADD COLUMN "lifestylePath"   TEXT,
  ADD COLUMN "lifestylePreset" TEXT,
  ADD COLUMN "activeVariant"   TEXT DEFAULT 'original';
