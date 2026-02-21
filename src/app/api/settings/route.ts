import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, phone: true, address: true, taxRate: true },
    });

    if (!clinic) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 404 });
    }

    return Response.json(clinic);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return Response.json({ error: "No clinic" }, { status: 400 });
    }

    const body = await request.json();
    const { name, phone, address, taxRate } = body;

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(taxRate !== undefined && { taxRate }),
      },
      select: { name: true, phone: true, address: true, taxRate: true },
    });

    return Response.json(clinic);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
