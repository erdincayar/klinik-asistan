-- AlterTable: Product — tedarik zinciri alanları
ALTER TABLE "Product" ADD COLUMN "supplier" TEXT;
ALTER TABLE "Product" ADD COLUMN "leadTimeDays" INTEGER;
ALTER TABLE "Product" ADD COLUMN "reorderPoint" INTEGER;
ALTER TABLE "Product" ADD COLUMN "reorderQty" INTEGER;
ALTER TABLE "Product" ADD COLUMN "autoReorder" BOOLEAN NOT NULL DEFAULT false;
