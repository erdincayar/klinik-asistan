-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "saleCurrency" TEXT NOT NULL DEFAULT 'TRY',
ADD COLUMN     "salePriceUSD" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "StockAlarm" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAlarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" INTEGER NOT NULL DEFAULT 0,
    "serialNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StockAlarm" ADD CONSTRAINT "StockAlarm_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlarm" ADD CONSTRAINT "StockAlarm_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
