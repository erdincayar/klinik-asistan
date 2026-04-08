import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — publish content to X (Twitter)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    const clinicId = (session.user as any).clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Post ID gerekli" }, { status: 400 });

    const post = await prisma.scheduledPost.findFirst({
      where: { id, clinicId },
    });
    if (!post) return NextResponse.json({ error: "İçerik bulunamadı" }, { status: 404 });

    if (post.platform !== "twitter") {
      return NextResponse.json({ error: "Şu anda sadece X (Twitter) destekleniyor" }, { status: 400 });
    }

    // Check for X API keys
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!apiKey || !accessToken) {
      return NextResponse.json({ error: "X API anahtarları ayarlanmamış. .env dosyasını kontrol edin." }, { status: 500 });
    }

    // Twitter OAuth 1.0a — create tweet
    const crypto = await import("crypto");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString("hex");

    const tweetText = post.content || "";

    // Build OAuth signature
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

    // Handle thread or single tweet
    const isThread = post.type === "thread" && post.threadContent;
    let tweets: string[] = [];

    if (isThread) {
      try { tweets = JSON.parse(post.threadContent!); } catch { tweets = [tweetText]; }
    } else {
      tweets = [tweetText];
    }

    // Upload media if imageUrl exists
    let mediaId: string | null = null;
    if (post.imageUrl) {
      const imageFullUrl = post.imageUrl.startsWith("http") ? post.imageUrl : `${process.env.NEXTAUTH_URL || "https://poby.ai"}${post.imageUrl}`;
      mediaId = await uploadMediaToTwitter(imageFullUrl, apiKey, apiSecret!, accessToken, accessSecret!);
    }

    let lastTweetId: string | null = null;
    let firstTweetId: string | null = null;

    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      const tweetBody: any = { text: tweet };
      if (lastTweetId) {
        tweetBody.reply = { in_reply_to_tweet_id: lastTweetId };
      }
      // Attach media to first tweet only
      if (i === 0 && mediaId) {
        tweetBody.media = { media_ids: [mediaId] };
      }

      // Generate fresh OAuth signature for each tweet
      const ts = Math.floor(Date.now() / 1000).toString();
      const nc = crypto.randomBytes(16).toString("hex");
      const p2: Record<string, string> = {
        oauth_consumer_key: apiKey,
        oauth_nonce: nc,
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: ts,
        oauth_token: accessToken,
        oauth_version: "1.0",
      };
      const ps2 = Object.keys(p2).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(p2[k])}`).join("&");
      const bs2 = `POST&${encodeURIComponent("https://api.twitter.com/2/tweets")}&${encodeURIComponent(ps2)}`;
      const sk2 = `${encodeURIComponent(apiSecret!)}&${encodeURIComponent(accessSecret!)}`;
      const sig2 = crypto.createHmac("sha1", sk2).update(bs2).digest("base64");
      const ah2 = `OAuth ${Object.entries({ ...p2, oauth_signature: sig2 }).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(", ")}`;

      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: ah2,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tweetBody),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        await prisma.scheduledPost.update({
          where: { id },
          data: { status: "FAILED", errorMessage: JSON.stringify(err).slice(0, 500) },
        });
        return NextResponse.json({ error: "Tweet gönderilemedi", details: err }, { status: 500 });
      }

      const data = await res.json();
      lastTweetId = data.data?.id;
      if (!firstTweetId) firstTweetId = lastTweetId;
    }

    // Mark as posted
    await prisma.scheduledPost.update({
      where: { id },
      data: {
        status: "POSTED",
        postedAt: new Date(),
        externalPostId: firstTweetId,
      },
    });

    return NextResponse.json({ success: true, tweetId: firstTweetId });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json({ error: "Yayınlama hatası" }, { status: 500 });
  }
}

async function uploadMediaToTwitter(
  imageUrl: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessSecret: string,
): Promise<string | null> {
  try {
    const crypto = await import("crypto");
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString("base64");

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

    if (!res.ok) return null;
    const data = await res.json();
    return data.media_id_string || null;
  } catch {
    return null;
  }
}
