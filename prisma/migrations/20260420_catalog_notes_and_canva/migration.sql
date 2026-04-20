-- File-level notes + AI analysis
ALTER TABLE "CatalogSourceFile"
  ADD COLUMN "userNote" TEXT,
  ADD COLUMN "aiNote" JSONB,
  ADD COLUMN "aiAnalyzedAt" TIMESTAMP(3);

-- Canva edit tracking on generations
ALTER TABLE "CatalogGeneration"
  ADD COLUMN "canvaDesignId" TEXT,
  ADD COLUMN "canvaEditUrl" TEXT,
  ADD COLUMN "canvaSentAt" TIMESTAMP(3);

-- Per-clinic Canva OAuth connection
CREATE TABLE "CatalogCanvaConnection" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "canvaUserId" TEXT,
    "canvaDisplay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCanvaConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogCanvaConnection_clinicId_key"
  ON "CatalogCanvaConnection"("clinicId");

ALTER TABLE "CatalogCanvaConnection" ADD CONSTRAINT "CatalogCanvaConnection_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
