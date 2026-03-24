import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return Response.json({ error: "No clinic" }, { status: 400 });

    const employeeId = params.id;

    // Verify employee belongs to clinic
    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, clinicId },
    });
    if (!existing) return Response.json({ error: "Çalışan bulunamadı" }, { status: 404 });

    const body = await req.json();
    const { hasSystemAccess, systemEmail, inviteStatus, permissions } = body;

    const updateData: Record<string, any> = {};
    if (hasSystemAccess !== undefined) updateData.hasSystemAccess = hasSystemAccess;
    if (systemEmail !== undefined) updateData.systemEmail = systemEmail || null;
    if (inviteStatus !== undefined) updateData.inviteStatus = inviteStatus;
    if (permissions !== undefined) updateData.permissions = permissions;

    // When invited, set invitedAt
    if (inviteStatus === "invited" && existing.inviteStatus !== "invited") {
      updateData.invitedAt = new Date();
    }

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    });

    return Response.json({ success: true, employee });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
