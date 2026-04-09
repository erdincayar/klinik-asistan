export const metadata = {
  title: "Gizlilik Politikası | Poby.ai",
  description: "Poby.ai gizlilik politikası — kişisel verilerinizi nasıl topluyor, kullanıyor ve koruyoruz.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-sm prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gizlilik Politikası</h1>
        <p className="text-sm text-gray-500 mb-8">Son güncelleme: 9 Nisan 2026</p>

        <h2>1. Veri Sorumlusu</h2>
        <p>
          Bu gizlilik politikası, <strong>poby.ai</strong> alan adı üzerinden hizmet veren Poby platformu
          (&ldquo;Poby&rdquo;, &ldquo;biz&rdquo;, &ldquo;Platform&rdquo;) tarafından hazırlanmıştır.
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) kapsamında veri sorumlusu sıfatıyla
          kişisel verilerinizi aşağıda açıklanan koşullarda işlemekteyiz.
        </p>
        <p>
          İletişim: <a href="mailto:info@poby.ai">info@poby.ai</a><br />
          Web: <a href="https://poby.ai">https://poby.ai</a>
        </p>

        <h2>2. Toplanan Kişisel Veriler</h2>
        <p>Platform üzerinden aşağıdaki kategorilerde kişisel veri toplanmaktadır:</p>

        <h3>2.1 Kullanıcı (İşletme Sahibi) Verileri</h3>
        <ul>
          <li><strong>Kimlik bilgileri:</strong> Ad, soyad</li>
          <li><strong>İletişim bilgileri:</strong> E-posta adresi, telefon numarası</li>
          <li><strong>İşletme bilgileri:</strong> İşletme adı, adresi, vergi bilgileri, sektör</li>
          <li><strong>Hesap bilgileri:</strong> Şifre (hashlenmiş), profil fotoğrafı</li>
          <li><strong>Ödeme bilgileri:</strong> Kart son 4 hanesi, ödeme geçmişi (kart bilgileri PayTR tarafından saklanır)</li>
          <li><strong>Oturum bilgileri:</strong> Giriş tarihleri, IP adresi, cihaz/tarayıcı bilgisi</li>
        </ul>

        <h3>2.2 Müşteri Verileri (İşletme Müşterileri)</h3>
        <p>
          Kullanıcılar, kendi müşterilerine ait aşağıdaki verileri Platform&apos;a girebilir.
          Bu veriler, kullanıcı adına <strong>veri işleyen</strong> sıfatıyla işlenmektedir:
        </p>
        <ul>
          <li><strong>Kimlik bilgileri:</strong> Ad, soyad</li>
          <li><strong>İletişim bilgileri:</strong> Telefon, e-posta, adres (il/ilçe)</li>
          <li><strong>Randevu bilgileri:</strong> Tarih, saat, hizmet türü, notlar</li>
          <li><strong>Finansal bilgiler:</strong> Ödeme tutarları, borç/alacak, fatura bilgileri</li>
          <li><strong>Fotoğraflar:</strong> Kullanıcının yüklediği müşteri fotoğrafları</li>
          <li><strong>Özel alanlar:</strong> İşletmenin tanımladığı ek bilgi alanları</li>
        </ul>

        <h3>2.3 Otomatik Toplanan Veriler</h3>
        <ul>
          <li>Sayfa görüntüleme ve özellik kullanım istatistikleri</li>
          <li>IP adresi, tarayıcı türü, işletim sistemi</li>
          <li>Google Analytics aracılığıyla anonim kullanım verileri</li>
          <li>Çerez bilgileri (detay için <a href="/cookies">Çerez Politikası</a>)</li>
        </ul>

        <h2>3. Verilerin İşlenme Amaçları</h2>
        <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
        <ul>
          <li>Platform hizmetlerinin sunulması ve iyileştirilmesi</li>
          <li>Kullanıcı hesaplarının oluşturulması ve yönetimi</li>
          <li>Randevu, stok, finans ve müşteri yönetimi hizmetlerinin sağlanması</li>
          <li>AI destekli özelliklerin çalıştırılması (asistan, fatura okuma, içerik üretimi)</li>
          <li>WhatsApp ve Telegram bildirimlerinin gönderilmesi</li>
          <li>Ödeme işlemlerinin gerçekleştirilmesi</li>
          <li>Teknik destek ve müşteri hizmetlerinin sunulması</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li>Platform güvenliğinin sağlanması (fraud önleme, brute force koruması)</li>
        </ul>

        <h2>4. Verilerin İşlenme Hukuki Sebepleri (KVKK m.5)</h2>
        <ul>
          <li><strong>Açık rıza:</strong> Pazarlama iletişimi, AI özelliklerinin kullanımı</li>
          <li><strong>Sözleşmenin ifası:</strong> Hizmet sunumu için zorunlu veri işleme</li>
          <li><strong>Hukuki yükümlülük:</strong> Vergi mevzuatı, e-ticaret mevzuatı</li>
          <li><strong>Meşru menfaat:</strong> Platform güvenliği, hizmet iyileştirme, istatistik</li>
        </ul>

        <h2>5. Verilerin Aktarımı</h2>
        <p>Kişisel verileriniz aşağıdaki üçüncü taraflarla paylaşılabilir:</p>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left">Alıcı</th>
              <th className="text-left">Amaç</th>
              <th className="text-left">Konum</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Anthropic (Claude AI)</td>
              <td>AI asistan, fatura okuma, içerik üretimi</td>
              <td>ABD</td>
            </tr>
            <tr>
              <td>PayTR</td>
              <td>Ödeme işlemleri</td>
              <td>Türkiye</td>
            </tr>
            <tr>
              <td>Google (Analytics)</td>
              <td>Anonim kullanım istatistikleri</td>
              <td>ABD/AB</td>
            </tr>
            <tr>
              <td>Contabo (Sunucu)</td>
              <td>Veri barındırma</td>
              <td>Almanya</td>
            </tr>
            <tr>
              <td>WhatsApp/Telegram</td>
              <td>Mesajlaşma entegrasyonu</td>
              <td>ABD</td>
            </tr>
          </tbody>
        </table>
        <p>
          Yurt dışına veri aktarımı, KVKK m.9 kapsamında yeterli koruma sağlayan ülkelere veya
          açık rızanız doğrultusunda gerçekleştirilmektedir.
        </p>

        <h2>6. Veri Güvenliği</h2>
        <ul>
          <li>Tüm iletişim SSL/TLS (HTTPS) ile şifrelenmektedir</li>
          <li>Şifreler bcrypt algoritması ile hash&apos;lenerek saklanmaktadır</li>
          <li>Veritabanı erişimi yetkilendirme ve IP kısıtlaması ile sınırlıdır</li>
          <li>Brute force ve rate limiting koruması uygulanmaktadır</li>
          <li>Düzenli güvenlik güncellemeleri ve yedekleme yapılmaktadır</li>
          <li>OWASP Top 10 güvenlik standartlarına uygun geliştirme yapılmaktadır</li>
        </ul>

        <h2>7. Veri Saklama Süreleri</h2>
        <ul>
          <li><strong>Kullanıcı hesap verileri:</strong> Hesap aktif olduğu sürece + hesap silme sonrası 30 gün</li>
          <li><strong>Müşteri verileri:</strong> Kullanıcı hesabı aktif olduğu sürece</li>
          <li><strong>Finansal veriler:</strong> Yasal zorunluluk gereği 10 yıl (Vergi Usul Kanunu)</li>
          <li><strong>Log kayıtları:</strong> 2 yıl (5651 sayılı Kanun)</li>
          <li><strong>Ödeme kayıtları:</strong> 10 yıl</li>
        </ul>

        <h2>8. Kullanıcı Hakları (KVKK m.11)</h2>
        <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
          <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
          <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
          <li>KVKK m.7 kapsamında kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
          <li>Düzeltme/silme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
          <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
          <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
        </ul>
        <p>
          Başvurularınızı <a href="mailto:kvkk@poby.ai">kvkk@poby.ai</a> adresine veya
          kayıtlı e-posta adresinizden <a href="mailto:info@poby.ai">info@poby.ai</a> adresine iletebilirsiniz.
          Başvurular en geç 30 gün içinde cevaplanır.
        </p>

        <h2>9. Çerezler</h2>
        <p>
          Platform&apos;da oturum yönetimi için zorunlu çerezler kullanılmaktadır.
          Ayrıca Google Analytics aracılığıyla anonim kullanım istatistikleri toplanmaktadır.
          Detaylı bilgi için <a href="/cookies">Çerez Politikası</a> sayfamızı inceleyiniz.
        </p>

        <h2>10. Çocukların Gizliliği</h2>
        <p>
          Platform, 18 yaşın altındaki bireylere yönelik değildir. Bilerek 18 yaş altı
          bireylere ait kişisel veri toplamayız. Böyle bir durumun farkına varılması hâlinde
          ilgili veriler derhal silinir.
        </p>

        <h2>11. Değişiklikler</h2>
        <p>
          Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler Platform
          üzerinden veya e-posta ile bildirilir. Güncel versiyon her zaman bu sayfada yer alır.
        </p>

        <h2>12. İletişim</h2>
        <p>
          Gizlilik ve veri koruma ile ilgili sorularınız için:<br />
          E-posta: <a href="mailto:info@poby.ai">info@poby.ai</a><br />
          KVKK başvuruları: <a href="mailto:kvkk@poby.ai">kvkk@poby.ai</a><br />
          Web: <a href="https://poby.ai">https://poby.ai</a>
        </p>
      </div>
    </div>
  );
}
