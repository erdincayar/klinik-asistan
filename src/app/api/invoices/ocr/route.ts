import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
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

    // Determine media type
    const ext = file.name.toLowerCase().split(".").pop();
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" = "image/jpeg";
    if (ext === "png") mediaType = "image/png";
    else if (ext === "pdf") mediaType = "application/pdf";
    else if (ext === "webp") mediaType = "image/webp";

    // Create record as PROCESSING
    const invoice = await prisma.uploadedInvoice.create({
      data: {
        clinicId,
        fileName: file.name,
        fileUrl,
        fileType: file.type || mediaType,
        status: "PROCESSING",
      },
    });

    // Send to Claude Vision
    let ocrData = null;
    try {
      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType === "application/pdf" ? "image/jpeg" : mediaType, data: base64 },
              },
              {
                type: "text",
                text: `Bu bir faturadır. Lütfen şu bilgileri JSON formatında çıkar:
{
  "vendor": "Satıcı/firma adı",
  "invoiceDate": "YYYY-MM-DD formatında fatura tarihi",
  "amount": toplam tutar (sayı, TL cinsinden, virgüllü ise noktaya çevir),
  "taxAmount": KDV tutarı (sayı),
  "category": "MALZEME|KIRA|FATURA|MAAS|DIGER" (en uygun kategori),
  "items": [{"description": "kalem açıklaması", "quantity": adet, "unitPrice": birim fiyat, "total": toplam}]
}
Sadece JSON döndür, başka açıklama yapma.`,
              },
            ],
          },
        ],
      });

      const aiText = response.content[0].type === "text" ? response.content[0].text : "";

      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          ocrData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // JSON parse failed
      }
    } catch (aiError) {
      console.error("Claude Vision API error:", aiError);
      // Mark as failed if AI call fails
      await prisma.uploadedInvoice.update({
        where: { id: invoice.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        { ...invoice, status: "FAILED", error: "AI fatura okuma başarısız oldu. Lütfen tekrar deneyin." },
        { status: 200 }
      );
    }

    if (ocrData) {
      await prisma.uploadedInvoice.update({
        where: { id: invoice.id },
        data: {
          ocrData,
          status: "COMPLETED",
          vendor: ocrData.vendor || null,
          amount: ocrData.amount ? parseFloat(ocrData.amount) : null,
          invoiceDate: ocrData.invoiceDate ? new Date(ocrData.invoiceDate) : null,
          category: ocrData.category || "DIGER",
        },
      });

      if (ocrData.amount) {
        const amountKurus = Math.round(parseFloat(ocrData.amount) * 100);
        await prisma.expense.create({
          data: {
            clinicId,
            description: `Fatura - ${ocrData.vendor || file.name}`,
            amount: amountKurus,
            category: ocrData.category || "DIGER",
            date: ocrData.invoiceDate ? new Date(ocrData.invoiceDate) : new Date(),
          },
        });
      }

      return NextResponse.json({ ...invoice, ocrData, status: "COMPLETED" });
    } else {
      await prisma.uploadedInvoice.update({
        where: { id: invoice.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ ...invoice, status: "FAILED", error: "OCR verisi okunamadı" });
    }
  } catch (error) {
    console.error("Invoice OCR error:", error);
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
