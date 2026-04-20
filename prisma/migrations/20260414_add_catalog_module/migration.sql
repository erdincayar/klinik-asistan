-- AI Catalog Generator module migration
-- Multi-tenant: clinicId references Clinic.id (tenant)

-- CreateTable: CatalogProject
CREATE TABLE "CatalogProject" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceLanguage" TEXT NOT NULL DEFAULT 'tr',
    "targetLanguage" TEXT NOT NULL DEFAULT 'tr',
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CatalogSourceFile
CREATE TABLE "CatalogSourceFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogSourceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CatalogProduct
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "originalName" TEXT,
    "name" TEXT NOT NULL,
    "originalDescription" TEXT,
    "description" TEXT,
    "technicalSpecs" JSONB,
    "category" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'TRY',
    "imageStoragePath" TEXT,
    "aiConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CatalogTemplate
CREATE TABLE "CatalogTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "htmlPath" TEXT NOT NULL,
    "cssPath" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CatalogGeneration
CREATE TABLE "CatalogGeneration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pdfPath" TEXT,
    "pageCount" INTEGER,
    "fileSize" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "tokensConsumed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogProject_clinicId_idx" ON "CatalogProject"("clinicId");
CREATE INDEX "CatalogProject_userId_idx" ON "CatalogProject"("userId");
CREATE INDEX "CatalogProject_status_idx" ON "CatalogProject"("status");

CREATE INDEX "CatalogSourceFile_projectId_idx" ON "CatalogSourceFile"("projectId");
CREATE INDEX "CatalogSourceFile_fileType_idx" ON "CatalogSourceFile"("fileType");

CREATE INDEX "CatalogProduct_projectId_idx" ON "CatalogProduct"("projectId");
CREATE INDEX "CatalogProduct_status_idx" ON "CatalogProduct"("status");
CREATE INDEX "CatalogProduct_order_idx" ON "CatalogProduct"("order");

CREATE UNIQUE INDEX "CatalogTemplate_slug_key" ON "CatalogTemplate"("slug");
CREATE INDEX "CatalogTemplate_sector_idx" ON "CatalogTemplate"("sector");
CREATE INDEX "CatalogTemplate_isSystem_idx" ON "CatalogTemplate"("isSystem");

CREATE INDEX "CatalogGeneration_projectId_idx" ON "CatalogGeneration"("projectId");
CREATE INDEX "CatalogGeneration_status_idx" ON "CatalogGeneration"("status");

-- AddForeignKey
ALTER TABLE "CatalogProject" ADD CONSTRAINT "CatalogProject_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogProject" ADD CONSTRAINT "CatalogProject_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "CatalogProject" ADD CONSTRAINT "CatalogProject_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "CatalogTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CatalogSourceFile" ADD CONSTRAINT "CatalogSourceFile_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "CatalogProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "CatalogProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogGeneration" ADD CONSTRAINT "CatalogGeneration_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "CatalogProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogGeneration" ADD CONSTRAINT "CatalogGeneration_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "CatalogTemplate"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
