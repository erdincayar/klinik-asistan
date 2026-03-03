"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Check,
  Crown,
  Zap,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Subscription {
  id: string;
  plan: string;
  price: number;
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

const PLANS = [
  {
    key: "STARTER",
    name: "Baslangic",
    price: 299,
    icon: Zap,
    features: [
      "100 musteri kaydi",
      "Temel randevu yonetimi",
      "Gelir-gider takibi",
      "1 kullanici",
      "E-posta destegi",
    ],
  },
  {
    key: "PROFESSIONAL",
    name: "Profesyonel",
    price: 499,
    icon: Crown,
    popular: true,
    features: [
      "Sinirsiz musteri",
      "Gelismis randevu sistemi",
      "Calisan yonetimi",
      "AI Asistan",
      "WhatsApp entegrasyonu",
      "5 kullanici",
      "Oncelikli destek",
    ],
  },
  {
    key: "BUSINESS",
    name: "Isletme",
    price: 799,
    icon: Building2,
    features: [
      "Profesyonel tum ozellikler",
      "Sinirsiz kullanici",
      "Stok yonetimi",
      "e-Fatura / e-Arsiv",
      "Gelismis raporlama",
      "API erisimi",
      "7/24 destek",
    ],
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Aktif", color: "bg-green-100 text-green-800" },
  TRIAL: { label: "Deneme", color: "bg-blue-100 text-blue-800" },
  CANCELLED: { label: "Iptal", color: "bg-red-100 text-red-800" },
  PAST_DUE: { label: "Gecikmis", color: "bg-orange-100 text-orange-800" },
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/billing/status");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(plan: string) {
    setSubscribing(plan);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch {
      // silently handle
    } finally {
      setSubscribing(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Aboneliginizi iptal etmek istediginizden emin misiniz?")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (res.ok) {
        await fetchStatus();
      }
    } catch {
      // silently handle
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentPlan = subscription?.plan;
  const isTrial = subscription?.status === "TRIAL";
  const isActive = subscription?.status === "ACTIVE" || isTrial;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abonelik Yonetimi</h1>
        <p className="text-sm text-gray-500">
          Planinizi yonetin ve odeme gecmisinizi goruntuleyin
        </p>
      </div>

      {/* Current Status */}
      {subscription && (
        <Card className={isTrial ? "border-blue-200 bg-blue-50" : ""}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-semibold">
                  {PLANS.find((p) => p.key === currentPlan)?.name || currentPlan} Plani
                </p>
                <p className="text-sm text-gray-500">
                  {isTrial && subscription.trialEndsAt && (
                    <>Deneme suresi: {new Date(subscription.trialEndsAt).toLocaleDateString("tr-TR")} tarihine kadar</>
                  )}
                  {!isTrial && (
                    <>Sonraki odeme: {new Date(subscription.currentPeriodEnd).toLocaleDateString("tr-TR")}</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={STATUS_LABELS[subscription.status]?.color || "bg-gray-100"}>
                {STATUS_LABELS[subscription.status]?.label || subscription.status}
              </Badge>
              {isActive && (
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? "Iptal ediliyor..." : "Iptal Et"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isTrial && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              14 gunluk ucretsiz deneme sureniz devam ediyor. Deneme suresi sonunda bir plan secmeniz gerekmektedir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.key;
          const Icon = plan.icon;
          return (
            <Card
              key={plan.key}
              className={`relative ${plan.popular ? "border-blue-400 shadow-md" : ""} ${
                isCurrentPlan ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white">En Populer</Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <div className="mx-auto rounded-full bg-blue-50 p-3 mb-2">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-gray-900">{plan.price} TL</span>
                  <span className="text-gray-500">/ay</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isCurrentPlan || subscribing !== null}
                  onClick={() => handleSubscribe(plan.key)}
                >
                  {subscribing === plan.key ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isCurrentPlan ? "Mevcut Plan" : "Plani Sec"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment History */}
      {subscription?.payments && subscription.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Odeme Gecmisi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscription.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.createdAt).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell className="font-medium">{payment.amount} TL</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          payment.status === "SUCCESS"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {payment.status === "SUCCESS"
                          ? "Basarili"
                          : payment.status === "FAILED"
                          ? "Basarisiz"
                          : "Bekliyor"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
