import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const allowedFields: Record<string, unknown> = {};
    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.role !== undefined) allowedFields.role = body.role;
    if (body.isActive !== undefined) allowedFields.isActive = body.isActive;

    const updated = await prisma.user.update({
      where: { id },
      data: allowedFields,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        clinicId: true,
        clinic: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    await logActivity({
      userId: (session.user as any).id,
      clinicId: (session.user as any).clinicId,
      action: "USER_UPDATE",
      details: { targetUserId: id, changes: allowedFields },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { error: "Kullanıcı güncellenemedi" },
      { status: 500 }
    );
  }
}
