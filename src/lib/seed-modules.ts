import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const modules = [
  { name: "PATIENTS", displayName: "Müşteri Yönetimi", description: "Müşteri kayıtlarını yönetin", price: 149, icon: "Users", isCore: false },
  { name: "APPOINTMENTS", displayName: "Randevu Sistemi", description: "Akıllı takvim ile randevu planlama", price: 99, icon: "Calendar", isCore: false },
  { name: "FINANCE", displayName: "Finansal Takip", description: "Gelir-gider takibi ve raporlama", price: 129, icon: "DollarSign", isCore: false },
  { name: "INVOICES", displayName: "e-Fatura Sistemi", description: "e-Fatura ve e-Arşiv oluşturma", price: 79, icon: "FileText", isCore: false },
  { name: "INVENTORY", displayName: "Stok Yönetimi", description: "Ürün ve malzeme stok takibi", price: 99, icon: "Package", isCore: false },
  { name: "AI_ASSISTANT", displayName: "AI Asistan", description: "Yapay zekâ destekli akıllı asistan", price: 199, icon: "Bot", isCore: false },
  { name: "MESSAGING", displayName: "Mesajlaşma", description: "WhatsApp ve Telegram entegrasyonu", price: 89, icon: "MessageCircle", isCore: false },
  { name: "REPORTS", displayName: "Raporlama", description: "Detaylı analiz ve raporlar", price: 69, icon: "BarChart3", isCore: false },
  { name: "MARKETING", displayName: "Pazarlama", description: "Meta Ads ve kampanya analizi", price: 149, icon: "Megaphone", isCore: false },
  { name: "SOCIAL_MEDIA", displayName: "Sosyal Medya", description: "İçerik planlama ve otomatik paylaşım", price: 119, icon: "Share2", isCore: false },
];

async function main() {
  console.log("Modüller ekleniyor...");
  for (const mod of modules) {
    await prisma.module.upsert({
      where: { name: mod.name },
      update: { displayName: mod.displayName, description: mod.description, price: mod.price, icon: mod.icon },
      create: mod,
    });
    console.log(`  ✓ ${mod.displayName} (₺${mod.price}/ay)`);
  }
  console.log("Tüm modüller başarıyla eklendi!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
