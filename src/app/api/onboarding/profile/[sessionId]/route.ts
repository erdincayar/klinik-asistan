import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const profile = await prisma.onboardingProfile.findUnique({
      where: { sessionId: params.sessionId },
    });

    if (!profile) {
      return Response.json({ error: "Profil bulunamadı" }, { status: 404 });
    }

    return Response.json(profile);
  } catch (error) {
    console.error("[Onboarding Profile]", error);
    return Response.json({ error: "Profil getirilemedi" }, { status: 500 });
  }
}
