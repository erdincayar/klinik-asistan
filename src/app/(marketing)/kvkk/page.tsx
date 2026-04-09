export const metadata = {
  title: "KVKK Aydınlatma Metni | Poby.ai",
  description: "Poby.ai KVKK aydınlatma metni — 6698 sayılı kanun kapsamında kişisel veri işleme bilgilendirmesi.",
};

export default function KvkkPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-sm prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">KVKK Aydınlatma Metni</h1>
        <p className="text-sm text-gray-500 mb-4">
          6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında Aydınlatma Metni
        </p>
        <p className="text-sm text-gray-500 mb-8">Son güncelleme: 9 Nisan 2026</p>

        <h2>1. Veri Sorumlusu</h2>
        <p>
          Poby.ai platformu olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu
          (&ldquo;KVKK&rdquo;) uyarınca, veri sorumlusu sıfatıyla kişisel verilerinizi
          aşağıda açıklanan amaçlar ve hukuki sebepler doğrultusunda işlemekteyiz.
        </p>

        <h2>2. Kişisel Verilerin Toplanma Yöntemi</h2>
        <p>Kişisel verileriniz aşağıdaki yöntemlerle toplanmaktadır:</p>
        <ul>
          <li>Platform&apos;a kayıt formu aracılığıyla</li>
          <li>Google OAuth ile giriş yapmanız aracılığıyla</li>
          <li>Platform&apos;u kullanımınız sırasında otomatik olarak (çerez, log, IP)</li>
          <li>E-posta ve iletişim formları aracılığıyla</li>
          <li>Ödeme işlemleri sırasında (PayTR altyapısı üzerinden)</li>
        </ul>

        <h2>3. İşlenen Kişisel Veriler</h2>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left">Veri Kategorisi</th>
              <th className="text-left">Veriler</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Kimlik Bilgileri</td>
              <td>Ad, soyad</td>
            </tr>
            <tr>
              <td>İletişim Bilgileri</td>
              <td>E-posta, telefon numarası</td>
            </tr>
            <tr>
              <td>Hesap Bilgileri</td>
              <td>Şifre (hashlenmiş), profil fotoğrafı</td>
            </tr>
            <tr>
              <td>İşletme Bilgileri</td>
              <td>İşletme adı, adresi, sektör, vergi bilgileri</td>
            </tr>
            <tr>
              <td>Finansal Bilgiler</td>
              <td>Ödeme geçmişi, kart son 4 hane, fatura bilgileri</td>
            </tr>
            <tr>
              <td>İşlem Güvenliği</td>
              <td>IP adresi, oturum bilgileri, giriş tarihleri</td>
            </tr>
            <tr>
              <td>Kullanım Verileri</td>
              <td>Sayfa görüntüleme, özellik kullanım istatistikleri</td>
            </tr>
          </tbody>
        </table>

        <h2>4. Kişisel Verilerin İşlenme Amaçları</h2>
        <ul>
          <li>Platform hizmetlerinin sunulması ve sözleşme yükümlülüklerinin yerine getirilmesi</li>
          <li>Kullanıcı hesaplarının oluşturulması, doğrulanması ve yönetimi</li>
          <li>Ödeme ve fatura işlemlerinin gerçekleştirilmesi</li>
          <li>Müşteri hizmetleri ve teknik desteğin sağlanması</li>
          <li>Platform güvenliğinin sağlanması ve kötüye kullanımın önlenmesi</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi (vergi mevzuatı, 5651 sayılı Kanun)</li>
          <li>Hizmet kalitesinin ölçülmesi ve iyileştirilmesi</li>
          <li>Açık rızanız dahilinde pazarlama iletişimi gönderilmesi</li>
        </ul>

        <h2>5. Kişisel Verilerin İşlenmesinin Hukuki Sebepleri</h2>
        <p>KVKK m.5/2 kapsamında:</p>
        <ul>
          <li><strong>Sözleşmenin kurulması veya ifası:</strong> Hizmet sunumu için gerekli veri işleme</li>
          <li><strong>Hukuki yükümlülük:</strong> Vergi Usul Kanunu, 5651 sayılı Kanun, 6563 sayılı E-Ticaret Kanunu</li>
          <li><strong>Meşru menfaat:</strong> Platform güvenliği, hizmet geliştirme, istatistiksel analiz</li>
          <li><strong>Açık rıza (m.5/1):</strong> Pazarlama iletişimi, AI özellikleri için veri aktarımı</li>
        </ul>

        <h2>6. Kişisel Verilerin Aktarılması</h2>
        <p>
          Kişisel verileriniz, KVKK m.8 ve m.9 hükümleri çerçevesinde aşağıdaki
          alıcı gruplarına aktarılabilmektedir:
        </p>
        <ul>
          <li><strong>Ödeme kuruluşları:</strong> PayTR (ödeme işlemleri için, Türkiye)</li>
          <li><strong>Bulut hizmet sağlayıcıları:</strong> Contabo (veri barındırma, Almanya)</li>
          <li><strong>AI hizmet sağlayıcıları:</strong> Anthropic (AI özellikler için, ABD — açık rızanız ile)</li>
          <li><strong>Analitik hizmetleri:</strong> Google Analytics (anonim istatistik, ABD/AB)</li>
          <li><strong>Mesajlaşma platformları:</strong> WhatsApp, Telegram (entegrasyon dahilinde)</li>
          <li><strong>Yetkili kamu kurum ve kuruluşları:</strong> Yasal zorunluluk halinde</li>
        </ul>

        <h2>7. Veri Sahibinin Hakları (KVKK m.11)</h2>
        <p>KVKK&apos;nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
        <ol>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
          <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
          <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
          <li>KVKK m.7&apos;deki şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
          <li>(5) ve (6) bentleri uyarınca yapılan işlemlerin, verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
          <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
          <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
        </ol>

        <h2>8. Başvuru Yöntemi</h2>
        <p>
          Yukarıda belirtilen haklarınızı kullanmak için aşağıdaki yöntemlerden biriyle
          başvuruda bulunabilirsiniz:
        </p>
        <ul>
          <li>
            <strong>E-posta:</strong> Kayıtlı e-posta adresinizden{" "}
            <a href="mailto:kvkk@poby.ai">kvkk@poby.ai</a> adresine
          </li>
          <li>
            <strong>Platform içi:</strong> Ayarlar &gt; Hesap &gt; Veri Talebi bölümünden
          </li>
        </ul>
        <p>
          Başvurunuz en geç <strong>30 gün</strong> içinde ücretsiz olarak sonuçlandırılır.
          İşlemin ayrıca bir maliyet gerektirmesi hâlinde, Kişisel Verileri Koruma Kurulu
          tarafından belirlenen tarife üzerinden ücret talep edilebilir.
        </p>

        <h2>9. Veri Saklama Süreleri</h2>
        <ul>
          <li>Hesap verileri: Hesap aktif olduğu sürece + silme sonrası 30 gün</li>
          <li>Finansal kayıtlar: 10 yıl (213 sayılı Vergi Usul Kanunu)</li>
          <li>Trafik logları: 2 yıl (5651 sayılı Kanun)</li>
          <li>Ödeme kayıtları: 10 yıl</li>
          <li>Pazarlama izinleri: İzin geri çekilene kadar</li>
        </ul>

        <h2>10. Veri Güvenliği Tedbirleri</h2>
        <p>KVKK m.12 uyarınca aşağıdaki teknik ve idari tedbirler alınmaktadır:</p>
        <ul>
          <li>SSL/TLS şifreleme</li>
          <li>Şifrelerin bcrypt ile hashlanması</li>
          <li>Erişim kontrolü ve yetkilendirme</li>
          <li>Rate limiting ve brute force koruması</li>
          <li>Düzenli yedekleme</li>
          <li>Güvenlik güncellemeleri</li>
          <li>Veri minimizasyonu ilkesi</li>
        </ul>
      </div>
    </div>
  );
}
