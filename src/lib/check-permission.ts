import { prisma } from "./prisma";

export type Permission =
  | "view_customers"
  | "view_appointments"
  | "view_all_appointments"
  | "view_finance"
  | "view_inventory"
  | "view_reports"
  | "manage_settings";

export async function checkPermission(
  userId: string,
  clinicId: string,
  permission: Permission
): Promise<boolean> {
  // Find employee record for this user
  const employee = await prisma.employee.findFirst({
    where: {
      clinicId,
      userId,
      isActive: true,
    },
  });

  // If no employee record found, check if user is clinic admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { clinic: true },
  });

  // Clinic creator (first user) has all permissions
  if (user?.clinicId === clinicId) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { users: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
    if (clinic?.users[0]?.id === userId) return true;
  }

  if (!employee) return true; // No employee record = full access (backward compat)

  const permissions = (employee.permissions as Record<string, boolean>) || {};
  return permissions[permission] === true;
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
