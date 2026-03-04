import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClinicMetaConfig } from "@/lib/meta-ads";

const GRAPH_API = "https://graph.facebook.com/v19.0";

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

    const config = await getClinicMetaConfig(clinicId);
    if (!config) {
      return NextResponse.json({ connected: false, campaigns: [] });
    }

    // Fetch campaigns
    const campaignsUrl = new URL(`${GRAPH_API}/${config.adAccountId}/campaigns`);
    campaignsUrl.searchParams.set("fields", "name,status,daily_budget,lifetime_budget,objective");
    campaignsUrl.searchParams.set("access_token", config.accessToken);
    campaignsUrl.searchParams.set("limit", "100");

    // Fetch account-level insights (last 30 days)
    const accountInsightsUrl = new URL(`${GRAPH_API}/${config.adAccountId}/insights`);
    accountInsightsUrl.searchParams.set("fields", "impressions,clicks,ctr,cpc,spend,actions");
    accountInsightsUrl.searchParams.set("date_preset", "last_30d");
    accountInsightsUrl.searchParams.set("access_token", config.accessToken);

    // Fetch campaign-level insights (last 30 days)
    const campaignInsightsUrl = new URL(`${GRAPH_API}/${config.adAccountId}/insights`);
    campaignInsightsUrl.searchParams.set("fields", "campaign_name,campaign_id,impressions,clicks,ctr,cpc,spend,actions");
    campaignInsightsUrl.searchParams.set("level", "campaign");
    campaignInsightsUrl.searchParams.set("date_preset", "last_30d");
    campaignInsightsUrl.searchParams.set("limit", "100");
    campaignInsightsUrl.searchParams.set("access_token", config.accessToken);

    const [campaignsRes, accountInsightsRes, campaignInsightsRes] = await Promise.all([
      fetch(campaignsUrl.toString()),
      fetch(accountInsightsUrl.toString()),
      fetch(campaignInsightsUrl.toString()),
    ]);

    const [campaignsData, accountInsightsData, campaignInsightsData] = await Promise.all([
      campaignsRes.json(),
      accountInsightsRes.json(),
      campaignInsightsRes.json(),
    ]);

    if (campaignsData.error) {
      return NextResponse.json({
        connected: true,
        campaigns: [],
        error: campaignsData.error.message || "Meta API hatası",
      });
    }

    // Build campaign insights map
    const insightsMap = new Map<string, any>();
    if (campaignInsightsData.data) {
      for (const insight of campaignInsightsData.data) {
        insightsMap.set(insight.campaign_id, insight);
      }
    }

    // Merge campaigns with their insights
    const campaigns = (campaignsData.data || []).map((camp: any) => {
      const insight = insightsMap.get(camp.id);
      const conversions = insight?.actions?.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_lead" || a.action_type === "lead")?.value || 0;

      return {
        campaignId: camp.id,
        campaignName: camp.name,
        status: camp.status,
        objective: camp.objective,
        dailyBudget: camp.daily_budget ? parseInt(camp.daily_budget) / 100 : 0,
        lifetimeBudget: camp.lifetime_budget ? parseInt(camp.lifetime_budget) / 100 : 0,
        impressions: insight ? parseInt(insight.impressions || "0") : 0,
        clicks: insight ? parseInt(insight.clicks || "0") : 0,
        spend: insight ? parseFloat(insight.spend || "0") : 0,
        conversions: parseInt(conversions) || 0,
        cpc: insight ? parseFloat(insight.cpc || "0") : 0,
        cpm: insight?.impressions > 0
          ? (parseFloat(insight.spend || "0") / parseInt(insight.impressions)) * 1000
          : 0,
        ctr: insight ? parseFloat(insight.ctr || "0") : 0,
      };
    });

    // Account-level summary
    const accountSummary = accountInsightsData.data?.[0] || null;

    return NextResponse.json({
      connected: true,
      campaigns,
      accountSummary: accountSummary ? {
        impressions: parseInt(accountSummary.impressions || "0"),
        clicks: parseInt(accountSummary.clicks || "0"),
        spend: parseFloat(accountSummary.spend || "0"),
        ctr: parseFloat(accountSummary.ctr || "0"),
        cpc: parseFloat(accountSummary.cpc || "0"),
      } : null,
    });
  } catch (error) {
    console.error("Campaigns error:", error);
    return NextResponse.json({ error: "Kampanyalar alınamadı" }, { status: 500 });
  }
}
