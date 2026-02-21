import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reminderSchema } from "@/lib/validations";

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

    const reminders = await prisma.reminder.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(reminders);
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const parsed = reminderSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: (parsed.error.issues?.[0]?.message || "Geçersiz veri") },
        { status: 400 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        ...parsed.data,
        clinicId,
      },
    });

    return Response.json(reminder, { status: 201 });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
