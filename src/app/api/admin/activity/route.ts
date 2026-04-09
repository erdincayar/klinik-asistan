import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN" && adminUser?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "";
    const userId = searchParams.get("userId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [logs, total, pageViews, actionBreakdown, dailyActivity, totalUsers] = await Promise.all([
      // Paginated logs
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),

      // Modül bazlı sayfa görüntüleme (son 30 gün)
      prisma.activityLog.findMany({
        where: {
          action: "PAGE_VIEW",
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          details: true,
          userId: true,
        },
      }),

      // Aksiyon dağılımı (PAGE_VIEW hariç, son 30 gün)
      prisma.activityLog.groupBy({
        by: ["action"],
        where: {
          action: { not: "PAGE_VIEW" },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
      }),

      // Son 7 gün günlük aktivite (tüm aksiyonlar)
      prisma.activityLog.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          action: true,
          createdAt: true,
        },
      }),

      // Toplam aktif kullanıcı sayısı (ortalama hesabı için)
      prisma.user.count({ where: { isActive: true } }),
    ]);

    // Modül bazlı analiz
    const moduleMap: Record<string, { views: number; uniqueUsers: Set<string> }> = {};
    for (const pv of pageViews) {
      const pg = (pv.details as any)?.page;
      if (!pg) continue;
      const mod = "/" + pg.split("/").filter(Boolean)[0];
      if (!moduleMap[mod]) moduleMap[mod] = { views: 0, uniqueUsers: new Set() };
      moduleMap[mod].views += 1;
      moduleMap[mod].uniqueUsers.add(pv.userId);
    }

    const moduleAnalytics = Object.entries(moduleMap)
      .map(([mod, data]) => ({
        module: mod,
        views: data.views,
        uniqueUsers: data.uniqueUsers.size,
        avgPerUser: totalUsers > 0 ? Math.round((data.views / totalUsers) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.views - a.views);

    // Aksiyon dağılımı
    const actions = actionBreakdown
      .map((a) => ({ action: a.action, count: a._count.id }))
      .sort((a, b) => b.count - a.count);

    // Son 7 gün günlük aktivite grafiği
    const dailyMap: Record<string, { total: number; pageViews: number; actions: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
      dailyMap[key] = { total: 0, pageViews: 0, actions: 0 };
    }
    for (const entry of dailyActivity) {
      const key = new Date(entry.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
      if (dailyMap[key]) {
        dailyMap[key].total += 1;
        if (entry.action === "PAGE_VIEW") dailyMap[key].pageViews += 1;
        else dailyMap[key].actions += 1;
      }
    }
    const dailyChart = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      ...data,
    }));

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      moduleAnalytics,
      actions,
      dailyChart,
      totalUsers,
    });
  } catch (error) {
    console.error("Admin activity error:", error);
    return NextResponse.json(
      { error: "Aktivite logları alınamadı" },
      { status: 500 }
    );
  }
}
