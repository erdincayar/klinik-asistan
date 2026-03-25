import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// TOKEN_SYSTEM_DISABLED - import { checkBalance, deductTokens } from "@/lib/token-service";
// TOKEN_SYSTEM_DISABLED - import { TOKEN_COSTS } from "@/lib/token-costs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic();

const requestSchema = z.object({
  documentId: z.string().min(1),
  employeeName: z.string().min(2, "Ad soyad gerekli"),
  tcNo: z.string().optional(),
  startDate: z.string().optional(),
  position: z.string().optional(),
  salary: z.string().optional(),
  employeeId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    const isDemo = (session.user as any).isDemo;

    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    // TOKEN_SYSTEM_DISABLED
    // // Token check
    // if (!isDemo) {
    //   const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.HR_DOCUMENT);
    //   if (!hasBalance) {
    //     return NextResponse.json(
    //       { error: "Token bakiyeniz yetersiz. Belge doldurmak için en az 3.000 token gereklidir." },
    //       { status: 402 }
    //     );
    //   }
    // }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { documentId, employeeName, tcNo, startDate, position, salary } = parsed.data;

    // Get document
    const doc = await prisma.hrDocument.findFirst({
      where: { id: documentId, clinicId },
    });

    if (!doc) {
      return NextResponse.json({ error: "Belge bulunamadı" }, { status: 404 });
    }

    // Get clinic name
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const clinicName = clinic?.name || "İşyeri";

    let templateContent = "";

    if (doc.source === "AI" && doc.content) {
      templateContent = doc.content;
    } else if (doc.source === "UPLOAD") {
      // For uploaded files, we describe what the document is
      templateContent = `Bu bir yüklenen belge şablonudur. Belge adı: "${doc.name}". Kategori: ${doc.category === "hire" ? "İşe Alış" : doc.category === "terminate" ? "İşten Çıkarma" : "Diğer"}.`;
    }

    const prompt = `Sen bir Türk İş Hukuku uzmanısın. Aşağıdaki belge şablonunu verilen çalışan bilgileriyle doldur.

İşveren Bilgileri:
- İşyeri Adı: ${clinicName}

Çalışan Bilgileri:
- Ad Soyad: ${employeeName}
${tcNo ? `- TC Kimlik No: ${tcNo}` : ""}
${startDate ? `- İşe Başlama Tarihi: ${startDate}` : ""}
${position ? `- Pozisyon/Unvan: ${position}` : ""}
${salary ? `- Aylık Brüt Maaş: ${salary} TL` : ""}

Bugünün tarihi: ${new Date().toLocaleDateString("tr-TR")}

${doc.source === "AI" ? `Belge Şablonu:
---
${templateContent}
---

Yukarıdaki şablonu çalışan bilgileriyle doldur. Şablonun formatını ve yapısını koru, sadece bilgileri yerleştir.` : `"${doc.name}" adında bir ${doc.category === "hire" ? "işe alış" : doc.category === "terminate" ? "işten çıkarma" : ""} belgesi hazırla. 4857 sayılı İş Kanunu'na uygun olsun. Çalışan bilgilerini belgeye ekle.`}

Markdown formatında dön.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      message.content[0].type === "text" ? message.content[0].text : "";

    // TOKEN_SYSTEM_DISABLED
    // // Deduct tokens
    // if (!isDemo) {
    //   await deductTokens(
    //     clinicId,
    //     "HR_DOCUMENT",
    //     TOKEN_COSTS.HR_DOCUMENT,
    //     `İK Belge Doldurma: ${doc.name}`
    //   );
    // }

    return NextResponse.json({
      success: true,
      content,
      documentName: doc.name,
    });
  } catch (error: any) {
    console.error("HR fill-document error:", error);
    return NextResponse.json(
      { error: "Belge doldurulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
