-- AlterTable: User'a telegramChatId ekle
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;

-- AlterTable: TelegramLink'e userId ekle
ALTER TABLE "TelegramLink" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "TelegramLink" ADD CONSTRAINT "TelegramLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
