import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const { id } = await params;

  const conversation = await prisma.clinicConversation.findFirst({
    where: { id, clinicId },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}
