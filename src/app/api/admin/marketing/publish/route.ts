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

    let lastTweetId: string | null = null;
    let firstTweetId: string | null = null;

    for (const tweet of tweets) {
      const tweetBody: any = { text: tweet };
      if (lastTweetId) {
        tweetBody.reply = { in_reply_to_tweet_id: lastTweetId };
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
