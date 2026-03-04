import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCampaigns, createCampaign, createAdSet, createAd } from "@/lib/meta-ads";
import { logActivity } from "@/lib/activity-logger";

const OBJECTIVE_REVERSE: Record<string, string> = {
  OUTCOME_TRAFFIC: "TRAFFIC",
  OUTCOME_LEADS: "LEADS",
  OUTCOME_ENGAGEMENT: "MESSAGES",
  OUTCOME_AWARENESS: "AWARENESS",
};

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    // Get local campaigns
    const localCampaigns = await prisma.adCampaign.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    // Try to get campaigns from Meta API
    let metaCampaigns: any[] = [];
    let metaError: string | null = null;

    try {
      metaCampaigns = await getCampaigns(clinicId);
    } catch (err) {
      metaError = err instanceof Error ? err.message : "Meta API hatası";
    }

    // Merge: update local campaigns with real Meta data
    const mergedIds = new Set<string>();
    const campaigns = localCampaigns.map((local) => {
      if (local.metaCampaignId) {
        const meta = metaCampaigns.find((m: any) => m.id === local.metaCampaignId);
        if (meta) {
          mergedIds.add(meta.id);
          const insight = meta.insights?.data?.[0];
          return {
            ...local,
            status: meta.status,
            impressions: insight ? parseInt(insight.impressions || "0") : undefined,
            clicks: insight ? parseInt(insight.clicks || "0") : undefined,
            spend: insight ? parseFloat(insight.spend || "0") : undefined,
            ctr: insight ? parseFloat(insight.ctr || "0") : undefined,
            cpc: insight ? parseFloat(insight.cpc || "0") : undefined,
          };
        }
      }
      return local;
    });

    // Add Meta campaigns not tracked locally
    for (const meta of metaCampaigns) {
      if (mergedIds.has(meta.id)) continue;
      const insight = meta.insights?.data?.[0];
      campaigns.push({
        id: meta.id,
        clinicId,
        metaCampaignId: meta.id,
        metaAdSetId: null,
        metaAdId: null,
        name: meta.name,
        objective: OBJECTIVE_REVERSE[meta.objective] || meta.objective || "",
        status: meta.status,
        dailyBudget: meta.daily_budget ? parseInt(meta.daily_budget) / 100 : 0,
        startDate: meta.start_time ? new Date(meta.start_time) : new Date(),
        endDate: meta.stop_time ? new Date(meta.stop_time) : null,
        targetCity: null,
        targetAgeMin: 18,
        targetAgeMax: 65,
        targetGender: "ALL",
        interests: null,
        platforms: "BOTH",
        imageUrl: null,
        headline: null,
        description: null,
        ctaType: null,
        websiteUrl: null,
        createdAt: meta.start_time ? new Date(meta.start_time) : new Date(),
        updatedAt: new Date(),
        impressions: insight ? parseInt(insight.impressions || "0") : undefined,
        clicks: insight ? parseInt(insight.clicks || "0") : undefined,
        spend: insight ? parseFloat(insight.spend || "0") : undefined,
        ctr: insight ? parseFloat(insight.ctr || "0") : undefined,
        cpc: insight ? parseFloat(insight.cpc || "0") : undefined,
      });
    }

    return NextResponse.json({ campaigns, metaError });
  } catch (error) {
    console.error("Get campaigns error:", error);
    return NextResponse.json({ error: "Kampanya hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const body = await req.json();
    const {
      name, objective, dailyBudget, startDate, endDate,
      targetCity, targetAgeMin, targetAgeMax, targetGender,
      interests, platforms, headline, description, ctaType, websiteUrl, imageUrl,
    } = body;

    if (!name || !objective || !dailyBudget || !startDate) {
      return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
    }

    // Create on Meta
    let metaCampaignId = null;
    let metaAdSetId = null;
    let metaAdId = null;

    try {
      const campaign = await createCampaign(clinicId, {
        name, objective, status: "PAUSED", dailyBudget, startDate, endDate,
      });
      metaCampaignId = campaign.id;

      const adSet = await createAdSet(clinicId, campaign.id, {
        name: `${name} - Ad Set`,
        dailyBudget, startDate, endDate,
        targetCity, targetAgeMin: targetAgeMin || 18, targetAgeMax: targetAgeMax || 65,
        targetGender: targetGender || "ALL",
        interests, platforms: platforms || "BOTH",
      });
      metaAdSetId = adSet.id;

      if (headline || description) {
        const ad = await createAd(clinicId, adSet.id, {
          name: `${name} - Ad`,
          headline, description, ctaType, websiteUrl,
        });
        metaAdId = ad.id;
      }
    } catch (metaError) {
      console.error("Meta API error:", metaError);
      // Continue — save locally even if Meta fails
    }

    // Save locally
    const campaign = await prisma.adCampaign.create({
      data: {
        clinicId,
        metaCampaignId,
        metaAdSetId,
        metaAdId,
        name,
        objective,
        status: "PAUSED",
        dailyBudget: parseFloat(dailyBudget),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        targetCity,
        targetAgeMin: targetAgeMin || 18,
        targetAgeMax: targetAgeMax || 65,
        targetGender: targetGender || "ALL",
        interests,
        platforms: platforms || "BOTH",
        imageUrl,
        headline,
        description,
        ctaType,
        websiteUrl,
      },
    });

    const userId = (session.user as any).id;
    logActivity({
      userId,
      clinicId,
      action: "CAMPAIGN_CREATE",
      details: { campaignName: name, objective },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: "Kampanya oluşturma hatası" }, { status: 500 });
  }
}
