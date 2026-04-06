-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SubscriptionPayment" ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
ADD COLUMN     "paytrOrderId" TEXT,
ADD COLUMN     "paytrToken" TEXT;
