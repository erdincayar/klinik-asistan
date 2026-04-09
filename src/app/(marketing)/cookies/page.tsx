export const metadata = {
  title: "Çerez Politikası | Poby.ai",
  description: "Poby.ai çerez politikası — kullanılan çerezler ve yönetim seçenekleri.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-sm prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Çerez Politikası</h1>
        <p className="text-sm text-gray-500 mb-8">Son güncelleme: 9 Nisan 2026</p>

        <h2>1. Çerez Nedir?</h2>
        <p>
          Çerezler (cookies), web sitelerinin tarayıcınıza yerleştirdiği küçük metin dosyalarıdır.
          Oturum yönetimi, tercih hatırlama ve kullanım istatistikleri gibi amaçlarla kullanılırlar.
        </p>

        <h2>2. Kullandığımız Çerezler</h2>

        <h3>2.1 Zorunlu Çerezler</h3>
        <p>Platform&apos;un çalışması için gerekli olan çerezlerdir. Devre dışı bırakılamaz.</p>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left">Çerez Adı</th>
              <th className="text-left">Amaç</th>
              <th className="text-left">Süre</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>next-auth.session-token</td>
              <td>Oturum yönetimi (giriş durumu)</td>
              <td>Oturum / 30 gün</td>
            </tr>
            <tr>
              <td>__Secure-next-auth.session-token</td>
              <td>Güvenli oturum yönetimi (HTTPS)</td>
              <td>Oturum / 30 gün</td>
            </tr>
            <tr>
              <td>next-auth.csrf-token</td>
              <td>CSRF koruması</td>
              <td>Oturum</td>
            </tr>
            <tr>
              <td>next-auth.callback-url</td>
              <td>Giriş sonrası yönlendirme</td>
              <td>Oturum</td>
            </tr>
          </tbody>
        </table>

        <h3>2.2 Tercih Çerezleri</h3>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left">Çerez Adı</th>
              <th className="text-left">Amaç</th>
              <th className="text-left">Süre</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>poby-field-visibility</td>
              <td>Müşteri tablosu alan tercihleri (localStorage)</td>
              <td>Kalıcı</td>
            </tr>
            <tr>
              <td>poby-sidebar-order</td>
              <td>Sidebar menü sıralaması (localStorage)</td>
              <td>Kalıcı</td>
            </tr>
          </tbody>
        </table>

        <h3>2.3 Analitik Çerezler</h3>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left">Çerez Adı</th>
              <th className="text-left">Amaç</th>
              <th className="text-left">Süre</th>
              <th className="text-left">Sağlayıcı</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>_ga</td>
              <td>Google Analytics - tekil kullanıcı tanımlama</td>
              <td>2 yıl</td>
              <td>Google</td>
            </tr>
            <tr>
              <td>_ga_GRLG7XVZ6R</td>
              <td>Google Analytics - oturum durumu</td>
              <td>2 yıl</td>
              <td>Google</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Çerezlerin Yönetimi</h2>
        <p>
          Tarayıcı ayarlarınızdan çerezleri yönetebilir, silebilir veya engelleyebilirsiniz.
          Ancak zorunlu çerezlerin engellenmesi Platform&apos;un düzgün çalışmamasına neden olabilir.
        </p>
        <ul>
          <li><strong>Chrome:</strong> Ayarlar &gt; Gizlilik ve güvenlik &gt; Çerezler</li>
          <li><strong>Firefox:</strong> Ayarlar &gt; Gizlilik ve Güvenlik &gt; Çerezler</li>
          <li><strong>Safari:</strong> Tercihler &gt; Gizlilik &gt; Çerezler</li>
          <li><strong>Edge:</strong> Ayarlar &gt; Çerezler ve site izinleri</li>
        </ul>

        <h2>4. Üçüncü Taraf Çerezleri</h2>
        <p>
          Platform&apos;da yalnızca Google Analytics analitik çerezleri üçüncü taraf
          çerez olarak kullanılmaktadır. Bu çerezler anonim kullanım istatistikleri toplar.
          Google&apos;ın gizlilik politikası için:{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            policies.google.com/privacy
          </a>
        </p>

        <h2>5. İletişim</h2>
        <p>
          Çerez politikamız hakkında sorularınız için:<br />
          E-posta: <a href="mailto:info@poby.ai">info@poby.ai</a>
        </p>
      </div>
    </div>
  );
}
