import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaytrCallback, SUBSCRIPTION_PLANS, TOKEN_PACKAGES, STORAGE_PACKAGES } from "@/lib/paytr";
import { addTokens } from "@/lib/token-service";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const merchantOid = formData.get("merchant_oid") as string;
    const status = formData.get("status") as string;
    const totalAmount = formData.get("total_amount") as string;
    const hash = formData.get("hash") as string;

    if (!merchantOid || !status || !totalAmount || !hash) {
      return new Response("OK");
    }

    // Hash doğrula
    if (!verifyPaytrCallback(merchantOid, status, totalAmount, hash)) {
      console.error("PayTR callback: hash doğrulama başarısız", { merchantOid });
      return new Response("OK");
    }

    // Payment kaydını bul
    const payment = await prisma.subscriptionPayment.findFirst({
      where: { paytrOrderId: merchantOid },
      include: { subscription: true },
    });

    if (!payment) {
      console.error("PayTR callback: payment bulunamadı", { merchantOid });
      return new Response("OK");
    }

    // Zaten işlenmiş mi?
    if (payment.status !== "PENDING") {
      return new Response("OK");
    }

    const clinicId = payment.subscription.clinicId;

    if (status === "success") {
      // Ödeme başarılı
      await prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", paidAt: new Date() },
      });

      switch (payment.paymentType) {
        case "SUBSCRIPTION": {
          const plan = SUBSCRIPTION_PLANS[payment.packageId as keyof typeof SUBSCRIPTION_PLANS];
          if (plan) {
            const now = new Date();
            const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            await prisma.subscription.update({
              where: { id: payment.subscriptionId },
              data: {
                plan: plan.id,
                price: plan.price,
                status: "ACTIVE",
                isActive: true,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                expiresAt: periodEnd,
              },
            });

            await prisma.clinic.update({
              where: { id: clinicId },
              data: {
                plan: plan.id,
                storageLimitMB: plan.storageMB,
              },
            });

            // Abonelik token hediyesi
            await addTokens(clinicId, plan.tokens, `${plan.name} abonelik planı token hediyesi`);
          }
          break;
        }

        case "TOKEN_PACKAGE": {
          const pkg = TOKEN_PACKAGES[payment.packageId as keyof typeof TOKEN_PACKAGES];
          if (pkg) {
            await addTokens(clinicId, pkg.tokens, `${pkg.name} paketi satın alındı`);
          }
          break;
        }

        case "STORAGE_PACKAGE": {
          const pkg = STORAGE_PACKAGES[payment.packageId as keyof typeof STORAGE_PACKAGES];
          if (pkg) {
            await prisma.clinic.update({
              where: { id: clinicId },
              data: { storageLimitMB: { increment: pkg.sizeMB } },
            });
          }
          break;
        }
      }
    } else {
      // Ödeme başarısız
      await prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }

    return new Response("OK");
  } catch (error) {
    console.error("PayTR callback error:", error);
    return new Response("OK");
  }
}
