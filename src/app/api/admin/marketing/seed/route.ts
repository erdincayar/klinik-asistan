import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SEED_CONTENT = [
  {
    type: "tweet",
    platform: "twitter",
    content: "İşletmenizi hâlâ Excel'le mi yönetiyorsunuz? 📊\n\nPoby.ai ile randevu, finans, stok ve müşteri yönetimi tek panelde.\n\n14 gün ücretsiz deneyin → poby.ai",
    scheduledAt: "2026-04-07T09:00:00",
    occasion: "Pazartesi motivasyon",
  },
  {
    type: "tweet",
    platform: "twitter",
    content: "Müşteriniz randevusunu unuttu mu? 😅\n\nOtomatik WhatsApp hatırlatma ile no-show oranınızı %40 düşürün.\n\n#işletmeyönetimi #randevusistemi",
    scheduledAt: "2026-04-08T10:00:00",
    occasion: "Salı ipucu",
  },
  {
    type: "tweet",
    platform: "twitter",
    content: "Faturalarınızı tek tek mi giriyorsunuz?\n\n📸 Fotoğrafını çekin, AI otomatik okusun.\nPoby.ai ile fatura yönetimi bu kadar kolay.",
    scheduledAt: "2026-04-09T11:00:00",
    occasion: "Çarşamba özellik",
  },
  {
    type: "tweet",
    platform: "twitter",
    content: "Küçük işletmelerin %60'ı finansal takip eksikliğinden kapanıyor.\n\nGelir, gider, KDV, cari hesap — hepsini tek yerden takip edin.\n\npoby.ai/register",
    scheduledAt: "2026-04-10T09:30:00",
    occasion: "Perşembe istatistik",
  },
  {
    type: "tweet",
    platform: "twitter",
    content: "Hafta sonu planınız hazır mı? 🗓️\n\nPoby.ai ile randevularınızı, stokunuzu ve cironuzu tek bakışta görün.\n\n#küçükişletme #dijitalleşme",
    scheduledAt: "2026-04-11T10:00:00",
    occasion: "Cuma motivasyon",
  },
  {
    type: "thread",
    platform: "twitter",
    content: "🧵 Küçük işletmenizi dijitalleştirmenin 5 adımı:",
    threadContent: JSON.stringify([
      "🧵 Küçük işletmenizi dijitalleştirmenin 5 adımı:",
      "1/ Müşteri kartlarınızı oluşturun\n→ İsim, telefon, geçmiş işlemler tek yerde\n→ CRM ile müşteri sadakatini artırın",
      "2/ Randevu sistemi kurun\n→ Otomatik hatırlatma ile iptal oranını düşürün\n→ Çalışan bazlı takvim ile organize olun",
      "3/ Gelir-gider takibine başlayın\n→ Aylık kar/zarar analizi yapın\n→ KDV hesaplamasını otomatikleştirin",
      "4/ Stok yönetimini dijitalleştirin\n→ Kritik stok uyarısı ile malzeme bitmesin\n→ Tedarik zincirini optimize edin",
      "5/ Raporlarla kararlarınızı destekleyin\n→ Hangi hizmet en çok kazandırıyor?\n→ Müşteri analizi ile büyüyün",
      "Tüm bunları tek platformda yapın → poby.ai 🚀\n\n14 gün ücretsiz, kredi kartı gerekmez.",
    ]),
    scheduledAt: "2026-04-12T12:00:00",
    occasion: "Hafta sonu eğitim thread",
  },
  {
    type: "tweet",
    platform: "twitter",
    content: "Distribütör müsünüz? 🚚\n\nPoby.ai ile:\n✅ Müşteri ziyaret takibi\n✅ Sipariş oluşturma\n✅ Cari hesap yönetimi\n✅ Satış raporları\n\nB2B satışlarınızı dijitalleştirin.",
    scheduledAt: "2026-04-13T09:00:00",
    occasion: "Sektör odaklı",
  },
  {
    type: "tweet",
    platform: "twitter",
    content: "\"3 ay önce başladık, şimdi işletmemiz 10 kat daha düzenli.\"\n\n— Onur K., Poby.ai kullanıcısı\n\nSiz de deneyin → poby.ai/register",
    scheduledAt: "2026-04-14T10:00:00",
    occasion: "Testimonial",
  },
];

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    let created = 0;
    for (const item of SEED_CONTENT) {
      await prisma.scheduledPost.create({
        data: {
          clinicId,
          type: item.type,
          platform: item.platform,
          content: item.content,
          threadContent: (item as any).threadContent || null,
          scheduledAt: new Date(item.scheduledAt),
          status: "DRAFT",
          occasion: item.occasion || null,
        },
      });
      created++;
    }

    return NextResponse.json({ success: true, created });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Import hatası" }, { status: 500 });
  }
}
