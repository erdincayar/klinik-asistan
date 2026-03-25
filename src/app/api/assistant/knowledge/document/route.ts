import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseDocument } from "@/lib/assistant/document-parser";
import { saveKnowledgeBase } from "@/lib/assistant/embeddings";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/plain",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Desteklenmeyen dosya formatı. PDF, DOCX, XLSX veya TXT yükleyin." }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await parseDocument(buffer, file.type);
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "Dosyadan yeterli metin çıkarılamadı" }, { status: 400 });
    }

    const chunksAdded = await saveKnowledgeBase(
      clinicId,
      "document",
      file.name,
      text
    );

    return NextResponse.json({ success: true, filename: file.name, chunksAdded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Belge işleme başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
