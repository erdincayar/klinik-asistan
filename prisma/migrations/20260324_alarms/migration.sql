-- AlterTable: Patient add dateOfBirth
ALTER TABLE "Patient" ADD COLUMN "dateOfBirth" TIMESTAMP(3);

-- CreateTable: Alarm
CREATE TABLE "Alarm" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AlarmLog
CREATE TABLE "AlarmLog" (
    "id" TEXT NOT NULL,
    "alarmId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlarmLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlarmLog_clinicId_isRead_idx" ON "AlarmLog"("clinicId", "isRead");
CREATE INDEX "AlarmLog_alarmId_idx" ON "AlarmLog"("alarmId");

-- AddForeignKey
ALTER TABLE "Alarm" ADD CONSTRAINT "Alarm_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlarmLog" ADD CONSTRAINT "AlarmLog_alarmId_fkey" FOREIGN KEY ("alarmId") REFERENCES "Alarm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlarmLog" ADD CONSTRAINT "AlarmLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
