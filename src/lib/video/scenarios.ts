// Video recording scenarios for Poby.ai product demos

export interface ScenarioStep {
  action: "navigate" | "click" | "type" | "wait" | "scroll" | "screenshot";
  selector?: string;
  value?: string;
  url?: string;
  duration?: number; // ms
  caption: string; // overlay text for this step
  highlight?: string; // selector to highlight
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  hookText: string; // First 2 seconds hook
  ctaText: string; // Last frame CTA
  steps: ScenarioStep[];
}

const DEMO_BASE = "https://poby.ai";

export const SCENARIOS: Record<string, Scenario> = {
  "appointment-create": {
    id: "appointment-create",
    name: "Randevu Oluşturma",
    description: "Yeni randevu oluşturma akışı",
    hookText: "Randevu yönetimi bu kadar kolay!",
    ctaText: "7 gün ücretsiz deneyin → poby.ai",
    steps: [
      { action: "navigate", url: `${DEMO_BASE}/appointments`, caption: "Randevular sayfasını aç", duration: 1500 },
      { action: "screenshot", caption: "Randevu takvimini gör" },
      { action: "click", selector: "button:has-text('Yeni Randevu'), button:has-text('Randevu')", caption: "Yeni randevu butonuna tıkla" },
      { action: "wait", duration: 1000, caption: "Randevu formu açılıyor" },
      { action: "screenshot", caption: "Randevu formunu doldur" },
      { action: "type", selector: "input[placeholder*='Müşteri'], input[placeholder*='müşteri']", value: "Ayşe Yılmaz", caption: "Müşteri adını yaz" },
      { action: "wait", duration: 800, caption: "" },
      { action: "screenshot", caption: "Tarih ve saat seç" },
      { action: "screenshot", caption: "Randevu kaydedildi!" },
    ],
  },
  "customer-add": {
    id: "customer-add",
    name: "Yeni Müşteri Ekleme",
    description: "Müşteri CRM'e yeni kayıt ekleme",
    hookText: "Müşteri kaydı 30 saniyede tamam!",
    ctaText: "7 gün ücretsiz deneyin → poby.ai",
    steps: [
      { action: "navigate", url: `${DEMO_BASE}/patients`, caption: "Müşteriler sayfasını aç", duration: 1500 },
      { action: "screenshot", caption: "Müşteri listesini gör" },
      { action: "click", selector: "button:has-text('Müşteri Ekle'), a[href='/patients/new']", caption: "Yeni müşteri ekle" },
      { action: "wait", duration: 1000, caption: "" },
      { action: "screenshot", caption: "Müşteri formunu doldur" },
      { action: "type", selector: "input[name='name'], input[placeholder*='Ad']", value: "Mehmet Kaya", caption: "Ad soyad gir" },
      { action: "type", selector: "input[name='phone'], input[placeholder*='Telefon']", value: "0532 123 45 67", caption: "Telefon numarasını gir" },
      { action: "screenshot", caption: "Kaydet ve müşteri kartını gör" },
    ],
  },
  "invoice-create": {
    id: "invoice-create",
    name: "Fatura Oluşturma",
    description: "AI ile fatura okuma ve kayıt",
    hookText: "Faturayı çek, AI otomatik okusun!",
    ctaText: "7 gün ücretsiz deneyin → poby.ai",
    steps: [
      { action: "navigate", url: `${DEMO_BASE}/finance`, caption: "Finans sayfasını aç", duration: 1500 },
      { action: "screenshot", caption: "Gelir-gider özeti" },
      { action: "navigate", url: `${DEMO_BASE}/invoice-upload`, caption: "Fatura yükleme sayfası" },
      { action: "wait", duration: 1000, caption: "" },
      { action: "screenshot", caption: "Faturanın fotoğrafını yükle" },
      { action: "screenshot", caption: "AI faturayı otomatik okuyor" },
      { action: "screenshot", caption: "Tutar, KDV, tedarikçi otomatik dolduruldu!" },
    ],
  },
  "stock-update": {
    id: "stock-update",
    name: "Stok Güncelleme",
    description: "Stok yönetimi ve ürün takibi",
    hookText: "Stok takibi artık otomatik!",
    ctaText: "7 gün ücretsiz deneyin → poby.ai",
    steps: [
      { action: "navigate", url: `${DEMO_BASE}/inventory`, caption: "Stok/Envanter sayfasını aç", duration: 1500 },
      { action: "screenshot", caption: "Ürün listesini gör" },
      { action: "screenshot", caption: "Stok miktarlarını kontrol et" },
      { action: "screenshot", caption: "Kritik stok uyarılarını gör" },
      { action: "screenshot", caption: "Stok hareketi ekle" },
    ],
  },
  "dashboard-tour": {
    id: "dashboard-tour",
    name: "Dashboard Genel Tur",
    description: "Poby.ai genel bakış turu",
    hookText: "İşletmenizi tek panelden yönetin!",
    ctaText: "7 gün ücretsiz deneyin → poby.ai",
    steps: [
      { action: "navigate", url: `${DEMO_BASE}/dashboard`, caption: "Dashboard — genel bakış", duration: 2000 },
      { action: "screenshot", caption: "Günlük özet ve istatistikler" },
      { action: "scroll", value: "500", caption: "Bugünkü randevular ve gelir" },
      { action: "screenshot", caption: "Yaklaşan randevular" },
      { action: "navigate", url: `${DEMO_BASE}/patients`, caption: "Müşteri yönetimi", duration: 1500 },
      { action: "screenshot", caption: "Müşteri listesi ve CRM" },
      { action: "navigate", url: `${DEMO_BASE}/appointments`, caption: "Randevu takvimi", duration: 1500 },
      { action: "screenshot", caption: "Randevularınız tek bakışta" },
      { action: "navigate", url: `${DEMO_BASE}/finance`, caption: "Finans takibi", duration: 1500 },
      { action: "screenshot", caption: "Gelir, gider, KDV hepsi burada" },
    ],
  },
  "whatsapp-demo": {
    id: "whatsapp-demo",
    name: "WhatsApp Bot Demo",
    description: "WhatsApp entegrasyonu ve otomatik mesajlaşma",
    hookText: "WhatsApp ile otomatik randevu hatırlatma!",
    ctaText: "7 gün ücretsiz deneyin → poby.ai",
    steps: [
      { action: "navigate", url: `${DEMO_BASE}/messaging`, caption: "Mesajlaşma sayfasını aç", duration: 1500 },
      { action: "screenshot", caption: "WhatsApp entegrasyonu" },
      { action: "screenshot", caption: "Otomatik hatırlatma ayarları" },
      { action: "screenshot", caption: "Mesaj şablonları" },
    ],
  },
};

export function getScenario(id: string): Scenario | null {
  return SCENARIOS[id] || null;
}

export function getAllScenarios(): Scenario[] {
  return Object.values(SCENARIOS);
}
