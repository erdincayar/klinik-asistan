-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "customFields" JSONB;

-- AlterTable
ALTER TABLE "UploadedInvoice" ADD COLUMN     "profitData" JSONB;

-- CreateTable
CREATE TABLE "InventoryColumnConfig" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryColumnConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryColumnConfig_clinicId_key" ON "InventoryColumnConfig"("clinicId");

-- AddForeignKey
ALTER TABLE "InventoryColumnConfig" ADD CONSTRAINT "InventoryColumnConfig_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
