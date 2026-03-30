// Shared exchange rate utility — cached server-side for 1 hour
let cachedRates: { rates: Record<string, number>; fetchedAt: number } | null = null;

// Fallback rates (approximate, updated periodically)
const FALLBACK_RATES: Record<string, number> = { USD: 38.5, EUR: 42, GBP: 49 };

/**
 * Döviz kurlarını TRY bazlı döner: { USD: 38.5, EUR: 42, GBP: 49, ... }
 * Yani 1 USD = 38.5 TRY şeklinde
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cachedRates.fetchedAt < 3600000) {
    return cachedRates.rates;
  }

  // Try multiple sources
  const tryRates = await fetchFromExchangeRateAPI() || await fetchFromOpenER() || null;

  if (tryRates) {
    cachedRates = { rates: tryRates, fetchedAt: now };
    return tryRates;
  }

  return cachedRates?.rates || FALLBACK_RATES;
}

// Source 1: exchangerate-api.com (USD-based, convert to TRY-based)
async function fetchFromExchangeRateAPI(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const usdToTry = data.rates?.TRY;
    if (!usdToTry) return null;

    // Convert all rates to TRY-based: 1 CURRENCY = X TRY
    const tryBased: Record<string, number> = {};
    for (const [currency, rateVsUsd] of Object.entries(data.rates as Record<string, number>)) {
      if (currency === "TRY") continue;
      // rateVsUsd = how many CURRENCY per 1 USD
      // We want: 1 CURRENCY = ? TRY
      // 1 USD = rateVsUsd CURRENCY → 1 CURRENCY = 1/rateVsUsd USD
      // 1 CURRENCY = (1/rateVsUsd) * usdToTry TRY
      tryBased[currency] = usdToTry / rateVsUsd;
    }
    return tryBased;
  } catch {
    return null;
  }
}

// Source 2: open.er-api.com
async function fetchFromOpenER(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/TRY", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.rates) return null;

    // This gives 1 TRY = X CURRENCY, we need inverse: 1 CURRENCY = ? TRY
    const tryBased: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(data.rates as Record<string, number>)) {
      if (currency === "TRY" || !rate) continue;
      tryBased[currency] = 1 / rate;
    }
    return tryBased;
  } catch {
    return null;
  }
}

/**
 * Döviz tutarını TRY kuruşa çevirir.
 * rates: TRY-bazlı kurlar { USD: 38.5, EUR: 42 }
 */
export function convertToTRYKurus(
  amount: number,
  fromCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === "TRY") return Math.round(amount * 100);
  const rate = rates[fromCurrency];
  if (!rate) return Math.round(amount * 100); // fallback: assume TRY
  return Math.round(amount * rate * 100);
}
