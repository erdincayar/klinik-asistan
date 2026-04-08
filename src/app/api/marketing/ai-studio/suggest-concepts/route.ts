import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { suggestConcepts } from "@/lib/ai-studio/content-agent";

const schema = z.object({
  content: z.string().min(3).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  try {
    const concepts = await suggestConcepts(parsed.data.content);
    return NextResponse.json({ concepts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Konsept önerisi başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
