// iyzico payment integration
// Note: Install iyzipay package: npm install iyzipay

interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  uri: string;
}

function getConfig(): IyzicoConfig {
  return {
    apiKey: process.env.IYZICO_API_KEY || "",
    secretKey: process.env.IYZICO_SECRET_KEY || "",
    uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
  };
}

export const PLANS = {
  STARTER: { name: "Baslangic", price: 299, currency: "TRY" },
  PROFESSIONAL: { name: "Profesyonel", price: 499, currency: "TRY" },
  BUSINESS: { name: "Isletme", price: 799, currency: "TRY" },
} as const;

export type PlanType = keyof typeof PLANS;

export function getIyzicoConfig() {
  return getConfig();
}

export function isPlanValid(plan: string): plan is PlanType {
  return plan in PLANS;
}
