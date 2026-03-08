import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

const GRAPH_API = "https://graph.facebook.com/v19.0";

interface MetaConfig {
  appId: string;
  accessToken: string;
  adAccountId: string;
}

function sanitizeErrorMessage(message: string): string {
  return message.replace(/access_token=[^&\s]+/gi, "access_token=[REDACTED]");
}

async function handleOAuthError(clinicId: string, errorData: any): Promise<void> {
  if (errorData?.type === "OAuthException" || errorData?.code === 190) {
    await prisma.clinic.update({
      where: { id: clinicId },
      data: { metaConnected: false },
    });
  }
}

export async function getClinicMetaConfig(clinicId: string): Promise<MetaConfig | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { metaAppId: true, metaAccessToken: true, metaAdAccountId: true, metaConnected: true },
  });

  if (!clinic?.metaConnected || !clinic.metaAccessToken || !clinic.metaAdAccountId || !clinic.metaAppId) {
    return null;
  }

  try {
    const accessToken = decrypt(clinic.metaAccessToken);
    return {
      appId: clinic.metaAppId,
      accessToken,
      adAccountId: clinic.metaAdAccountId,
    };
  } catch {
    return null;
  }
}

async function graphGet(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`${GRAPH_API}${path}`);
  url.searchParams.set("access_token", token);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString());
  return res.json();
}

