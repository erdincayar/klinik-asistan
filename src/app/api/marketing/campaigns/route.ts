import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    // Check if connected
    const connection = await prisma.metaAdsConnection.findUnique({
      where: { clinicId },
    });

    if (!connection) {
      return NextResponse.json({ connected: false, campaigns: [] });
    }

    // Get stored metrics
    const metrics = await prisma.adCampaignMetric.findMany({
      where: { clinicId },
      orderBy: { date: "desc" },
    });

    if (metrics.length === 0) {
      // Return mock data for demo
      const mockCampaigns = [
        {
          id: "mock_1",
          campaignId: "camp_001",
          campaignName: "Botoks Kampanyası",
          date: new Date().toISOString(),
          impressions: 12500,
          clicks: 380,
          spend: 450.50,
          conversions: 12,
          cpc: 1.19,
          cpm: 36.04,
          ctr: 3.04,
        },
        {
          id: "mock_2",
          campaignId: "camp_002",
          campaignName: "Dolgu Tanıtım",
          date: new Date().toISOString(),
          impressions: 8900,
          clicks: 245,
          spend: 320.00,
          conversions: 8,
          cpc: 1.31,
          cpm: 35.96,
          ctr: 2.75,
        },
        {
          id: "mock_3",
          campaignId: "camp_003",
          campaignName: "Genel Marka Bilinirliği",
          date: new Date().toISOString(),
          impressions: 25000,
          clicks: 520,
          spend: 680.00,
          conversions: 15,
          cpc: 1.31,
          cpm: 27.20,
          ctr: 2.08,
        },
      ];

      return NextResponse.json({
        connected: true,
        campaigns: mockCampaigns,
        isDemo: true,
      });
    }

    // Aggregate campaigns
    const campaignMap = new Map<string, {
      campaignId: string;
      campaignName: string;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      days: number;
    }>();

    for (const m of metrics) {
      const existing = campaignMap.get(m.campaignId);
      if (existing) {
        existing.impressions += m.impressions;
        existing.clicks += m.clicks;
        existing.spend += m.spend;
        existing.conversions += m.conversions;
        existing.days++;
      } else {
        campaignMap.set(m.campaignId, {
          campaignId: m.campaignId,
          campaignName: m.campaignName,
          impressions: m.impressions,
          clicks: m.clicks,
          spend: m.spend,
          conversions: m.conversions,
          days: 1,
        });
      }
    }

    const campaigns = Array.from(campaignMap.values()).map((c) => ({
      ...c,
      cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    }));

    return NextResponse.json({ connected: true, campaigns, isDemo: false });
  } catch (error) {
    console.error("Campaigns error:", error);
    return NextResponse.json({ error: "Kampanyalar alınamadı" }, { status: 500 });
  }
}
