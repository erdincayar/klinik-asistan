import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const clinicId = (session?.user as any)?.clinicId;
    if (!clinicId) {
      return Response.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const profile = await prisma.onboardingProfile.findFirst({
      where: { clinicId, completed: true },
      orderBy: { createdAt: "desc" },
    });

    if (!profile) {
      return Response.json({ profile: null });
    }

    return Response.json({ profile });
  } catch (error) {
    console.error("[Onboarding Dashboard Profile]", error);
    return Response.json({ error: "Profil getirilemedi" }, { status: 500 });
  }
}
