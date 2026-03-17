export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  category: string;
  readingTime: string;
  image?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "klinik-yonetim-yazilimi-neden-onemli",
    title: "Klinik Yönetim Yazılımı Neden Önemli?",
    description:
      "Dijital dönüşüm çağında kliniklerin neden bir yönetim yazılımına ihtiyaç duyduğunu ve Poby.ai'ın sunduğu çözümleri keşfedin.",
    content: `Dijital dönüşüm her sektörü etkiliyor ve sağlık sektörü de bundan payını alıyor. Klinikler artık kağıt dosyalar ve Excel tablolarıyla yönetilemeyecek kadar karmaşık bir yapıya sahip.

## Neden Klinik Yazılımı?

Modern bir klinik yönetim yazılımı size şunları sağlar:

- **Hasta Takibi:** Tüm hasta bilgileri, tedavi geçmişi ve notlar tek bir yerde.
- **Randevu Yönetimi:** Online randevu alma, otomatik hatırlatmalar ve takvim yönetimi.
- **Finansal Kontrol:** Gelir-gider takibi, faturalama ve KDV hesaplama.
- **İletişim:** WhatsApp üzerinden otomatik mesajlaşma ve hasta iletişimi.

## AI Destekli Yönetim

Yapay zeka teknolojisi klinik yönetimini bir üst seviyeye taşıyor. Poby.ai'ın AI asistanı:

- Hastaların sorularını 7/24 yanıtlar
- WhatsApp üzerinden randevu alır
- Tedavi bilgilerini paylaşır
- Hatırlatma mesajları gönderir

## Sonuç

Doğru bir klinik yönetim yazılımı seçmek, hem zaman hem de maliyet tasarrufu sağlar. Poby.ai ile kliniğinizi dijitalleştirin ve hastalarınıza daha iyi hizmet verin.`,
    author: "Poby.ai Ekibi",
    publishedAt: "2026-01-15",
    updatedAt: "2026-01-15",
    category: "Klinik",
    readingTime: "4 dk",
  },
  {
    slug: "whatsapp-business-isletme-iletisimi",
    title: "WhatsApp Business ile İşletme İletişimini Güçlendirin",
    description:
      "WhatsApp Business API'nin işletmenize nasıl katkı sağlayacağını, otomatik mesajlaşma ve AI asistan entegrasyonunu öğrenin.",
    content: `WhatsApp, Türkiye'de en çok kullanılan mesajlaşma uygulaması. İşletmeler için WhatsApp Business API kullanmak artık bir lüks değil, zorunluluk.

## WhatsApp Business Avantajları

- **Müşteri Erişimi:** Müşterileriniz zaten WhatsApp kullanıyor. Onlara bildikleri kanaldan ulaşın.
- **Otomatik Yanıtlar:** Sık sorulan sorulara otomatik yanıt vererek zamandan tasarruf edin.
- **Randevu Hatırlatma:** Otomatik hatırlatma mesajları ile randevu kaçırmayı önleyin.
- **Profesyonel İmaj:** İşletme profili ile güvenilir bir görüntü oluşturun.

## AI Asistan Entegrasyonu

Poby.ai'ın AI asistanı WhatsApp'ı bir üst seviyeye taşır:

- 7/24 müşteri desteği
- Akıllı soru-cevap
- Randevu alma ve iptal
- Kampanya duyuruları

## Nasıl Başlanır?

1. Poby.ai'a ücretsiz kayıt olun
2. WhatsApp Business API bağlantısını kurun
3. AI asistanı eğitin
4. Müşterilerinize hizmet vermeye başlayın

Adım adım rehberimizle 15 dakikada kurulum yapabilirsiniz.`,
    author: "Poby.ai Ekibi",
    publishedAt: "2026-02-10",
    updatedAt: "2026-02-10",
    category: "Pazarlama",
    readingTime: "5 dk",
  },
  {
    slug: "kucuk-isletmeler-icin-ai-rehberi",
    title: "Küçük İşletmeler İçin AI Rehberi",
    description:
      "Yapay zekanın küçük işletmelere nasıl yardımcı olabileceğini, pratik kullanım alanlarını ve Poby.ai ile nasıl başlayacağınızı öğrenin.",
    content: `Yapay zeka artık sadece büyük şirketlerin kullandığı bir teknoloji değil. Küçük işletmeler de AI'dan faydalanarak rekabet avantajı elde edebilir.

## AI Kullanım Alanları

### 1. Müşteri İletişimi
AI chatbotlar müşteri sorularını 7/24 yanıtlayabilir. Randevu alma, fiyat bilgisi ve sık sorulan sorular otomatik olarak cevaplanır.

### 2. İçerik Üretimi
Sosyal medya görselleri, kampanya metinleri ve blog yazıları AI ile hızla oluşturulabilir.

### 3. Finansal Analiz
Gelir-gider trendleri, müşteri davranış analizi ve tahminleme AI ile daha doğru yapılabilir.

### 4. Pazarlama Otomasyonu
Hedefli reklam kampanyaları, e-posta otomasyonu ve müşteri segmentasyonu AI ile optimize edilebilir.

## Poby.ai ile AI Kullanımı

Poby.ai, küçük işletmelerin AI teknolojisine kolay erişimini sağlar:

- **Poby Asistan:** İşletmenize özel eğitilmiş AI asistan
- **AI İçerik Stüdyosu:** DALL-E 3 ile görsel üretimi
- **Akıllı Raporlama:** AI destekli finansal analiz
- **WhatsApp AI:** Otomatik müşteri iletişimi

## Başlarken

AI kullanmaya başlamak için teknik bilgiye ihtiyacınız yok. Poby.ai'ın sezgisel arayüzü ile dakikalar içinde AI'ı işletmenize entegre edebilirsiniz.`,
    author: "Poby.ai Ekibi",
    publishedAt: "2026-03-05",
    updatedAt: "2026-03-05",
    category: "Teknoloji",
    readingTime: "6 dk",
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
