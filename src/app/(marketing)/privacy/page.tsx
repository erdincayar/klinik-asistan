export const metadata = { title: "Gizlilik Politikası" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Gizlilik Politikası</h1>
        <p className="text-sm text-gray-500 mb-8">Son güncelleme: 28 Mart 2026</p>

        <h2>1. Genel Bakış</h2>
        <p>
          Poby.ai (&ldquo;Poby&rdquo;, &ldquo;biz&rdquo;, &ldquo;bizim&rdquo;), kullanıcılarımızın gizliliğine saygı duyar.
          Bu gizlilik politikası, hizmetlerimizi kullanırken topladığımız, kullandığımız ve koruduğumuz
          kişisel verileri açıklamaktadır.
        </p>

        <h2>2. Toplanan Veriler</h2>
        <p>Hizmetlerimizi kullanırken aşağıdaki veriler toplanabilir:</p>
        <ul>
          <li><strong>Hesap bilgileri:</strong> Ad, e-posta adresi, telefon numarası</li>
          <li><strong>İşletme bilgileri:</strong> İşletme adı, adres, sektör</li>
          <li><strong>Müşteri verileri:</strong> Müşteri adları, telefon numaraları, randevu bilgileri</li>
          <li><strong>Finansal veriler:</strong> Gelir-gider kayıtları, fatura bilgileri</li>
          <li><strong>Stok verileri:</strong> Ürün bilgileri, stok hareketleri</li>
          <li><strong>Kullanım verileri:</strong> Sayfa ziyaretleri, özellik kullanımı</li>
          <li><strong>Cihaz bilgileri:</strong> IP adresi, tarayıcı türü, işletim sistemi</li>
        </ul>

        <h2>3. Verilerin Kullanımı</h2>
        <p>Topladığımız verileri şu amaçlarla kullanırız:</p>
        <ul>
          <li>Hizmetlerimizi sağlamak ve iyileştirmek</li>
          <li>Kullanıcı hesaplarını yönetmek</li>
          <li>AI destekli özellikler sunmak</li>
          <li>Bildirim ve hatırlatmalar göndermek</li>
          <li>Teknik destek sağlamak</li>
          <li>Yasal yükümlülükleri yerine getirmek</li>
        </ul>

        <h2>4. Veri Güvenliği</h2>
        <p>
          Verileriniz SSL/TLS şifreleme ile korunur. Şifreler bcrypt ile hash&apos;lenir.
          Veritabanı erişimi yetkilendirme ile sınırlıdır. Düzenli güvenlik güncellemeleri yapılır.
        </p>

        <h2>5. Üçüncü Taraf Paylaşımı</h2>
        <p>
          Kişisel verilerinizi üçüncü taraflarla paylaşmayız. Ancak şu durumlar istisnadır:
        </p>
        <ul>
          <li>Yasal zorunluluk durumunda (mahkeme kararı vb.)</li>
          <li>AI hizmetleri için Anthropic API&apos;ye gönderilen anonim veriler</li>
          <li>Ödeme işlemleri için ödeme sağlayıcısına aktarılan gerekli bilgiler</li>
        </ul>

        <h2>6. Çerezler</h2>
        <p>
          Oturum yönetimi için gerekli çerezler kullanılır. Analitik veya reklam amaçlı
          üçüncü taraf çerezleri kullanılmaz.
        </p>

        <h2>7. Kullanıcı Hakları</h2>
        <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse bilgi talep etme</li>
          <li>Verilerin düzeltilmesini isteme</li>
          <li>Verilerin silinmesini talep etme</li>
          <li>Verilerin aktarılmasını isteme</li>
        </ul>

        <h2>8. Veri Saklama</h2>
        <p>
          Verileriniz hesabınız aktif olduğu sürece saklanır. Hesap silinmesi durumunda
          verileriniz 30 gün içinde kalıcı olarak silinir.
        </p>

        <h2>9. İletişim</h2>
        <p>
          Gizlilik politikamız hakkında sorularınız için:<br />
          E-posta: <a href="mailto:info@poby.ai">info@poby.ai</a><br />
          Web: <a href="https://poby.ai">https://poby.ai</a>
        </p>

        <h2>10. Değişiklikler</h2>
        <p>
          Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler
          e-posta veya uygulama içi bildirim ile duyurulur.
        </p>
      </div>
    </div>
  );
}
