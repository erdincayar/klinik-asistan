export const metadata = {
  title: "Kullanım Koşulları | Poby.ai",
  description: "Poby.ai kullanım koşulları ve hizmet sözleşmesi.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-sm prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kullanım Koşulları</h1>
        <p className="text-sm text-gray-500 mb-8">Son güncelleme: 9 Nisan 2026</p>

        <h2>1. Taraflar ve Kapsam</h2>
        <p>
          Bu kullanım koşulları (&ldquo;Sözleşme&rdquo;), <strong>poby.ai</strong> adresi üzerinden
          hizmet veren Poby platformu (&ldquo;Poby&rdquo;, &ldquo;Platform&rdquo;) ile Platform&apos;a
          kayıt olan ve hizmetleri kullanan gerçek veya tüzel kişi (&ldquo;Kullanıcı&rdquo;) arasında
          akdedilmiştir. Platform&apos;a kayıt olarak bu Sözleşme&apos;yi kabul etmiş sayılırsınız.
        </p>

        <h2>2. Hizmetin Tanımı</h2>
        <p>
          Poby, işletmelere yönelik AI destekli bir SaaS (Hizmet Olarak Yazılım) yönetim platformudur.
          Sunulan hizmetler şunları kapsar:
        </p>
        <ul>
          <li>Müşteri ilişkileri yönetimi (CRM)</li>
          <li>Randevu ve takvim yönetimi</li>
          <li>Gelir-gider, fatura ve KDV takibi</li>
          <li>Stok ve envanter yönetimi</li>
          <li>Çalışan ve bordro yönetimi</li>
          <li>WhatsApp ve Telegram entegrasyonu</li>
          <li>AI asistan ve fatura okuma (OCR)</li>
          <li>Raporlama ve analiz</li>
          <li>Sosyal medya içerik yönetimi</li>
        </ul>

        <h2>3. Hesap Oluşturma ve Güvenlik</h2>
        <ul>
          <li>Kayıt için geçerli bir e-posta adresi ve doğru bilgiler gereklidir.</li>
          <li>Hesap güvenliğinden Kullanıcı sorumludur. Şifrenizi üçüncü kişilerle paylaşmayınız.</li>
          <li>Hesabınızda yetkisiz erişim fark ettiğinizde derhal bize bildirmeniz gerekmektedir.</li>
          <li>Bir kişi yalnızca bir hesap açabilir. Çoklu hesap tespit edilmesi hâlinde hesaplar askıya alınabilir.</li>
        </ul>

        <h2>4. Ücretsiz Deneme ve Abonelik</h2>
        <ul>
          <li><strong>Ücretsiz deneme:</strong> Yeni kullanıcılar 7 gün ücretsiz deneme hakkına sahiptir.</li>
          <li><strong>Abonelik ücreti:</strong> Deneme süresi sonrasında aylık 499 ₺ (KDV dahil) abonelik ücreti uygulanır.</li>
          <li><strong>Ödeme:</strong> PayTR altyapısı üzerinden kredi/banka kartı ile tahsil edilir.</li>
          <li><strong>Otomatik yenileme:</strong> Abonelik her ay otomatik olarak yenilenir. İptal için bir sonraki fatura tarihinden önce işlem yapılmalıdır.</li>
          <li><strong>İade politikası:</strong> Ödeme yapıldıktan sonra ilgili ay için iade yapılmaz. İptal, bir sonraki dönemden itibaren geçerli olur.</li>
        </ul>

        <h2>5. Kullanıcının Yükümlülükleri</h2>
        <p>Kullanıcı aşağıdaki hususları kabul eder:</p>
        <ul>
          <li>Platform&apos;u yalnızca yasal amaçlarla kullanmak</li>
          <li>Girilen müşteri verilerinin doğruluğundan ve KVKK uyumluluğundan kendisi sorumludur</li>
          <li>Kendi müşterilerinden gerekli izin ve onayları almak (aydınlatma metni, açık rıza)</li>
          <li>Platform&apos;u kötüye kullanmamak (spam, zararlı yazılım, tersine mühendislik vb.)</li>
          <li>Platform&apos;un altyapısını olumsuz etkileyecek toplu/otomatik işlemler yapmamak</li>
          <li>Hesap bilgilerini güncel tutmak</li>
        </ul>

        <h2>6. Veri Sorumluluğu (KVKK Kapsamında)</h2>
        <p>
          Kullanıcı, Platform&apos;a girdiği müşteri verileri bakımından <strong>veri sorumlusu</strong>
          sıfatını taşır. Poby, bu veriler bakımından <strong>veri işleyen</strong> konumundadır.
        </p>
        <ul>
          <li>Kullanıcı, müşterilerini KVKK kapsamında aydınlatmak ve gerekli hallerde açık rızalarını almakla yükümlüdür.</li>
          <li>Poby, kullanıcı adına işlediği verileri yalnızca hizmet sunumu amacıyla kullanır.</li>
          <li>Kullanıcı, Poby&apos;den müşteri verilerinin silinmesini veya aktarılmasını talep edebilir.</li>
          <li>Poby, veri güvenliği ihlâli durumunda Kullanıcıyı en kısa sürede bilgilendirir.</li>
        </ul>

        <h2>7. Fikri Mülkiyet</h2>
        <ul>
          <li>Platform&apos;un yazılımı, tasarımı, logosu ve içeriği Poby&apos;ye aittir.</li>
          <li>Kullanıcı tarafından girilen veriler Kullanıcıya aittir.</li>
          <li>AI tarafından üretilen içerikler (sosyal medya postları, belgeler vb.) Kullanıcının kullanımına sunulur.</li>
        </ul>

        <h2>8. Hizmet Düzeyi ve Erişilebilirlik</h2>
        <ul>
          <li>Poby, Platform&apos;un %99.5 erişilebilirlik oranıyla çalışması için azami çaba gösterir.</li>
          <li>Planlı bakım çalışmaları önceden bildirilir.</li>
          <li>Mücbir sebepler (doğal afet, siber saldırı, altyapı arızası vb.) nedeniyle yaşanan kesintilerden Poby sorumlu tutulamaz.</li>
        </ul>

        <h2>9. Sorumluluk Sınırı</h2>
        <ul>
          <li>Poby, Platform&apos;un kullanımından kaynaklanan doğrudan veya dolaylı zararlardan sorumlu değildir.</li>
          <li>Kullanıcının girdiği verilerin doğruluğu ve yasal uygunluğu Kullanıcının sorumluluğundadır.</li>
          <li>AI özellikleri &ldquo;olduğu gibi&rdquo; sunulur; AI çıktılarının doğruluğu garanti edilmez.</li>
          <li>Poby&apos;nin toplam sorumluluğu, Kullanıcının son 12 ayda ödediği abonelik tutarıyla sınırlıdır.</li>
        </ul>

        <h2>10. Hesap Askıya Alma ve Fesih</h2>
        <ul>
          <li>Poby, bu Sözleşme&apos;yi ihlâl eden hesapları önceden bildirim yaparak askıya alabilir veya sonlandırabilir.</li>
          <li>Kullanıcı, hesabını dilediği zaman kapatabilir. Hesap kapatma talebi 30 gün içinde işleme alınır.</li>
          <li>Hesap kapatıldığında veriler 30 gün içinde kalıcı olarak silinir (yasal zorunluluklar hariç).</li>
        </ul>

        <h2>11. Uyuşmazlık Çözümü</h2>
        <p>
          Bu Sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda İstanbul
          Mahkemeleri ve İcra Daireleri yetkilidir.
        </p>

        <h2>12. Değişiklikler</h2>
        <p>
          Poby, bu kullanım koşullarını önceden bildirmek kaydıyla değiştirme hakkını saklı tutar.
          Değişiklikler Platform üzerinden veya e-posta ile duyurulur. Değişiklik sonrası Platform&apos;u
          kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.
        </p>

        <h2>13. İletişim</h2>
        <p>
          E-posta: <a href="mailto:info@poby.ai">info@poby.ai</a><br />
          Web: <a href="https://poby.ai">https://poby.ai</a>
        </p>
      </div>
    </div>
  );
}
