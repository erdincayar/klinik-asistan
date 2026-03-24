-- AlterTable
ALTER TABLE "Alarm" ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Alarm" ADD COLUMN "groupName" TEXT;
ALTER TABLE "Alarm" ADD COLUMN "customerId" TEXT;

-- CreateIndex
CREATE INDEX "Alarm_clinicId_groupName_idx" ON "Alarm"("clinicId", "groupName");
CREATE INDEX "Alarm_clinicId_customerId_idx" ON "Alarm"("clinicId", "customerId");

-- AddForeignKey
ALTER TABLE "Alarm" ADD CONSTRAINT "Alarm_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
