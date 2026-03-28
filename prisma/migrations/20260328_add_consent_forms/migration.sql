-- CreateTable
CREATE TABLE "ConsentForm" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "fields" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentFormResponse" (
    "id" TEXT NOT NULL,
    "consentFormId" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT NOT NULL,
    "patientTc" TEXT,
    "signature" TEXT,
    "fieldValues" JSONB,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "ConsentFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentForm_clinicId_idx" ON "ConsentForm"("clinicId");
CREATE INDEX "ConsentFormResponse_consentFormId_idx" ON "ConsentFormResponse"("consentFormId");
CREATE INDEX "ConsentFormResponse_patientId_idx" ON "ConsentFormResponse"("patientId");

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentFormResponse" ADD CONSTRAINT "ConsentFormResponse_consentFormId_fkey" FOREIGN KEY ("consentFormId") REFERENCES "ConsentForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentFormResponse" ADD CONSTRAINT "ConsentFormResponse_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
