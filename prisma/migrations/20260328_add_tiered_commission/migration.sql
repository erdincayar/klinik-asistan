-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "tieredCommission" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CommissionTier" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "minRevenue" INTEGER NOT NULL,
    "commissionPct" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionTier_employeeId_idx" ON "CommissionTier"("employeeId");

-- AddForeignKey
ALTER TABLE "CommissionTier" ADD CONSTRAINT "CommissionTier_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
