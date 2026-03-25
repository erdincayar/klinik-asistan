import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processWhatsAppExport } from "@/lib/assistant/whatsapp-learner";
// TOKEN_SYSTEM_DISABLED - import { TOKEN_COSTS } from "@/lib/token-costs";
// TOKEN_SYSTEM_DISABLED - import { checkBalance, deductTokens } from "@/lib/token-service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const clinicId = user.clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const isDemo = user.isDemo || user.role === "ADMIN";
  // TOKEN_SYSTEM_DISABLED
  // if (!isDemo) {
  //   const hasBalance = await checkBalance(clinicId, TOKEN_COSTS.ASSISTANT_LEARN);
  //   if (!hasBalance) {
  //     return NextResponse.json({ error: "Token bakiyeniz yetersiz." }, { status: 402 });
  //   }
  // }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }

  if (!file.name.endsWith(".txt")) {
    return NextResponse.json({ error: "Sadece .txt dosyası desteklenir" }, { status: 400 });
  }

  try {
    const text = await file.text();
    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Dosya çok kısa veya boş" }, { status: 400 });
    }

    const result = await processWhatsAppExport(clinicId, text);

    // TOKEN_SYSTEM_DISABLED
    // if (!isDemo) {
    //   await deductTokens(clinicId, "ASSISTANT_LEARN", TOKEN_COSTS.ASSISTANT_LEARN, "WhatsApp geçmişi öğrenme");
    // }

    return NextResponse.json({
      success: true,
      conversationCount: result.conversationCount,
      chunksAdded: result.chunksAdded,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp export işleme başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
