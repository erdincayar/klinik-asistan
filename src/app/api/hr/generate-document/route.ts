import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkBalance, deductTokens } from "@/lib/token-service";
import { TOKEN_COSTS } from "@/lib/token-costs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic();

const documentTypes = [
  "is_sozlesmesi",
  "ise_baslama_bildirimi",
  "ozluk_formu",
  "gizlilik_sozlesmesi",
  "istifa_dilekçesi",
  "fesih_bildirimi",
  "kidem_ihbar_formu",
  "ibraname",
] as const;

const requestSchema = z.object({
  documentType: z.enum(documentTypes),
  employeeName: z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
  tcNo: z.string().length(11, "TC Kimlik No 11 haneli olmalı"),
  startDate: z.string().min(1, "Tarih gerekli"),
  position: z.string().min(1, "Pozisyon gerekli"),
  salary: z.string().min(1, "Maaş gerekli"),
});

const documentLabels: Record<string, string> = {
  is_sozlesmesi: "İş Sözleşmesi",
  ise_baslama_bildirimi: "İşe Başlama Bildirimi",
  ozluk_formu: "Özlük Dosyası Formu",
  gizlilik_sozlesmesi: "Gizlilik Sözleşmesi",
  istifa_dilekçesi: "İstifa Dilekçesi",
  fesih_bildirimi: "Fesih Bildirimi",
  kidem_ihbar_formu: "Kıdem/İhbar Tazminatı Hesap Formu",
  ibraname: "İbraname",
};

