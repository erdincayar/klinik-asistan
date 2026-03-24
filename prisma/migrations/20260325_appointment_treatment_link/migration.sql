-- AlterTable
ALTER TABLE "Treatment" ADD COLUMN "appointmentId" TEXT;
ALTER TABLE "Treatment" ADD COLUMN "paymentMethod" TEXT;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
