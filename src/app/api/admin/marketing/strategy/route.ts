import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — fetch strategy settings
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  let strategy = await prisma.tweetStrategy.findUnique({ where: { clinicId } });

  // Create default if not exists
  if (!strategy) {
    strategy = await prisma.tweetStrategy.create({
      data: { clinicId },
    });
  }

  return NextResponse.json({ strategy });
}

// PUT — update strategy settings
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  const body = await req.json();

  const strategy = await prisma.tweetStrategy.upsert({
    where: { clinicId },
    create: {
      clinicId,
      ...sanitize(body),
    },
    update: sanitize(body),
  });

  return NextResponse.json({ strategy });
}

function sanitize(body: any) {
  const data: any = {};
  if (body.tweetsPerDay != null) data.tweetsPerDay = Math.min(10, Math.max(1, Number(body.tweetsPerDay)));
  if (body.postTimes) data.postTimes = JSON.stringify(body.postTimes);
  if (body.contentMix) data.contentMix = JSON.stringify(body.contentMix);
  if (body.toneStyle) data.toneStyle = String(body.toneStyle).slice(0, 100);
  if (body.focusFeatures) data.focusFeatures = JSON.stringify(body.focusFeatures);
  if (body.avoidTopics != null) data.avoidTopics = String(body.avoidTopics).slice(0, 500);
  if (body.hashtagStrategy) data.hashtagStrategy = String(body.hashtagStrategy).slice(0, 200);
  if (body.videoRhythm) data.videoRhythm = body.videoRhythm;
  if (body.videoScenarios) data.videoScenarios = JSON.stringify(body.videoScenarios);
  return data;
}
