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
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalClinics,
      todayLogins,
      activeUsersLast24h,
      passiveUsers,
      // İşletme verileri
      totalPatients,
      totalEmployees,
      totalAppointments,
      totalTreatments,
      // Son 30 gün yeni kayıtlar
      newUsersLast30d,
      newClinicsLast30d,
      newPatientsLast30d,
      newEmployeesLast30d,
      // Sektör dağılımı
      sectorDistribution,
      // Abonelik durumları
      subscriptionStats,
      // Modül satın alma verileri
      moduleActivations,
      // Ort çalışan / klinik
      employeesPerClinic,
      // Ort müşteri / klinik
      patientsPerClinic,
      // Tedavi gelir verileri (son 30 gün)
      treatmentRevenue,
      // Ödeme yöntemi dağılımı
      paymentMethods,
      // Randevu durum dağılımı
      appointmentStatuses,
      // Sayfa görüntüleme (modül analiz)
      pageViews,
      // Günlük giriş trendi (son 14 gün)
      loginTrend,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.clinic.count(),
      prisma.activityLog.count({ where: { action: "LOGIN", createdAt: { gte: today } } }),
      prisma.activityLog.groupBy({
        by: ["userId"],
        where: { action: { in: ["LOGIN", "PAGE_VIEW"] }, createdAt: { gte: twentyFourHoursAgo } },
      }).then((r) => r.length),
      prisma.user.count({
        where: { isActive: true, OR: [{ lastLoginAt: { lt: sevenDaysAgo } }, { lastLoginAt: null }] },
      }),
      prisma.patient.count(),
      prisma.employee.count(),
      prisma.appointment.count(),
      prisma.treatment.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.clinic.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.patient.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.employee.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Sektör
      prisma.clinic.groupBy({ by: ["sector"], _count: { id: true } }),
      // Abonelik
      prisma.subscriptionPlan.groupBy({ by: ["status"], _count: { id: true } }).catch(() => []),
      // Modül aktivasyonları
      prisma.clinicModule.findMany({
        where: { isActive: true },
        include: { module: { select: { name: true, displayName: true } } },
      }).catch(() => []),
      // Ort çalışan
      prisma.employee.groupBy({ by: ["clinicId"], _count: { id: true } }),
      // Ort müşteri
      prisma.patient.groupBy({ by: ["clinicId"], _count: { id: true } }),
      // Tedavi gelir
      prisma.treatment.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Ödeme yöntemi
      prisma.treatment.groupBy({
        by: ["paymentMethod"],
        _count: { id: true },
        _sum: { amount: true },
      }),
      // Randevu durumu
      prisma.appointment.groupBy({
        by: ["status"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
      // Sayfa görüntüleme
      prisma.activityLog.findMany({
        where: { action: "PAGE_VIEW", createdAt: { gte: thirtyDaysAgo } },
        select: { details: true, userId: true },
      }),
      // Günlük giriş trendi (son 14 gün)
      prisma.activityLog.findMany({
        where: { action: "LOGIN", createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true, userId: true },
      }),
    ]);

    // ── Sektör dağılımı
    const sectors = sectorDistribution
      .filter((s) => s.sector)
      .map((s) => ({ sector: s.sector || "Belirtilmemiş", count: s._count.id }))
      .sort((a, b) => b.count - a.count);

    // ── Abonelik durumları
    const subscriptions = (subscriptionStats as any[]).map((s: any) => ({
      status: s.status,
      count: s._count.id,
    }));

    // ── Modül popülerlik (kaç klinik satın almış)
    const modulePopularity: Record<string, { name: string; count: number }> = {};
    for (const cm of moduleActivations as any[]) {
      const name = cm.module?.displayName || cm.module?.name || "Bilinmeyen";
      if (!modulePopularity[name]) modulePopularity[name] = { name, count: 0 };
      modulePopularity[name].count += 1;
    }
    const topModulesPurchased = Object.values(modulePopularity).sort((a, b) => b.count - a.count);

    // ── Ortalamalar
    const avgEmployeesPerClinic = employeesPerClinic.length > 0
      ? Math.round((employeesPerClinic.reduce((s, e) => s + e._count.id, 0) / employeesPerClinic.length) * 10) / 10
      : 0;
    const avgPatientsPerClinic = patientsPerClinic.length > 0
      ? Math.round((patientsPerClinic.reduce((s, e) => s + e._count.id, 0) / patientsPerClinic.length) * 10) / 10
      : 0;

    // ── Tedavi geliri
    const treatmentRevenueTotal = (treatmentRevenue._sum.amount || 0) / 100;
    const treatmentCount30d = treatmentRevenue._count.id;

    // ── Ödeme yöntemi
    const payments = paymentMethods.map((p) => ({
      method: p.paymentMethod || "Belirtilmemiş",
      count: p._count.id,
      total: (p._sum.amount || 0) / 100,
    })).sort((a, b) => b.count - a.count);

    // ── Randevu durumları
    const STATUS_LABELS: Record<string, string> = {
      SCHEDULED: "Planlandı", COMPLETED: "Tamamlandı", CANCELLED: "İptal", NO_SHOW: "Gelmedi",
    };
    const appointmentStatusData = appointmentStatuses.map((a) => ({
      status: STATUS_LABELS[a.status] || a.status,
      count: a._count.id,
    }));

    // ── Modül kullanım (sayfa görüntüleme bazlı)
    const moduleMap: Record<string, { views: number; uniqueUsers: Set<string> }> = {};
    for (const pv of pageViews) {
      const pg = (pv.details as any)?.page;
      if (!pg) continue;
      const mod = "/" + pg.split("/").filter(Boolean)[0];
      if (!moduleMap[mod]) moduleMap[mod] = { views: 0, uniqueUsers: new Set() };
      moduleMap[mod].views += 1;
      moduleMap[mod].uniqueUsers.add(pv.userId);
    }
    const topModulesUsage = Object.entries(moduleMap)
      .map(([mod, data]) => ({
        module: mod,
        views: data.views,
        uniqueUsers: data.uniqueUsers.size,
        avgPerUser: totalUsers > 0 ? Math.round((data.views / totalUsers) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.views - a.views);

    // ── Günlük giriş trendi
    const dailyLoginMap: Record<string, { logins: number; uniqueUsers: Set<string> }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
      dailyLoginMap[key] = { logins: 0, uniqueUsers: new Set() };
    }
    for (const entry of loginTrend) {
      const key = new Date(entry.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
      if (dailyLoginMap[key]) {
        dailyLoginMap[key].logins += 1;
        dailyLoginMap[key].uniqueUsers.add(entry.userId);
      }
    }
    const loginChart = Object.entries(dailyLoginMap).map(([date, data]) => ({
      date,
      logins: data.logins,
      uniqueUsers: data.uniqueUsers.size,
    }));

    // ── Per-user module breakdown
    const userModuleMap: Record<string, { name: string; email: string; modules: Record<string, number>; total: number }> = {};
    for (const pv of pageViews) {
      const pg = (pv.details as any)?.page;
      if (!pg) continue;
      const mod = "/" + pg.split("/").filter(Boolean)[0];
      if (!userModuleMap[pv.userId]) {
        userModuleMap[pv.userId] = { name: "", email: "", modules: {}, total: 0 };
      }
      userModuleMap[pv.userId].modules[mod] = (userModuleMap[pv.userId].modules[mod] || 0) + 1;
      userModuleMap[pv.userId].total += 1;
    }
    // Fetch user names
    const userIds = Object.keys(userModuleMap);
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      for (const u of users) {
        if (userModuleMap[u.id]) {
          userModuleMap[u.id].name = u.name || "";
          userModuleMap[u.id].email = u.email || "";
        }
      }
    }
    const userAnalytics = Object.entries(userModuleMap)
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        email: data.email,
        total: data.total,
        modules: Object.entries(data.modules)
          .map(([mod, count]) => ({ module: mod, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      // Temel sayılar
      totalUsers,
      activeUsers: activeUsersLast24h,
      passiveUsers,
      totalClinics,
      todayLogins,
      totalPatients,
      totalEmployees,
      totalAppointments,
      totalTreatments,
      // Son 30 gün büyüme
      newUsersLast30d,
      newClinicsLast30d,
      newPatientsLast30d,
      newEmployeesLast30d,
      // Ortalamalar
      avgEmployeesPerClinic,
      avgPatientsPerClinic,
      // Gelir
      treatmentRevenueTotal,
      treatmentCount30d,
      // Dağılımlar
      sectors,
      subscriptions,
      topModulesPurchased,
      payments,
      appointmentStatusData,
      // Modül kullanım
      topModules: topModulesUsage,
      userAnalytics,
      // Giriş trendi
      loginChart,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "İstatistikler alınamadı" }, { status: 500 });
  }
}
