-- AlterTable: Alarm — AI ve scheduled alanları ekle
ALTER TABLE "Alarm" ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Alarm" ADD COLUMN "schedule" TEXT;
ALTER TABLE "Alarm" ADD COLUMN "messageTemplate" TEXT;
ALTER TABLE "Alarm" ADD COLUMN "triggerAction" TEXT NOT NULL DEFAULT 'LOG';
ALTER TABLE "Alarm" ADD COLUMN "targetChannel" TEXT;

-- CreateIndex
CREATE INDEX "Alarm_clinicId_type_idx" ON "Alarm"("clinicId", "type");
