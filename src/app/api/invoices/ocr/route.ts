import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { TOKEN_COSTS } from "@/lib/token-costs";
import { checkBalance, deductTokens } from "@/lib/token-service";

const OCR_PROMPT = `Bu bir faturadır. Lütfen şu bilgileri JSON formatında çıkar:
{
  "vendor": "Satıcı/firma adı",
  "invoiceDate": "YYYY-MM-DD formatında fatura tarihi",
  "amount": toplam tutar (sayı, TL cinsinden, virgüllü ise noktaya çevir),
  "taxAmount": KDV tutarı (sayı),
  "category": "MALZEME|KIRA|FATURA|MAAS|DIGER" (en uygun kategori),
  "items": [{"description": "kalem açıklaması", "quantity": adet, "unitPrice": birim fiyat, "total": toplam}]
}
Sadece JSON döndür, başka açıklama yapma.`;

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getMediaType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "image/jpeg";
}

export async function POST(req: NextRequest) {
  let invoiceId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const isDemo = user.isDemo || user.role === "ADMIN";
    if (!isDemo) {
      const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.INVOICE_OCR);
      if (!hasBalance) {
        return NextResponse.json(
          { error: "Token bakiyeniz yetersiz. Ayarlar sayfasından token satın alabilirsiniz." },
          { status: 402 }
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }
    const invoiceType = (formData.get("invoiceType") as string) === "INCOME" ? "INCOME" : "EXPENSE";

    // Validate file type
    const mediaType = getMediaType(file.name);
    if (mediaType !== "application/pdf" && !SUPPORTED_IMAGE_TYPES.includes(mediaType)) {
      return NextResponse.json(
        { error: "Desteklenmeyen format. PDF, JPG veya PNG yükleyin." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Save file to disk
    const uploadDir = path.join(process.cwd(), "uploads", "invoices", clinicId);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    const fileUrl = `/uploads/invoices/${clinicId}/${fileName}`;

    // Create record as PROCESSING
    const invoice = await prisma.uploadedInvoice.create({
      data: {
        clinicId,
        fileName: file.name,
        fileUrl,
        fileType: file.type || mediaType,
        status: "PROCESSING",
        invoiceType,
      },
    });
    invoiceId = invoice.id;

    // Build content block — PDF uses "document", images use "image"
    const isPdf = mediaType === "application/pdf";
    const fileContent: Anthropic.Messages.ContentBlockParam = isPdf
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
            data: base64,
          },
        };

    // Send to Claude Vision with timeout
    let ocrData: Record<string, unknown> | null = null;
    try {
      const anthropic = new Anthropic();
      const response = await Promise.race([
        anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [fileContent, { type: "text", text: OCR_PROMPT }],
            },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("API timeout")), 90000)
        ),
      ]);

      const aiText =
        response.content[0].type === "text" ? response.content[0].text : "";

      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        ocrData = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error("Claude Vision API error:", aiError);
      await prisma.uploadedInvoice.update({
        where: { id: invoice.id },
        data: { status: "FAILED" },
      });
      const msg =
        aiError instanceof Error && aiError.message === "API timeout"
          ? "Fatura okunamadı — zaman aşımı. Tekrar deneyin."
          : "AI fatura okuma başarısız oldu. Lütfen tekrar deneyin.";
      return NextResponse.json(
        { ...invoice, status: "FAILED", error: msg },
        { status: 200 }
      );
    }

    if (ocrData) {
      const parsedAmount = ocrData.amount
        ? parseFloat(String(ocrData.amount))
        : null;

      await prisma.uploadedInvoice.update({
        where: { id: invoice.id },
        data: {
          ocrData: ocrData as any,
          status: "COMPLETED",
          vendor: (ocrData.vendor as string) || null,
          amount: parsedAmount,
          invoiceDate: ocrData.invoiceDate
            ? new Date(ocrData.invoiceDate as string)
            : null,
          category: (ocrData.category as string) || "DIGER",
        },
      });

      if (!isDemo) {
        await deductTokens(clinicId, "INVOICE_OCR", TOKEN_COSTS.INVOICE_OCR);
      }

      return NextResponse.json({ ...invoice, ocrData, status: "COMPLETED", invoiceType });
    } else {
      await prisma.uploadedInvoice.update({
        where: { id: invoice.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({
        ...invoice,
        status: "FAILED",
        error: "OCR verisi okunamadı",
      });
    }
  } catch (error) {
    console.error("Invoice OCR error:", error);
    // Mark as failed if record was created
    if (invoiceId) {
      await prisma.uploadedInvoice
        .update({ where: { id: invoiceId }, data: { status: "FAILED" } })
        .catch(() => {});
    }
    return NextResponse.json({ error: "Fatura işlenemedi" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const invoices = await prisma.uploadedInvoice.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json({ error: "Faturalar alınamadı" }, { status: 500 });
  }
}
