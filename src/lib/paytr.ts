import { createHmac } from "crypto";

// ═══════════════════════════════════════════════════════════
// Plan & Paket Tanımları (fiyatlar kuruş cinsinden)
// ═══════════════════════════════════════════════════════════

export const SUBSCRIPTION_PLANS = {
  STARTER: {
    id: "STARTER",
    name: "Başlangıç",
    price: 49900,
    displayPrice: "₺499",
    tokens: 50000,
    storageMB: 1024,
  },
  PRO: {
    id: "PRO",
    name: "Profesyonel",
    price: 99900,
    displayPrice: "₺999",
    tokens: 200000,
    storageMB: 5120,
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "İşletme",
    price: 199900,
    displayPrice: "₺1.999",
    tokens: 500000,
    storageMB: 20480,
  },
} as const;

export const TOKEN_PACKAGES = {
  TOKEN_100K: {
    id: "TOKEN_100K",
    name: "100.000 Token",
    price: 7900,
    displayPrice: "₺79",
    tokens: 100000,
  },
  TOKEN_500K: {
    id: "TOKEN_500K",
    name: "500.000 Token",
    price: 34900,
    displayPrice: "₺349",
    tokens: 500000,
  },
  TOKEN_1500K: {
    id: "TOKEN_1500K",
    name: "1.500.000 Token",
    price: 89900,
    displayPrice: "₺899",
    tokens: 1500000,
  },
} as const;

export const STORAGE_PACKAGES = {
  STORAGE_STARTER: {
    id: "STORAGE_STARTER",
    name: "Starter — 2 GB Depolama",
    price: 1900,
    displayPrice: "₺19/ay",
    sizeMB: 2048,
  },
  STORAGE_PROFESSIONAL: {
    id: "STORAGE_PROFESSIONAL",
    name: "Professional — 10 GB Depolama",
    price: 4900,
    displayPrice: "₺49/ay",
    sizeMB: 10240,
  },
  STORAGE_BUSINESS: {
    id: "STORAGE_BUSINESS",
    name: "Business — 50 GB Depolama",
    price: 12900,
    displayPrice: "₺129/ay",
    sizeMB: 51200,
  },
  STORAGE_ENTERPRISE: {
    id: "STORAGE_ENTERPRISE",
    name: "Enterprise — 500 GB Depolama",
    price: 89900,
    displayPrice: "₺899/ay",
    sizeMB: 512000,
  },
} as const;

export type PaymentType = "SUBSCRIPTION" | "TOKEN_PACKAGE" | "STORAGE_PACKAGE";

// ═══════════════════════════════════════════════════════════
// Paket bilgisi çözümleme
// ═══════════════════════════════════════════════════════════

export function getPackageInfo(paymentType: PaymentType, packageId: string) {
  switch (paymentType) {
    case "SUBSCRIPTION":
      return SUBSCRIPTION_PLANS[packageId as keyof typeof SUBSCRIPTION_PLANS] || null;
    case "TOKEN_PACKAGE":
      return TOKEN_PACKAGES[packageId as keyof typeof TOKEN_PACKAGES] || null;
    case "STORAGE_PACKAGE":
      return STORAGE_PACKAGES[packageId as keyof typeof STORAGE_PACKAGES] || null;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════
// PayTR Hash Fonksiyonları
// ═══════════════════════════════════════════════════════════

const getMerchantId = () => process.env.PAYTR_MERCHANT_ID!;
const getMerchantKey = () => process.env.PAYTR_MERCHANT_KEY!;
const getMerchantSalt = () => process.env.PAYTR_MERCHANT_SALT!;

interface PaytrTokenParams {
  merchantOid: string;
  email: string;
  paymentAmount: number; // kuruş
  userBasket: string; // base64
  userIp: string;
  userName: string;
}

export function generatePaytrHash(params: PaytrTokenParams): string {
  const merchantId = getMerchantId();
  const merchantKey = getMerchantKey();
  const merchantSalt = getMerchantSalt();

  const noInstallment = "1";
  const maxInstallment = "0";
  const currency = "TL";
  const testMode = process.env.PAYTR_TEST_MODE === "1" ? "1" : "0";

  const hashStr =
    merchantId +
    params.userIp +
    params.merchantOid +
    params.email +
    params.paymentAmount.toString() +
    params.userBasket +
    noInstallment +
    maxInstallment +
    currency +
    testMode;

  return createHmac("sha256", merchantKey)
    .update(hashStr + merchantSalt)
    .digest("base64");
}

export async function getPaytrIframeToken(params: PaytrTokenParams): Promise<{ token: string } | { error: string }> {
  const merchantId = getMerchantId();
  const testMode = process.env.PAYTR_TEST_MODE === "1" ? "1" : "0";

  const paytrToken = generatePaytrHash(params);

  const body = new URLSearchParams({
    merchant_id: merchantId,
    user_ip: params.userIp,
    merchant_oid: params.merchantOid,
    email: params.email,
    payment_amount: params.paymentAmount.toString(),
    paytr_token: paytrToken,
    user_basket: params.userBasket,
    debug_on: "1",
    no_installment: "1",
    max_installment: "0",
    user_name: params.userName,
    user_address: "Türkiye",
    user_phone: "05000000000",
    merchant_ok_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://poby.ai"}/payment/success`,
    merchant_fail_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://poby.ai"}/payment/failed`,
    timeout_limit: "30",
    currency: "TL",
    test_mode: testMode,
    lang: "tr",
  });

  const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
    method: "POST",
    body,
  });

  const data = await res.json();

  if (data.status === "success") {
    return { token: data.token };
  }

  return { error: data.reason || "PayTR token alınamadı" };
}

export function verifyPaytrCallback(merchantOid: string, status: string, totalAmount: string, hash: string): boolean {
  const merchantKey = getMerchantKey();
  const merchantSalt = getMerchantSalt();

  const expectedHash = createHmac("sha256", merchantKey)
    .update(merchantOid + merchantSalt + status + totalAmount)
    .digest("base64");

  return hash === expectedHash;
}
