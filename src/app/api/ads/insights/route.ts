import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignInsights } from "@/lib/meta-ads";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since") || "";
    const until = searchParams.get("until") || "";

    if (!since || !until) {
      return NextResponse.json({ error: "Tarih aralığı gerekli" }, { status: 400 });
    }

    const insights = await getCampaignInsights(clinicId, { since, until });
    return NextResponse.json(insights);
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ error: "Veri hatası" }, { status: 500 });
  }
}
