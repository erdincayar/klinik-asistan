import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  categories: z.array(z.string().min(1).max(50)).min(1).max(20),
});

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
      select: { photoCategories: true },
    });

    if (!clinic) {
      return Response.json({ error: "Klinik bulunamadı" }, { status: 404 });
    }

    return Response.json({ categories: clinic.photoCategories });
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: { photoCategories: parsed.data.categories },
      select: { photoCategories: true },
    });

    return Response.json({ categories: clinic.photoCategories });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
