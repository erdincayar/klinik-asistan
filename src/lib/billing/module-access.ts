import { prisma } from "@/lib/prisma";
import { LOCKED_MODULES } from "./plans";
import type { SubscriptionPlan } from "@prisma/client";

export async function getSubscriptionPlan(clinicId: string): Promise<SubscriptionPlan | null> {
  return prisma.subscriptionPlan.findUnique({
    where: { clinicId },
  });
}

export function hasModuleAccess(activeModules: string[], moduleSlug: string): boolean {
  return activeModules.includes(moduleSlug);
}

export function isModuleLocked(moduleSlug: string): boolean {
  return LOCKED_MODULES.includes(moduleSlug);
}

export function isTrialActive(plan: SubscriptionPlan): boolean {
  if (plan.status !== "trial") return false;
  if (!plan.trialEnd) return false;
  return new Date() < plan.trialEnd;
}

export function getTrialDaysLeft(plan: SubscriptionPlan): number {
  if (!plan.trialEnd) return 0;
  const diff = plan.trialEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
