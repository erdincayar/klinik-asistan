import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const existing = await prisma.clinicAssistantConfig.findUnique({
    where: { clinicId },
  });

  const config = await prisma.clinicAssistantConfig.upsert({
    where: { clinicId },
    create: { clinicId, isActive: true },
    update: { isActive: !existing?.isActive },
  });

  return NextResponse.json({ isActive: config.isActive });
}
