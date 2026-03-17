import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const { id } = await params;

  // Verify ownership
  const item = await prisma.clinicKnowledgeBase.findFirst({
    where: { id, clinicId },
  });
  if (!item) {
    return NextResponse.json({ error: "Kaynak bulunamadı" }, { status: 404 });
  }

  await prisma.clinicKnowledgeBase.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
