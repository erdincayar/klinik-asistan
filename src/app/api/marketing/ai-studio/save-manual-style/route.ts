import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { saveManualStyle } from "@/lib/ai-studio/manual-style";

const schema = z.object({
  colorPalette: z.array(z.string()).min(1).max(8),
  designTone: z.string().min(1),
  contentMood: z.string().min(1),
  compositionStyle: z.string().optional(),
  typographyStyle: z.string().optional(),
  visualComplexity: z.enum(["low", "medium", "high"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const profile = await saveManualStyle(clinicId, parsed.data);
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stil kaydetme başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
