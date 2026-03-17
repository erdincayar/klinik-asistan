import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const items = await prisma.clinicKnowledgeBase.findMany({
    where: { clinicId },
    select: {
      id: true,
      sourceType: true,
      sourceFilename: true,
      content: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Truncate content for listing
  const result = items.map((item) => ({
    ...item,
    contentPreview: item.content.slice(0, 200),
    content: undefined,
  }));

  return NextResponse.json(result);
}
