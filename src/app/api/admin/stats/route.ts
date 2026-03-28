import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalClinics,
      todayLogins,
      activeUsersLast24h,
      passiveUsers,
      // Module analytics — son 30 günlük PAGE_VIEW'lar
      moduleViews,
      // Per-user module breakdown
      userModuleViews,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.clinic.count(),
      prisma.activityLog.count({
        where: { action: "LOGIN", createdAt: { gte: today } },
      }),
      // Aktif: son 24 saatte giriş yapmış farklı kullanıcı sayısı
      prisma.activityLog.groupBy({
        by: ["userId"],
        where: {
          action: { in: ["LOGIN", "PAGE_VIEW"] },
          createdAt: { gte: twentyFourHoursAgo },
        },
      }).then((r) => r.length),
      // Pasif: 7+ gündür giriş yapmamış kullanıcılar
      prisma.user.count({
        where: {
          isActive: true,
          OR: [
            { lastLoginAt: { lt: sevenDaysAgo } },
            { lastLoginAt: null },
          ],
        },
      }),
      // Modül kullanım istatistikleri (son 30 gün)
      prisma.activityLog.groupBy({
        by: ["details"],
        where: {
          action: "PAGE_VIEW",
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
      }),
      // Kullanıcı bazlı modül kullanımı (son 30 gün)
      prisma.activityLog.findMany({
        where: {
          action: "PAGE_VIEW",
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          userId: true,
          details: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Modül bazlı toplam görüntüleme
    const moduleStats: Record<string, number> = {};
    for (const entry of moduleViews) {
      const page = (entry.details as any)?.page;
      if (!page) continue;
      // Ana modülü çıkar: /patients/123 → /patients
      const mod = "/" + page.split("/").filter(Boolean)[0];
      moduleStats[mod] = (moduleStats[mod] || 0) + entry._count.id;
    }

    // Modül istatistiklerini sırala
    const topModules = Object.entries(moduleStats)
      .map(([module, views]) => ({ module, views }))
      .sort((a, b) => b.views - a.views);

    // Kullanıcı bazlı modül kullanımı
    const userModuleMap: Record<string, { name: string; email: string; modules: Record<string, number>; total: number }> = {};
    for (const entry of userModuleViews) {
      const page = (entry.details as any)?.page;
      if (!page) continue;
      const mod = "/" + page.split("/").filter(Boolean)[0];

      if (!userModuleMap[entry.userId]) {
        userModuleMap[entry.userId] = {
          name: entry.user.name || "",
          email: entry.user.email || "",
          modules: {},
          total: 0,
        };
      }
      userModuleMap[entry.userId].modules[mod] = (userModuleMap[entry.userId].modules[mod] || 0) + 1;
      userModuleMap[entry.userId].total += 1;
    }

    const userAnalytics = Object.entries(userModuleMap)
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        email: data.email,
        total: data.total,
        modules: Object.entries(data.modules)
          .map(([module, count]) => ({ module, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      totalUsers,
      activeUsers: activeUsersLast24h,
      passiveUsers,
      totalClinics,
      todayLogins,
      topModules,
      userAnalytics,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "İstatistikler alınamadı" },
      { status: 500 }
    );
  }
}
