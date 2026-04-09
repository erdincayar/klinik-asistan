import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require("web-push");

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:info@poby.ai";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: NextRequest) {
  try {
    // Auth: admin or cron
    const authHeader = req.headers.get("authorization");
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET;

    if (!isCron) {
      const session = await auth();
      if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const role = (session.user as any).role;
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
      }
    }

    const { title, body, url, userId, clinicId } = await req.json();
    if (!title || !body) return NextResponse.json({ error: "Title ve body gerekli" }, { status: 400 });

    // Find subscriptions
    const where: any = {};
    if (userId) where.userId = userId;
    else if (clinicId) where.clinicId = clinicId;

    const subscriptions = await prisma.pushSubscription.findMany({ where });

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "Abone bulunamadı" });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      url: url || "/dashboard",
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Push gönderim hatası" }, { status: 500 });
  }
}
