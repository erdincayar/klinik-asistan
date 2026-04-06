/*
  Warnings:

  - You are about to drop the column `alarmEnabled` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "alarmEnabled",
ADD COLUMN     "minProfitMargin" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "orderAlert" BOOLEAN NOT NULL DEFAULT false;
