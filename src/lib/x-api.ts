import crypto from "crypto";

const API_KEY = () => process.env.TWITTER_API_KEY!;
const API_SECRET = () => process.env.TWITTER_API_SECRET!;
const ACCESS_TOKEN = () => process.env.TWITTER_ACCESS_TOKEN!;
const ACCESS_SECRET = () => process.env.TWITTER_ACCESS_TOKEN_SECRET!;

function oauthSign(method: string, baseUrl: string, extraParams: Record<string, string> = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY(),
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: ACCESS_TOKEN(),
    oauth_version: "1.0",
  };

  const allParams = { ...oauthParams, ...extraParams };
  const paramString = Object.keys(allParams).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const baseString = `${method}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(API_SECRET())}&${encodeURIComponent(ACCESS_SECRET())}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  return `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ")}`;
}

// Look up a user by username
export async function lookupUser(username: string): Promise<{ id: string; name: string; username: string } | null> {
  const clean = username.replace(/^@/, "").trim();
  const baseUrl = `https://api.twitter.com/2/users/by/username/${clean}`;
  const auth = oauthSign("GET", baseUrl);
  const res = await fetch(baseUrl, { headers: { Authorization: auth } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data || null;
}

// Get recent tweets from a user
export async function getUserTweets(userId: string, maxResults = 10): Promise<Array<{
  id: string; text: string; created_at: string;
  public_metrics: { retweet_count: number; reply_count: number; like_count: number; impression_count: number };
}>> {
  const baseUrl = `https://api.twitter.com/2/users/${userId}/tweets`;
  const queryParams: Record<string, string> = {
    max_results: String(maxResults),
    "tweet.fields": "created_at,public_metrics",
    exclude: "retweets,replies",
  };
  const auth = oauthSign("GET", baseUrl, queryParams);
  const qs = Object.entries(queryParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const res = await fetch(`${baseUrl}?${qs}`, { headers: { Authorization: auth } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

// Search recent tweets
export async function searchTweets(query: string, maxResults = 10): Promise<Array<{
  id: string; text: string; author_id: string; created_at: string;
  public_metrics: { retweet_count: number; reply_count: number; like_count: number; impression_count: number };
}>> {
  const baseUrl = "https://api.twitter.com/2/tweets/search/recent";
  const queryParams: Record<string, string> = {
    query,
    max_results: String(maxResults),
    "tweet.fields": "created_at,public_metrics,author_id",
  };
  const auth = oauthSign("GET", baseUrl, queryParams);
  const qs = Object.entries(queryParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const res = await fetch(`${baseUrl}?${qs}`, { headers: { Authorization: auth } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

// Post a reply to a tweet
export async function postReply(text: string, replyToTweetId: string): Promise<{ id: string } | null> {
  const baseUrl = "https://api.twitter.com/2/tweets";
  const auth = oauthSign("POST", baseUrl);
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: replyToTweetId },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Reply gönderme hatası (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.data || null;
}
