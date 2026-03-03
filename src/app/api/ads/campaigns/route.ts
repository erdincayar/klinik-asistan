import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCampaigns, createCampaign, createAdSet, createAd } from "@/lib/meta-ads";

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

    // Get campaigns from Meta API
    const metaCampaigns = await getCampaigns(clinicId);

    // Also get local campaigns
    const localCampaigns = await prisma.adCampaign.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ metaCampaigns, localCampaigns });
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

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: "Kampanya oluşturma hatası" }, { status: 500 });
  }
}
