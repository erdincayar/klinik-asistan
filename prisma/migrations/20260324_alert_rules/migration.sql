-- CreateTable: CustomerAlertRule
CREATE TABLE "CustomerAlertRule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'no_visit',
    "thresholdDays" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAlertRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomerAlertRule" ADD CONSTRAINT "CustomerAlertRule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
