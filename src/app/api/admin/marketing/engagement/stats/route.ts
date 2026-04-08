import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const clinicId = (session.user as any).clinicId;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalReplies, weeklyReplies, sentReplies, topReplies, targetCount] = await Promise.all([
    prisma.engagementReply.count({ where: { clinicId, status: "SENT" } }),
    prisma.engagementReply.count({ where: { clinicId, status: "SENT", createdAt: { gte: weekAgo } } }),
    prisma.engagementReply.findMany({
      where: { clinicId, status: "SENT" },
      select: { impressions: true, likes: true, replies: true, retweets: true },
    }),
    prisma.engagementReply.findMany({
      where: { clinicId, status: "SENT", likes: { not: null } },
      orderBy: { likes: "desc" },
      take: 5,
      include: { targetAccount: { select: { username: true } } },
    }),
    prisma.targetAccount.count({ where: { clinicId, isActive: true } }),
  ]);

  const totalImpressions = sentReplies.reduce((sum, r) => sum + (r.impressions || 0), 0);
  const totalLikes = sentReplies.reduce((sum, r) => sum + (r.likes || 0), 0);
  const totalEngagement = sentReplies.reduce((sum, r) => sum + (r.likes || 0) + (r.replies || 0) + (r.retweets || 0), 0);

  return NextResponse.json({
    totalRepliesSent: totalReplies,
    weeklyRepliesSent: weeklyReplies,
    totalImpressions,
    totalLikes,
    totalEngagement,
    targetAccountCount: targetCount,
    topReplies: topReplies.map(r => ({
      id: r.id,
      targetUsername: r.targetAccount?.username,
      sourceTweetText: (r as any).sourceTweetText?.slice(0, 100),
      suggestedReply: (r as any).suggestedReply?.slice(0, 100),
      likes: r.likes,
      impressions: r.impressions,
    })),
  });
}
