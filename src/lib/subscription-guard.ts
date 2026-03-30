import { prisma } from "./prisma";

interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Modülün aktif olup olmadığını kontrol eder.
 * Trial'da tüm modüller serbest.
 */
export async function checkModuleAccess(clinicId: string, moduleSlug: string): Promise<GuardResult> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { clinicId },
  });

  // Plan yoksa veya trial'daysa serbest
  if (!plan || plan.status === "trial") {
    return { allowed: true };
  }

  // Suspended/cancelled ise engelle
  if (plan.status === "suspended" || plan.status === "cancelled") {
    return { allowed: false, reason: "Aboneliğiniz askıda veya iptal edilmiş." };
  }

  const activeModules = (plan.activeModules as string[]) || [];
  if (!activeModules.includes(moduleSlug)) {
    return { allowed: false, reason: "Bu modül aboneliğinize dahil değil." };
  }

  return { allowed: true };
}

/**
 * Davet hakkı kontrolü.
 * Trial'da limit yok.
 * Aktif abonelikte: 1 (sahip) + extraUsers = toplam kullanıcı hakkı
 * Aktif davetli sayısı (invited + active) bu limiti aşamaz.
 */
export async function checkInviteLimit(clinicId: string): Promise<GuardResult> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { clinicId },
  });

  // Plan yoksa veya trial'daysa serbest
  if (!plan || plan.status === "trial") {
    return { allowed: true };
  }

  // Aktif davet sayısı
  const activeInvites = await prisma.employee.count({
    where: {
      clinicId,
      hasSystemAccess: true,
      inviteStatus: { in: ["invited", "active"] },
    },
  });

  // 1 (sahip ücretsiz) + extraUsers
  const maxInvites = 1 + (plan.extraUsers || 0);

  if (activeInvites >= maxInvites) {
    return {
      allowed: false,
      reason: `Davet limitinize ulaştınız (${activeInvites}/${maxInvites}). Daha fazla kullanıcı eklemek için abonelik sayfasından ek kullanıcı satın alın.`,
    };
  }

  return { allowed: true };
}