async function graphPost(path: string, token: string, body: Record<string, any>) {
  const url = new URL(`${GRAPH_API}${path}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function testConnection(clinicId: string): Promise<{ success: boolean; name?: string; error?: string }> {
  const config = await getClinicMetaConfig(clinicId);
  if (!config) return { success: false, error: "Meta bağlantısı bulunamadı" };

  try {
    const data = await graphGet(`/${config.adAccountId}`, config.accessToken, {
      fields: "name,account_status",
    });
    if (data.error) {
      await handleOAuthError(clinicId, data.error);
      return { success: false, error: sanitizeErrorMessage(data.error.message) };
    }
    return { success: true, name: data.name };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Bağlantı hatası" };
  }
}

export async function getCampaigns(clinicId: string) {
  const config = await getClinicMetaConfig(clinicId);
  if (!config) throw new Error("Meta bağlantısı bulunamadı");

  const data = await graphGet(`/${config.adAccountId}/campaigns`, config.accessToken, {
    fields: "id,name,status,objective,daily_budget,start_time,stop_time,insights{impressions,clicks,spend,ctr,cpc}",
    limit: "100",
  });
  if (data.error) {
    await handleOAuthError(clinicId, data.error);
    throw new Error(sanitizeErrorMessage(data.error.message || "Meta API hatası"));
  }
  return data.data || [];
}

export async function getCampaignInsights(clinicId: string, dateRange: { since: string; until: string }) {
  const config = await getClinicMetaConfig(clinicId);
  if (!config) throw new Error("Meta bağlantısı bulunamadı");

  const data = await graphGet(`/${config.adAccountId}/insights`, config.accessToken, {
    fields: "campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,cpm,date_start,date_stop",
    time_range: JSON.stringify(dateRange),
    time_increment: "1",
    level: "campaign",
    limit: "500",
  });
  if (data.error) {
    await handleOAuthError(clinicId, data.error);
    throw new Error(sanitizeErrorMessage(data.error.message || "Meta API hatası"));
  }
  return data.data || [];
}

export async function createCampaign(clinicId: string, data: {
  name: string;
  objective: string;
  status: string;
  dailyBudget: number;
  startDate: string;
  endDate?: string;
}) {
  const config = await getClinicMetaConfig(clinicId);
  if (!config) throw new Error("Meta bağlantısı yok");

  const objectiveMap: Record<string, string> = {
    TRAFFIC: "OUTCOME_TRAFFIC",
    LEADS: "OUTCOME_LEADS",
    MESSAGES: "OUTCOME_ENGAGEMENT",
    AWARENESS: "OUTCOME_AWARENESS",
  };

  const result = await graphPost(`/${config.adAccountId}/campaigns`, config.accessToken, {
    name: data.name,
    objective: objectiveMap[data.objective] || "OUTCOME_TRAFFIC",
    status: data.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
    special_ad_categories: [],
  });

  if (result.error) {
    await handleOAuthError(clinicId, result.error);
    throw new Error(sanitizeErrorMessage(result.error.message));
  }
  return result;
}

export async function createAdSet(clinicId: string, campaignId: string, data: {
  name: string;
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  targetCity?: string;
  targetAgeMin: number;
  targetAgeMax: number;
  targetGender: string;
  interests?: string;
  platforms: string;
}) {
  const config = await getClinicMetaConfig(clinicId);
  if (!config) throw new Error("Meta bağlantısı yok");

  const targeting: any = {
    age_min: data.targetAgeMin,
    age_max: data.targetAgeMax,
  };

  if (data.targetGender !== "ALL") {
    targeting.genders = data.targetGender === "MALE" ? [1] : [2];
  }

  if (data.targetCity) {
    targeting.geo_locations = {
      cities: [{ key: data.targetCity }],
    };
  } else {
    targeting.geo_locations = { countries: ["TR"] };
  }

  if (data.interests) {
    const interestList = data.interests.split(",").map((i) => ({ name: i.trim() }));
    targeting.flexible_spec = [{ interests: interestList }];
  }

  const publisherPlatforms = data.platforms === "FACEBOOK" ? ["facebook"] : data.platforms === "INSTAGRAM" ? ["instagram"] : ["facebook", "instagram"];

  const result = await graphPost(`/${config.adAccountId}/adsets`, config.accessToken, {
    name: data.name,
    campaign_id: campaignId,
    daily_budget: Math.round(data.dailyBudget * 100),
    billing_event: "IMPRESSIONS",
    optimization_goal: "REACH",
    start_time: data.startDate,
    ...(data.endDate && { end_time: data.endDate }),
    targeting,
    publisher_platforms: publisherPlatforms,
    status: "PAUSED",
  });

  if (result.error) {
    await handleOAuthError(clinicId, result.error);
    throw new Error(sanitizeErrorMessage(result.error.message));
  }
  return result;
}

export async function createAd(clinicId: string, adSetId: string, data: {
  name: string;
  headline?: string;
  description?: string;
  imageHash?: string;
  ctaType?: string;
  websiteUrl?: string;
}) {
  const config = await getClinicMetaConfig(clinicId);
  if (!config) throw new Error("Meta bağlantısı yok");

  const creative: any = {
    name: data.name,
    object_story_spec: {
      link_data: {
        message: data.description || "",
        name: data.headline || "",
        link: data.websiteUrl || "https://poby.ai",
        call_to_action: { type: data.ctaType || "LEARN_MORE" },
        ...(data.imageHash && { image_hash: data.imageHash }),
      },
    },
  };

  const creativeResult = await graphPost(`/${config.adAccountId}/adcreatives`, config.accessToken, creative);
  if (creativeResult.error) {
    await handleOAuthError(clinicId, creativeResult.error);
    throw new Error(sanitizeErrorMessage(creativeResult.error.message));
  }

  const result = await graphPost(`/${config.adAccountId}/ads`, config.accessToken, {
    name: data.name,
    adset_id: adSetId,
    creative: { creative_id: creativeResult.id },
    status: "PAUSED",
  });

  if (result.error) {
    await handleOAuthError(clinicId, result.error);
    throw new Error(sanitizeErrorMessage(result.error.message));
  }
  return result;
}

export async function updateCampaignStatus(clinicId: string, campaignId: string, status: string) {
  const config = await getClinicMetaConfig(clinicId);
  if (!config) throw new Error("Meta bağlantısı yok");

  const url = new URL(`${GRAPH_API}/${campaignId}`);
  url.searchParams.set("access_token", config.accessToken);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const result = await res.json();
  if (result.error) {
    await handleOAuthError(clinicId, result.error);
    throw new Error(sanitizeErrorMessage(result.error.message));
  }
  return result;
}

export async function uploadImage(clinicId: string, imageBuffer: Buffer) {
  const config = await getClinicMetaConfig(clinicId);
  if (!config) throw new Error("Meta bağlantısı yok");

  const formData = new FormData();
  formData.append("filename", new Blob([new Uint8Array(imageBuffer)]), "ad_image.jpg");
  formData.append("access_token", config.accessToken);

  const res = await fetch(`${GRAPH_API}/${config.adAccountId}/adimages`, {
    method: "POST",
    body: formData,
  });
  const result = await res.json();
  if (result.error) {
    await handleOAuthError(clinicId, result.error);
    throw new Error(sanitizeErrorMessage(result.error.message));
  }
  return result;
}
