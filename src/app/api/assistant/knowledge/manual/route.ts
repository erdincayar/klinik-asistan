import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { saveKnowledgeBase } from "@/lib/assistant/embeddings";

const schema = z.object({
  content: z.string().min(10).max(50000),
  title: z.string().min(1).max(200).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  try {
    const chunksAdded = await saveKnowledgeBase(
      clinicId,
      "manual",
      parsed.data.title || "Manuel giriş",
      parsed.data.content
    );

    return NextResponse.json({ success: true, chunksAdded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kaydetme başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
