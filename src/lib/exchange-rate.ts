// Shared exchange rate utility — cached server-side for 1 hour
let cachedRates: { rates: Record<string, number>; fetchedAt: number } | null = null;
const FALLBACK_RATES: Record<string, number> = { TRY: 38, EUR: 0.92, USD: 1 };

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cachedRates.fetchedAt < 3600000) {
    return cachedRates.rates;
  }
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("Kur alınamadı");
    const data = await res.json();
    cachedRates = { rates: data.rates, fetchedAt: now };
    return data.rates;
  } catch (err) {
    console.error("Exchange rate fetch failed:", err);
    return cachedRates?.rates || FALLBACK_RATES;
  }
}

export function convertToTRYKurus(
  amount: number,
  fromCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === "TRY" || !rates.TRY) return Math.round(amount * 100);
  const fromRate = rates[fromCurrency] || 1;
  const tryRate = rates.TRY;
  return Math.round(amount * (tryRate / fromRate) * 100);
}
