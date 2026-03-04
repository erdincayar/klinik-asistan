import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClinicMetaConfig } from "@/lib/meta-ads";

const GRAPH_API = "https://graph.facebook.com/v19.0";

async function fetchAllPages(url: string): Promise<any[]> {
  const results: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl);
    const data: any = await res.json();
    if (data.error) throw new Error(data.error.message || "Meta API hatası");
    if (data.data) results.push(...data.data);
    nextUrl = data.paging?.next || null;
  }

  return results;
}

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

    const config = await getClinicMetaConfig(clinicId);
    if (!config) {
      return NextResponse.json({ connected: false, campaigns: [] });
    }

    const datePreset = req.nextUrl.searchParams.get("date_preset") || "maximum";
    const withTrend = req.nextUrl.searchParams.get("trend") === "1";

    // 1. Fetch all campaigns with pagination
    const campaignsUrl = new URL(`${GRAPH_API}/${config.adAccountId}/campaigns`);
    campaignsUrl.searchParams.set("fields", "name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time");
    campaignsUrl.searchParams.set("access_token", config.accessToken);
    campaignsUrl.searchParams.set("limit", "100");

    let allCampaigns: any[];
    try {
      allCampaigns = await fetchAllPages(campaignsUrl.toString());
    } catch (err) {
      return NextResponse.json({
        connected: true,
        campaigns: [],
        error: err instanceof Error ? err.message : "Meta API hatası",
      });
    }

    // 2. Fetch campaign-level insights
    const insightsUrl = new URL(`${GRAPH_API}/${config.adAccountId}/insights`);
    insightsUrl.searchParams.set("fields", "campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,actions");
    insightsUrl.searchParams.set("level", "campaign");
    insightsUrl.searchParams.set("date_preset", datePreset);
    insightsUrl.searchParams.set("limit", "500");
    insightsUrl.searchParams.set("access_token", config.accessToken);

    // 3. Fetch account-level insights
    const accountUrl = new URL(`${GRAPH_API}/${config.adAccountId}/insights`);
    accountUrl.searchParams.set("fields", "impressions,clicks,spend,ctr,cpc,actions");
    accountUrl.searchParams.set("date_preset", datePreset);
    accountUrl.searchParams.set("access_token", config.accessToken);

    // 4. Optionally fetch daily trend
    let trendUrl: URL | null = null;
    if (withTrend) {
      trendUrl = new URL(`${GRAPH_API}/${config.adAccountId}/insights`);
      trendUrl.searchParams.set("fields", "impressions,clicks,spend,ctr,cpc");
      trendUrl.searchParams.set("time_increment", "1");
      trendUrl.searchParams.set("date_preset", datePreset === "maximum" ? "last_90d" : datePreset);
      trendUrl.searchParams.set("limit", "500");
      trendUrl.searchParams.set("access_token", config.accessToken);
    }

    const fetches: Promise<Response>[] = [
      fetch(insightsUrl.toString()),
      fetch(accountUrl.toString()),
    ];
    if (trendUrl) fetches.push(fetch(trendUrl.toString()));

    const responses = await Promise.all(fetches);
    const [insightsData, accountData, trendData] = await Promise.all(
      responses.map((r) => r.json())
    );

    // Build insights map
    const insightsMap = new Map<string, any>();
    if (insightsData.data) {
      for (const row of insightsData.data) {
        insightsMap.set(row.campaign_id, row);
      }
    }

    // Merge campaigns with insights
    const campaigns = allCampaigns.map((camp: any) => {
      const insight = insightsMap.get(camp.id);
      const actions = insight?.actions || [];
      const conversions = actions.find(
        (a: any) => a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead" || a.action_type === "onsite_conversion.messaging_first_reply"
      )?.value || "0";

      return {
        campaignId: camp.id,
        campaignName: camp.name || "",
        status: camp.status || "UNKNOWN",
        objective: camp.objective || "",
        dailyBudget: camp.daily_budget ? parseInt(camp.daily_budget) / 100 : 0,
        lifetimeBudget: camp.lifetime_budget ? parseInt(camp.lifetime_budget) / 100 : 0,
        startTime: camp.start_time || null,
        stopTime: camp.stop_time || null,
        createdTime: camp.created_time || null,
        impressions: parseInt(insight?.impressions || "0") || 0,
        clicks: parseInt(insight?.clicks || "0") || 0,
        spend: parseFloat(insight?.spend || "0") || 0,
        conversions: parseInt(conversions) || 0,
        cpc: parseFloat(insight?.cpc || "0") || 0,
        ctr: parseFloat(insight?.ctr || "0") || 0,
        cpm: parseInt(insight?.impressions || "0") > 0
          ? (parseFloat(insight?.spend || "0") / parseInt(insight.impressions)) * 1000
          : 0,
      };
    });

    // Account summary
    const acct = accountData.data?.[0];
    const accountSummary = acct
      ? {
          impressions: parseInt(acct.impressions || "0") || 0,
          clicks: parseInt(acct.clicks || "0") || 0,
          spend: parseFloat(acct.spend || "0") || 0,
          ctr: parseFloat(acct.ctr || "0") || 0,
          cpc: parseFloat(acct.cpc || "0") || 0,
        }
      : null;

    // Trend data
    const trend = (trendData?.data || []).map((d: any) => ({
      date: d.date_start || "",
      impressions: parseInt(d.impressions || "0") || 0,
      clicks: parseInt(d.clicks || "0") || 0,
      spend: parseFloat(d.spend || "0") || 0,
      ctr: parseFloat(d.ctr || "0") || 0,
      cpc: parseFloat(d.cpc || "0") || 0,
    }));

    return NextResponse.json({
      connected: true,
      campaigns,
      accountSummary,
      trend: withTrend ? trend : undefined,
    });
  } catch (error) {
    console.error("Campaigns error:", error);
    return NextResponse.json({ error: "Kampanyalar alınamadı" }, { status: 500 });
  }
}
