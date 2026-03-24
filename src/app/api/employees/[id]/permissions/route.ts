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

    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, clinicId },
    });
    if (!existing) return Response.json({ error: "Çalışan bulunamadı" }, { status: 404 });

    const body = await req.json();
    const { roleTemplate, permissions } = body;

    const updateData: Record<string, any> = {};

    if (roleTemplate !== undefined) {
      updateData.roleTemplate = roleTemplate;
    }

    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }

    // Auto-generate permissions from template if not custom
    if (roleTemplate === "full") {
      updateData.permissions = {
        dashboard: "full",
        appointments: "full",
        customers: "full",
        finance: "full",
        inventory: "full",
        employees: "full",
        hr: "full",
        marketing: "full",
        messaging: "full",
        ai_assistant: "full",
        reports: "full",
        alarms: "full",
        reminders: "full",
        settings: "full",
      };
    } else if (roleTemplate === "view_only") {
      updateData.permissions = {
        dashboard: "view",
        appointments: "view",
        customers: "view",
        finance: "view",
        inventory: "view",
        employees: "view",
        hr: "view",
        marketing: "none",
        messaging: "none",
        ai_assistant: "none",
        reports: "view",
        alarms: "view",
        reminders: "view",
        settings: "none",
      };
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
