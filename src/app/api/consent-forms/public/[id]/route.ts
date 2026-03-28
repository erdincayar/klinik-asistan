import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — Public: Onam formunu oku (giriş yapmadan)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await prisma.consentForm.findFirst({
      where: { id: params.id, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        fields: true,
        clinic: { select: { name: true } },
      },
    });

    if (!form) return Response.json({ error: "Form bulunamadı veya aktif değil" }, { status: 404 });
    return Response.json({ form });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// POST — Public: Onam formunu doldur ve imzala
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await prisma.consentForm.findFirst({
      where: { id: params.id, isActive: true },
    });

    if (!form) return Response.json({ error: "Form bulunamadı veya aktif değil" }, { status: 404 });

    const body = await req.json();
    const { patientName, patientTc, signature, fieldValues, patientId } = body;

    if (!patientName?.trim()) {
      return Response.json({ error: "Ad Soyad gerekli" }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;

    const response = await prisma.consentFormResponse.create({
      data: {
        consentFormId: form.id,
        clinicId: form.clinicId,
        patientId: patientId || null,
        patientName: patientName.trim(),
        patientTc: patientTc?.trim() || null,
        signature: signature || null,
        fieldValues: fieldValues || null,
        ipAddress,
      },
    });

    return Response.json({ success: true, responseId: response.id });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
