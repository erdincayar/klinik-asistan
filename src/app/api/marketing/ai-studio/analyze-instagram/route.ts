import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
// TOKEN_SYSTEM_DISABLED - import { TOKEN_COSTS } from "@/lib/token-costs";
// TOKEN_SYSTEM_DISABLED - import { checkBalance, deductTokens } from "@/lib/token-service";
import { analyzeInstagramStyle } from "@/lib/ai-studio/instagram-analyzer";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const clinicId = user.clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const isDemo = user.isDemo || user.role === "ADMIN";
  // TOKEN_SYSTEM_DISABLED
  // if (!isDemo) {
  //   const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.AI_STUDIO_ANALYZE);
  //   if (!hasBalance) {
  //     return NextResponse.json(
  //       { error: "Token bakiyeniz yetersiz." },
  //       { status: 402 }
  //     );
  //   }
  // }

  try {
    const profile = await analyzeInstagramStyle(clinicId);

    // TOKEN_SYSTEM_DISABLED
    // if (!isDemo) {
    //   await deductTokens(clinicId, "AI_STUDIO_ANALYZE", TOKEN_COSTS.AI_STUDIO_ANALYZE, "Instagram stil analizi");
    // }

    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram analizi başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
