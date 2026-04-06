-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "alarmEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'TRY';
