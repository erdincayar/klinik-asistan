import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(
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

    const token = randomUUID();

    await prisma.employee.update({
      where: { id: params.id },
      data: {
        inviteToken: token,
        inviteStatus: "invited",
        invitedAt: new Date(),
        hasSystemAccess: true,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://poby.ai";
    const inviteLink = `${baseUrl}/invite/${token}`;

    return Response.json({ inviteLink, inviteToken: token });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
