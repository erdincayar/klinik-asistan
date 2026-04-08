import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function POST(req: Request) {
  try {
    // Auth: cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}` || !CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find approved posts that are due (scheduledAt <= now)
    const now = new Date();
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        status: "APPROVED",
        platform: "twitter",
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5, // Max 5 per run to avoid rate limits
    });

    if (duePosts.length === 0) {
      return NextResponse.json({ success: true, published: 0, message: "Yayınlanacak içerik yok" });
    }

    const crypto = await import("crypto");
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.error("Twitter API keys missing:", {
        TWITTER_API_KEY: !!apiKey,
        TWITTER_API_SECRET: !!apiSecret,
        TWITTER_ACCESS_TOKEN: !!accessToken,
        TWITTER_ACCESS_TOKEN_SECRET: !!accessSecret,
      });
      return NextResponse.json({ error: "X API anahtarları ayarlanmamış" }, { status: 500 });
    }

    let published = 0;

    for (const post of duePosts) {
      try {
        const isThread = post.type === "thread" && post.threadContent;
        let tweets: string[] = [];

        if (isThread) {
          try { tweets = JSON.parse(post.threadContent!); } catch { tweets = [post.content || ""]; }
        } else {
          tweets = [post.content || ""];
        }

        let lastTweetId: string | null = null;
        let firstTweetId: string | null = null;

        for (const tweet of tweets) {
          // Build OAuth 1.0a signature for each tweet
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const nonce = crypto.randomBytes(16).toString("hex");

          const params: Record<string, string> = {
            oauth_consumer_key: apiKey,
            oauth_nonce: nonce,
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: timestamp,
            oauth_token: accessToken,
            oauth_version: "1.0",
          };

          const paramString = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
          const baseString = `POST&${encodeURIComponent("https://api.twitter.com/2/tweets")}&${encodeURIComponent(paramString)}`;
          const signingKey = `${encodeURIComponent(apiSecret!)}&${encodeURIComponent(accessSecret!)}`;
          const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

          const authHeader = `OAuth ${Object.entries({ ...params, oauth_signature: signature }).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(", ")}`;

          const tweetBody: any = { text: tweet };
          if (lastTweetId) {
            tweetBody.reply = { in_reply_to_tweet_id: lastTweetId };
          }

          // Upload media if imageUrl exists (only for first tweet)
          let mediaId: string | null = null;
          if (!lastTweetId && post.imageUrl) {
            mediaId = await uploadMedia(post.imageUrl, apiKey, apiSecret!, accessToken, accessSecret!, crypto);
            if (mediaId) {
              tweetBody.media = { media_ids: [mediaId] };
            }
          }

          const res = await fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tweetBody),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            let err: any = {};
            try { err = JSON.parse(errText); } catch { err = { raw: errText }; }
            console.error(`Twitter auto-publish error [${res.status}] for post ${post.id}:`, JSON.stringify(err, null, 2));
            await prisma.scheduledPost.update({
              where: { id: post.id },
              data: { status: "FAILED", errorMessage: `HTTP ${res.status}: ${JSON.stringify(err).slice(0, 480)}` },
            });
            break;
          }

          const data = await res.json();
          lastTweetId = data.data?.id;
          if (!firstTweetId) firstTweetId = lastTweetId;

          // Small delay between thread tweets
          if (isThread) await new Promise(r => setTimeout(r, 1000));
        }

        if (firstTweetId) {
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: {
              status: "POSTED",
              postedAt: new Date(),
              externalPostId: firstTweetId,
            },
          });
          published++;
        }
      } catch (err) {
        console.error(`Auto-publish error for post ${post.id}:`, err);
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: "FAILED", errorMessage: String(err).slice(0, 500) },
        });
      }
    }

    return NextResponse.json({ success: true, published, total: duePosts.length });
  } catch (error) {
    console.error("Auto-publish error:", error);
    return NextResponse.json({ error: "Otomatik yayınlama hatası" }, { status: 500 });
  }
}

// Upload media to Twitter (v1.1 media upload)
async function uploadMedia(
  imageUrl: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessSecret: string,
  crypto: typeof import("crypto")
): Promise<string | null> {
  try {
    // Fetch image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/png";

    // Build OAuth for media upload (v1.1)
    const mediaUrl = "https://upload.twitter.com/1.1/media/upload.json";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString("hex");

    const params: Record<string, string> = {
      oauth_consumer_key: apiKey,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_token: accessToken,
      oauth_version: "1.0",
    };

    const paramString = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
    const baseString = `POST&${encodeURIComponent(mediaUrl)}&${encodeURIComponent(paramString)}`;
    const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
    const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

    const authHeaderStr = `OAuth ${Object.entries({ ...params, oauth_signature: signature }).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(", ")}`;

    const formData = new FormData();
    formData.append("media_data", base64);

    const res = await fetch(mediaUrl, {
      method: "POST",
      headers: { Authorization: authHeaderStr },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Twitter media upload error [${res.status}]:`, errText);
      return null;
    }

    const data = await res.json();
    return data.media_id_string || null;
  } catch (err) {
    console.error("Twitter media upload exception:", err);
    return null;
  }
}
