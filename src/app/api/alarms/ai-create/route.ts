import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Sen bir işletme yönetim asistanısın. Kullanıcı doğal dilde alarm/otomasyon kurmak istiyor.
Kullanıcının isteğini analiz et ve aşağıdaki JSON formatında alarm(lar) oluştur.

Oluşturabileceğin alarm tipleri:
1. SCHEDULED — Zamanlanmış: "Her sabah 9'da", "Her pazartesi", "Ayın 1'i" gibi
2. AUTO_MESSAGE — Otomatik mesaj: "Randevu sonrası", "Tedavi sonrası", "Doğum günlerinde" gibi
3. CUSTOM — Özel koşul: "Stok 10'un altına düşünce", "3 aydır gelmeyen müşteriler" gibi
4. CUSTOMER_VISIT — Müşteri takip: "X gündür gelmeyen müşterileri hatırlat"
5. CUSTOMER_BIRTHDAY — Doğum günü hatırlatma

Her alarm için şu JSON döndür:
{
  "alarms": [
    {
      "name": "Alarm adı (kısa, açıklayıcı)",
      "type": "SCHEDULED|AUTO_MESSAGE|CUSTOM|CUSTOMER_VISIT|CUSTOMER_BIRTHDAY",
      "schedule": "daily:09:00 | weekly:1:09:00 | monthly:1:09:00 | after_appointment | after_treatment | null",
      "messageTemplate": "Gönderilecek mesaj metni. Placeholder'lar: {musteri_adi}, {isletme_adi}, {tarih}, {saat}, {hizmet}, {randevu_tarihi}",
      "triggerAction": "LOG | NOTIFY | SEND_MESSAGE",
      "targetChannel": "TELEGRAM | WHATSAPP | SYSTEM | null",
      "conditions": {},
      "explanation": "Bu alarm ne yapacak kısa açıklama"
    }
  ],
  "summary": "Kullanıcıya gösterilecek özet açıklama"
}

Kurallar:
- Kullanıcının isteğini en iyi şekilde karşıla
- Birden fazla alarm gerekiyorsa birden fazla oluştur
- Mesaj şablonları samimi, profesyonel ve Türkçe olsun
- Google puan isteme gibi isteklerde link placeholder {google_puan_linki} kullan
- Randevu/tedavi sonrası mesajlarda {musteri_adi} ve {hizmet} placeholder kullan
- Günlük hatırlatmalarda schedule "daily:HH:MM" formatında olsun
- SADECE JSON döndür, başka bir şey yazma`;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const { message, action } = await req.json();

    if (!message?.trim()) {
      return Response.json({ error: "Mesaj gerekli" }, { status: 400 });
    }

    // Klinik bilgilerini al (context için)
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, sector: true },
    });

    const userMessage = `İşletme: ${clinic?.name || "İşletme"} (Sektör: ${clinic?.sector || "Genel"})
Kullanıcının isteği: ${message}`;

    // AI ile alarm parse et
    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const aiText = aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";

    // JSON parse
    let parsed;
    try {
      // JSON bloğunu çıkar (```json ... ``` veya direkt)
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON bulunamadı");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ error: "AI yanıtı işlenemedi", raw: aiText }, { status: 500 });
    }

    // action === "preview" ise sadece önizleme döndür
    if (action === "preview") {
      return Response.json({ preview: parsed });
    }

    // action === "create" ise alarm(ları) oluştur
    const created = [];
    for (const alarm of parsed.alarms || []) {
      const newAlarm = await prisma.alarm.create({
        data: {
          clinicId,
          name: alarm.name,
          type: alarm.type || "CUSTOM",
          conditions: alarm.conditions || {},
          schedule: alarm.schedule || null,
          messageTemplate: alarm.messageTemplate || null,
          triggerAction: alarm.triggerAction || "LOG",
          targetChannel: alarm.targetChannel || null,
          aiGenerated: true,
          isActive: true,
        },
      });

      // STOCK tipli alarm ise envanter kısmındaki StockAlarm tablosuna da yaz
      if (alarm.type === "STOCK") {
        const conditions = alarm.conditions || {};
        await prisma.stockAlarm.create({
          data: {
            clinicId,
            name: alarm.name,
            type: "STOCK",
            threshold: conditions.thresholdQuantity || conditions.threshold || 5,
            productId: conditions.productId || null,
            isActive: true,
          },
        }).catch(() => {}); // Hata olursa sessiz geç, ana alarm zaten oluştu
      }

      created.push({ ...newAlarm, explanation: alarm.explanation });
    }

    return Response.json({
      success: true,
      alarms: created,
      summary: parsed.summary,
    });
  } catch (error) {
    console.error("AI alarm create error:", error);
    return Response.json({ error: "Alarm oluşturulamadı" }, { status: 500 });
  }
}
