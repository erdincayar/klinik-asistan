import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const employee = await prisma.employee.findFirst({
      where: { inviteToken: params.token },
      include: { clinic: { select: { name: true } } },
    });

    if (!employee) {
      return Response.json({ error: "Davet bağlantısı geçersiz" }, { status: 404 });
    }

    // Check 7-day expiry
    if (employee.invitedAt) {
      const expiresAt = new Date(employee.invitedAt);
      expiresAt.setDate(expiresAt.getDate() + 7);
      if (expiresAt < new Date()) {
        return Response.json({ error: "Davet bağlantısının süresi dolmuş" }, { status: 410 });
      }
    }

    // Check if already used
    if (employee.inviteStatus === "active") {
      return Response.json({ error: "Bu davet bağlantısı zaten kullanılmış" }, { status: 409 });
    }

    return Response.json({
      valid: true,
      employeeName: employee.name,
      employeeEmail: employee.email,
      clinicName: employee.clinic.name,
    });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
