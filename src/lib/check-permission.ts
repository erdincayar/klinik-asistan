import { prisma } from "./prisma";

export type AccessLevel = "full" | "view" | "none";

export type ModuleKey =
  | "dashboard"
  | "appointments"
  | "customers"
  | "finance"
  | "inventory"
  | "employees"
  | "hr"
  | "marketing"
  | "messaging"
  | "ai_assistant"
  | "reports"
  | "alarms"
  | "reminders"
  | "settings";

// Legacy permission type (backward compat)
export type Permission =
  | "view_customers"
  | "view_appointments"
  | "view_all_appointments"
  | "view_finance"
  | "view_inventory"
  | "view_reports"
  | "manage_settings";

// Map legacy permission keys to new module keys
const LEGACY_TO_MODULE: Record<string, { module: ModuleKey; minLevel: AccessLevel }> = {
  view_customers: { module: "customers", minLevel: "view" },
  view_appointments: { module: "appointments", minLevel: "view" },
  view_all_appointments: { module: "appointments", minLevel: "full" },
  view_finance: { module: "finance", minLevel: "view" },
  view_inventory: { module: "inventory", minLevel: "view" },
  view_reports: { module: "reports", minLevel: "view" },
  manage_settings: { module: "settings", minLevel: "full" },
};

const LEVEL_ORDER: Record<string, number> = { none: 0, view: 1, full: 2 };

export async function checkPermission(
  userId: string,
  clinicId: string,
  permission: Permission
): Promise<boolean> {
  const employee = await prisma.employee.findFirst({
    where: { clinicId, userId, isActive: true },
  });

  // Check if user is clinic creator (admin)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { clinic: true },
  });

  if (user?.clinicId === clinicId) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { users: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
    if (clinic?.users[0]?.id === userId) return true;
  }

  if (!employee) return true; // No employee record = full access (backward compat)

  const perms = employee.permissions as Record<string, string> | Record<string, boolean> | null;
  if (!perms) return true;

  // Detect new vs legacy format
  const firstValue = Object.values(perms)[0];

  if (typeof firstValue === "string") {
    // New module-based format: { module: "full" | "view" | "none" }
    const mapping = LEGACY_TO_MODULE[permission];
    if (!mapping) return false;
    const level = (perms as Record<string, string>)[mapping.module] || "none";
    return (LEVEL_ORDER[level] ?? 0) >= (LEVEL_ORDER[mapping.minLevel] ?? 0);
  }

  // Legacy boolean format
  return (perms as Record<string, boolean>)[permission] === true;
}

export async function checkModuleAccess(
  userId: string,
  clinicId: string,
  moduleKey: ModuleKey,
  minLevel: AccessLevel = "view"
): Promise<boolean> {
  const employee = await prisma.employee.findFirst({
    where: { clinicId, userId, isActive: true },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.clinicId === clinicId) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { users: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
    if (clinic?.users[0]?.id === userId) return true;
  }

  if (!employee) return true;

  const perms = employee.permissions as Record<string, string> | null;
  if (!perms) return true;

  const level = perms[moduleKey] || "none";
  return (LEVEL_ORDER[level] ?? 0) >= (LEVEL_ORDER[minLevel] ?? 0);
}

export function getDefaultPermissions(): Record<Permission, boolean> {
  return {
    view_customers: true,
    view_appointments: true,
    view_all_appointments: false,
    view_finance: false,
    view_inventory: true,
    view_reports: false,
    manage_settings: false,
  };
}
