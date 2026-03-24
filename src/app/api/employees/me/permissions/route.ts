import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    const userId = session.user.id;
    if (!clinicId || !userId) return Response.json({ error: "No clinic" }, { status: 400 });

    // Find employee linked to this user
    const employee = await prisma.employee.findFirst({
      where: { clinicId, userId, isActive: true },
      select: { permissions: true, roleTemplate: true },
    });

    if (!employee) {
      // No employee record = full access (clinic owner or unlinked user)
      return Response.json({ permissions: null, roleTemplate: null });
    }

    return Response.json({
      permissions: employee.permissions,
      roleTemplate: employee.roleTemplate,
    });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
