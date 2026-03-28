import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Tüm onam formlarını listele
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const forms = await prisma.consentForm.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { responses: true } },
      },
    });

    return Response.json({ forms });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// POST — Yeni onam formu oluştur
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const body = await req.json();
    const { title, description, content, fields } = body;

    if (!title?.trim() || !content?.trim()) {
      return Response.json({ error: "Başlık ve içerik gerekli" }, { status: 400 });
    }

    const form = await prisma.consentForm.create({
      data: {
        clinicId,
        title: title.trim(),
        description: description?.trim() || null,
        content: content.trim(),
        fields: fields || null,
      },
    });

    return Response.json({ form });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
