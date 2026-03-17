import { prisma } from "@/lib/prisma";
import { z } from "zod";

const completeSchema = z.object({
  sessionId: z.string().min(1),
  selectedModules: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = completeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    await prisma.onboardingProfile.update({
      where: { sessionId: parsed.data.sessionId },
      data: {
        selectedModules: parsed.data.selectedModules,
        completed: true,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[Onboarding Complete]", error);
    return Response.json({ error: "Tamamlama başarısız" }, { status: 500 });
  }
}
