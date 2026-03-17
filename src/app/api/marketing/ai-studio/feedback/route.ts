import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  contentId: z.string().min(1),
  isLiked: z.boolean().nullable(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  // Verify ownership
  const content = await prisma.aiGeneratedContent.findFirst({
    where: { id: parsed.data.contentId, clinicId },
  });
  if (!content) {
    return NextResponse.json({ error: "İçerik bulunamadı" }, { status: 404 });
  }

  const updated = await prisma.aiGeneratedContent.update({
    where: { id: parsed.data.contentId },
    data: { isLiked: parsed.data.isLiked },
  });

  return NextResponse.json({ id: updated.id, isLiked: updated.isLiked });
}
