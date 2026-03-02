import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
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

    const { email, password, name, role, clinicName } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, şifre ve ad gerekli" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Bu email zaten kayıtlı" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    let clinicId: string | undefined;
    if (clinicName) {
      const clinic = await prisma.clinic.create({
        data: { name: clinicName },
      });
      clinicId = clinic.id;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "USER",
        isActive: true,
        onboardingCompleted: true,
        clinicId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        clinicId: true,
        createdAt: true,
      },
    });

    await logActivity({
      userId: (session.user as any).id,
      clinicId: (session.user as any).clinicId,
      action: "USER_CREATE",
      details: { newUserId: user.id, email: user.email },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json(
      { error: "Kullanıcı oluşturulamadı" },
      { status: 500 }
    );
  }
}
