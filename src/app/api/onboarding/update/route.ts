import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  sessionId: z.string().min(1),
  sector: z.string().optional(),
  sectorCustom: z.string().optional(),
  teamSize: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const { sessionId, ...data } = parsed.data;

    const profile = await prisma.onboardingProfile.update({
      where: { sessionId },
      data,
    });

    return Response.json({ success: true, profile });
  } catch (error) {
    console.error("[Onboarding Update]", error);
    return Response.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}
