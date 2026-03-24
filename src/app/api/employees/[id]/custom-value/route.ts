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
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, clinicId },
    });
    if (!employee) return Response.json({ error: "Çalışan bulunamadı" }, { status: 404 });

    const body = await req.json();
    const { fieldKey, value } = body;

    if (!fieldKey) return Response.json({ error: "fieldKey gerekli" }, { status: 400 });

    const customValue = await prisma.employeeCustomValue.upsert({
      where: { employeeId_fieldKey: { employeeId, fieldKey } },
      update: { value: value ?? null },
      create: { employeeId, fieldKey, value: value ?? null },
    });

    return Response.json({ customValue });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
