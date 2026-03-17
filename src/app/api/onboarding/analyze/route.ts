import { prisma } from "@/lib/prisma";
import { analyzeAndRecommend } from "@/lib/onboarding/onboarding-agent";
import { z } from "zod";

const analyzeSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyzeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const profile = await prisma.onboardingProfile.findUnique({
      where: { sessionId: parsed.data.sessionId },
    });

    if (!profile) {
      return Response.json({ error: "Profil bulunamadı" }, { status: 404 });
    }

    if (!profile.sector || !profile.teamSize || !profile.painPoints) {
      return Response.json({ error: "Profil eksik" }, { status: 400 });
    }

    const result = await analyzeAndRecommend({
      sector: profile.sector,
      sectorCustom: profile.sectorCustom || undefined,
      teamSize: profile.teamSize,
      painPoints: profile.painPoints as string[],
    });

    await prisma.onboardingProfile.update({
      where: { sessionId: parsed.data.sessionId },
      data: {
        recommendedModules: JSON.parse(JSON.stringify(result.recommendedModules)),
        analysisResult: JSON.parse(JSON.stringify({
          reasoning: result.reasoning,
          upsellModules: result.upsellModules,
          customMessage: result.customMessage,
          totalBasePrice: result.totalBasePrice,
        })),
      },
    });

    return Response.json(result);
  } catch (error) {
    console.error("[Onboarding Analyze]", error);
    return Response.json({ error: "Analiz başarısız" }, { status: 500 });
  }
}
