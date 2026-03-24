-- CreateTable
CREATE TABLE "OnboardingProfile" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clinicId" TEXT,
    "sector" TEXT,
    "sectorCustom" TEXT,
    "teamSize" TEXT,
    "painPoints" JSONB,
    "recommendedModules" JSONB,
    "selectedModules" JSONB,
    "analysisResult" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "featureList" JSONB NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "sectors" JSONB NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProfile_sessionId_key" ON "OnboardingProfile"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleDefinition_slug_key" ON "ModuleDefinition"("slug");

-- AddForeignKey
ALTER TABLE "OnboardingProfile" ADD CONSTRAINT "OnboardingProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
