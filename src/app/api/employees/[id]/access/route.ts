import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, clinicId },
    });
    if (!employee) {
      return Response.json({ error: "Çalışan bulunamadı" }, { status: 404 });
    }

    await prisma.employee.update({
      where: { id: params.id },
      data: {
        hasSystemAccess: false,
        inviteStatus: "not_invited",
        inviteToken: null,
        systemEmail: null,
      },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
