import { prisma } from "@/lib/prisma";
import { inviteRegisterSchema } from "@/lib/validations";
import bcryptjs from "bcryptjs";

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    // Validate token
    const employee = await prisma.employee.findFirst({
      where: { inviteToken: params.token },
    });

    if (!employee) {
      return Response.json({ error: "Davet bağlantısı geçersiz" }, { status: 404 });
    }

    if (employee.invitedAt) {
      const expiresAt = new Date(employee.invitedAt);
      expiresAt.setDate(expiresAt.getDate() + 7);
      if (expiresAt < new Date()) {
        return Response.json({ error: "Davet bağlantısının süresi dolmuş" }, { status: 410 });
      }
    }

    if (employee.inviteStatus === "active") {
      return Response.json({ error: "Bu davet bağlantısı zaten kullanılmış" }, { status: 409 });
    }

    // Parse body
    const body = await request.json();
    const parsed = inviteRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues?.[0]?.message || "Geçersiz veri" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return Response.json({ error: "Bu email adresi zaten kullanılıyor" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Create user and update employee in a transaction
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          clinicId: employee.clinicId,
          emailVerified: true,
        },
      });

      await tx.employee.update({
        where: { id: employee.id },
        data: {
          inviteStatus: "active",
          hasSystemAccess: true,
          systemEmail: email,
          userId: user.id,
          inviteToken: null,
        },
      });
    });

    return Response.json({ success: true, email });
  } catch {
    return Response.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
