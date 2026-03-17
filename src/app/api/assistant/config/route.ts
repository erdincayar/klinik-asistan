import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  let config = await prisma.clinicAssistantConfig.findUnique({
    where: { clinicId },
  });

  if (!config) {
    config = await prisma.clinicAssistantConfig.create({
      data: { clinicId },
    });
  }

  return NextResponse.json(config);
}

const updateSchema = z.object({
  assistantName: z.string().min(1).max(100).optional(),
  tone: z.enum(["warm", "formal", "informative"]).optional(),
  responseLength: z.enum(["short", "medium", "detailed"]).optional(),
  emojiUsage: z.enum(["none", "minimal", "normal"]).optional(),
  language: z.enum(["tr", "en", "both"]).optional(),
  capabilities: z.record(z.string(), z.boolean()).optional(),
  systemPromptOverride: z.string().nullable().optional(),
  learnedStylePrompt: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
  }

  const config = await prisma.clinicAssistantConfig.upsert({
    where: { clinicId },
    create: { clinicId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json(config);
}
