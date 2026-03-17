import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const profile = await prisma.onboardingProfile.create({
      data: {},
    });

    return Response.json({ sessionId: profile.sessionId });
  } catch (error) {
    console.error("[Onboarding Start]", error);
    return Response.json({ error: "Profil oluşturulamadı" }, { status: 500 });
  }
}