function getPrompt(
  documentType: string,
  employeeName: string,
  tcNo: string,
  startDate: string,
  position: string,
  salary: string,
  clinicName: string
): string {
  const base = `Sen bir Türk İş Hukuku uzmanısın. 4857 sayılı İş Kanunu'na ve ilgili mevzuata tam uygun belgeler hazırlıyorsun.

İşveren Bilgileri:
- İşyeri Adı: ${clinicName}

Çalışan Bilgileri:
- Ad Soyad: ${employeeName}
- TC Kimlik No: ${tcNo}
- İşe Başlama Tarihi: ${startDate}
- Pozisyon/Unvan: ${position}
- Aylık Brüt Maaş: ${salary} TL

Bugünün tarihi: ${new Date().toLocaleDateString("tr-TR")}

`;

  const prompts: Record<string, string> = {
    is_sozlesmesi: `${base}4857 sayılı İş Kanunu'na uygun bir BELİRSİZ SÜRELİ İŞ SÖZLEŞMESİ hazırla.

Sözleşme şu maddeleri içermeli:
1. Taraflar (işveren ve işçi bilgileri)
2. İşin tanımı ve niteliği
3. İşyeri adresi
4. Çalışma süresi (haftalık 45 saat)
5. Ücret ve ödeme şekli (aylık, banka yoluyla)
6. Deneme süresi (2 ay - md.15)
7. Yıllık izin hakları (md.53-54-55)
8. Fazla çalışma koşulları (md.41)
9. Fesih ve ihbar süreleri (md.17)
10. Sözleşmenin sona ermesi halleri
11. Gizlilik ve rekabet yasağı
12. Genel hükümler
13. İmza alanları (2 nüsha)

Resmi ve profesyonel bir dil kullan. Madde numaraları ve başlıkları net olsun.`,

    ise_baslama_bildirimi: `${base}4857 sayılı İş Kanunu md.3'e uygun bir İŞE BAŞLAMA BİLDİRİMİ hazırla.

Bildirim şunları içermeli:
1. İşverenin bilgileri
2. Çalışanın kimlik bilgileri
3. İşe başlama tarihi
4. Görevi/pozisyonu
5. Çalışma şekli (tam zamanlı)
6. Ücret bilgisi
7. SGK bildirimi yapıldığına dair ibare
8. İşveren imza ve kaşe alanı
9. Tarih

Resmi yazışma formatında hazırla.`,

    ozluk_formu: `${base}4857 sayılı İş Kanunu md.75'e uygun bir ÖZLÜK DOSYASI FORMU hazırla.

Form şu bölümleri içermeli:
1. KİŞİSEL BİLGİLER: Ad soyad, TC, doğum tarihi/yeri, medeni hal, askerlik durumu, eğitim durumu, adres, telefon, e-posta
2. AİLE BİLGİLERİ: Eş bilgileri, çocuk bilgileri, acil durumda aranacak kişi
3. İŞ BİLGİLERİ: Pozisyon, departman, işe giriş tarihi, maaş, SGK no, vergi dairesi
4. EĞİTİM BİLGİLERİ: Okul, bölüm, mezuniyet yılı
5. İŞ DENEYİMİ: Önceki işyerleri, pozisyon, süre, ayrılma nedeni
6. SAĞLIK BİLGİLERİ: Kan grubu, kronik hastalık, alerji
7. REFERANSLAR: Ad, işyeri, telefon
8. TESLİM EDİLEN BELGELER: Nüfus cüzdanı fotokopisi, diploma, SGK belgesi, ikametgah, adli sicil, sağlık raporu, fotoğraf
9. İmza ve tarih alanları

Tablo formatında, doldurulabilir alanlarla hazırla. Bilinen alanları önceden doldur.`,

    gizlilik_sozlesmesi: `${base}Türk Borçlar Kanunu md.396 ve 4857 sayılı İş Kanunu'na uygun bir GİZLİLİK SÖZLEŞMESİ hazırla.

Sözleşme şunları içermeli:
1. Taraflar
2. Gizli bilginin tanımı (ticari sırlar, müşteri bilgileri, finansal veriler, teknik bilgiler, iş süreçleri)
3. Gizlilik yükümlülükleri
4. Bilgi kullanım sınırları
5. Süre (iş ilişkisi + 2 yıl)
6. İstisnaları (kamuya açık bilgiler, yasal zorunluluklar)
7. İade yükümlülüğü (iş bitiminde tüm belge ve verilerin iadesi)
8. Cezai şart (ihlal durumunda tazminat)
9. Uyuşmazlık çözümü
10. Yürürlük
11. İmza alanları

Profesyonel hukuki dil kullan.`,

    istifa_dilekçesi: `${base}4857 sayılı İş Kanunu md.17'ye uygun bir İSTİFA DİLEKÇESİ hazırla.

Dilekçe şunları içermeli:
1. Üst yazı (işveren bilgileri)
2. Çalışanın bilgileri
3. İstifa beyanı
4. İhbar süresine uyulacağına dair ibare
5. Son çalışma günü
6. Devir-teslim yapılacağına dair ibare
7. Kıdem tazminatı ve diğer hakların saklı tutulduğu ibaresi
8. İmza ve tarih

Resmi dilekçe formatında, profesyonel tonda hazırla.`,

    fesih_bildirimi: `${base}4857 sayılı İş Kanunu md.17, 18, 19 ve 25'e uygun bir İŞVEREN FESİH BİLDİRİMİ hazırla.

Bildirim şunları içermeli:
1. Çalışana hitaben yazı
2. Fesih gerekçesi
3. İhbar süresinin belirtilmesi (md.17'ye göre kıdeme göre hesaplanmış)
4. Son çalışma günü
5. Kıdem tazminatı hakkı bilgisi
6. İhbar tazminatı bilgisi
7. Kullanılmamış yıllık izin ücreti
8. SGK çıkış bildirimi yapılacağı
9. Devir-teslim süreci
10. İşyeri kimlik kartı/malzeme iadesi
11. İmza alanları (işveren + tebliğ alan çalışan)
12. Tebliğ tarihi

Resmi bildirim formatında hazırla.`,

    kidem_ihbar_formu: `${base}4857 sayılı İş Kanunu md.17 ve 1475 sayılı İş Kanunu md.14'e uygun bir KIDEM ve İHBAR TAZMİNATI HESAP FORMU hazırla.

Form şunları içermeli:
1. ÇALIŞAN BİLGİLERİ: Ad soyad, TC, işe giriş/çıkış tarihi, toplam kıdem süresi
2. KIDEM TAZMİNATI HESABI:
   - Gün bazında kıdem süresi
   - Son brüt maaş
   - Kıdem tazminatı tavanı kontrolü
   - Toplam kıdem tazminatı (brüt ve net)
   - Damga vergisi kesintisi
3. İHBAR TAZMİNATI HESABI:
   - Kıdeme göre ihbar süresi (md.17: 2 hafta/4 hafta/6 hafta/8 hafta)
   - İhbar tazminatı tutarı
4. KULLANILMAMIŞ YILLIK İZİN ÜCRETİ
5. DİĞER ALACAKLAR
6. TOPLAM ÖDEME
7. İmza alanları

Bilinen bilgileri doldurarak, hesaplama mantığını göstererek hazırla.`,

    ibraname: `${base}Türk Borçlar Kanunu md.420 ve 4857 sayılı İş Kanunu'na uygun bir İBRANAME hazırla.

İbraname şunları içermeli:
1. Taraflar (işveren ve işçi bilgileri)
2. Çalışma dönemi (giriş-çıkış tarihleri)
3. Ödenen tutarların dökümü:
   - Ücret alacakları
   - Kıdem tazminatı
   - İhbar tazminatı
   - Yıllık izin ücreti
   - Fazla mesai ücreti
   - Diğer alacaklar
4. İbra beyanı (tüm hak ve alacakların ödendiği)
5. TBK md.420 uyarınca zorunlu ibareler:
   - İbranamenin iş sözleşmesinin sona ermesinden en az 1 ay sonra imzalanması gerektiği
   - Ödemenin banka yoluyla yapılması gerektiği
6. İmza alanları ve tarih

Hukuki geçerliliği olan, eksiksiz bir ibraname hazırla.`,
  };

  return prompts[documentType] || base;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    const isDemo = (session.user as any).isDemo;

    if (!clinicId) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    // Token kontrolü
    if (!isDemo) {
      const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.HR_DOCUMENT);
      if (!hasBalance) {
        return Response.json(
          { error: "Token bakiyeniz yetersiz. Belge oluşturmak için en az 3.000 token gereklidir." },
          { status: 402 }
        );
      }
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Geçersiz veri", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { documentType, employeeName, tcNo, startDate, position, salary } = parsed.data;

    // İşyeri adını al
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const clinicName = clinic?.name || "İşyeri";

    const prompt = getPrompt(documentType, employeeName, tcNo, startDate, position, salary, clinicName);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Token düş
    if (!isDemo) {
      await deductTokens(
        clinicId,
        "HR_DOCUMENT",
        TOKEN_COSTS.HR_DOCUMENT,
        `İK Belgesi: ${documentLabels[documentType]}`
      );
    }

    return Response.json({
      success: true,
      content,
      documentType,
      documentLabel: documentLabels[documentType],
    });
  } catch (error: any) {
    console.error("HR document generation error:", error);
    return Response.json(
      { error: "Belge oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
