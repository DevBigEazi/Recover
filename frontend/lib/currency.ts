export interface UserCurrencyInfo {
  currency: string;
  symbol: string;
  rateAgainstUSD: number; // 1 USD = rate units of local currency
  countryCode: string;
}

export interface ConvertedPrice {
  usdAmount: number;
  localAmount: number;
  formattedLocal: string; // e.g. "₦5,000 NGN ($3.50 USD)" or "$3.50 USD"
  symbol: string;
  currency: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  NGN: "₦",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "AU$",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
  INR: "₹",
  JPY: "¥",
  AED: "AED ",
  BRL: "R$",
  CNY: "¥",
};

const DEFAULT_CURRENCY: UserCurrencyInfo = {
  currency: "USD",
  symbol: "$",
  rateAgainstUSD: 1.0,
  countryCode: "US",
};

let cachedCurrencyInfo: UserCurrencyInfo | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Detects the user's local currency based on IP / GeoLocation / Timezone
 * and fetches the real-time USD exchange rate from exchange rate APIs.
 */
export async function detectUserCurrency(): Promise<UserCurrencyInfo> {
  if (cachedCurrencyInfo && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedCurrencyInfo;
  }

  try {
    let detectedCurrency = "USD";
    let detectedCountry = "US";

    try {
      const ipRes = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
      if (ipRes.ok) {
        const geoData = await ipRes.json();
        if (geoData && !geoData.error && geoData.currency) {
          detectedCurrency = geoData.currency.toUpperCase();
          if (geoData.country_code) {
            detectedCountry = geoData.country_code.toUpperCase();
          }
        } else {
          throw new Error("Invalid or rate-limited ipapi response");
        }
      } else {
        throw new Error("ipapi HTTP request failed");
      }
    } catch {
      // Fallback: detect via browser timezone & locale
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Lagos") || tz.includes("Nigeria")) {
        detectedCurrency = "NGN";
        detectedCountry = "NG";
      } else if (tz.includes("London") || tz.includes("Belfast")) {
        detectedCurrency = "GBP";
        detectedCountry = "GB";
      } else if (
        tz.includes("Paris") ||
        tz.includes("Berlin") ||
        tz.includes("Rome") ||
        tz.includes("Madrid") ||
        tz.includes("Amsterdam") ||
        tz.includes("Brussels") ||
        tz.includes("Vienna") ||
        tz.includes("Dublin") ||
        tz.includes("Lisbon") ||
        tz.includes("Helsinki") ||
        tz.includes("Athens") ||
        tz.includes("Warsaw") ||
        tz.includes("Prague") ||
        tz.startsWith("Europe/")
      ) {
        detectedCurrency = "EUR";
        detectedCountry = "EU";
      } else if (
        tz.includes("Toronto") ||
        tz.includes("Vancouver") ||
        tz.includes("Montreal") ||
        tz.includes("Edmonton") ||
        tz.includes("Winnipeg") ||
        tz.includes("Halifax") ||
        tz.startsWith("Canada/")
      ) {
        detectedCurrency = "CAD";
        detectedCountry = "CA";
      } else if (
        tz.includes("Sydney") ||
        tz.includes("Melbourne") ||
        tz.includes("Brisbane") ||
        tz.includes("Perth") ||
        tz.includes("Adelaide") ||
        tz.startsWith("Australia/")
      ) {
        detectedCurrency = "AUD";
        detectedCountry = "AU";
      } else if (tz.includes("Accra")) {
        detectedCurrency = "GHS";
        detectedCountry = "GH";
      } else if (tz.includes("Nairobi")) {
        detectedCurrency = "KES";
        detectedCountry = "KE";
      } else if (tz.includes("Johannesburg")) {
        detectedCurrency = "ZAR";
        detectedCountry = "ZA";
      } else if (tz.includes("Kolkata") || tz.includes("Calcutta")) {
        detectedCurrency = "INR";
        detectedCountry = "IN";
      } else if (tz.includes("Tokyo")) {
        detectedCurrency = "JPY";
        detectedCountry = "JP";
      } else if (tz.includes("Dubai")) {
        detectedCurrency = "AED";
        detectedCountry = "AE";
      } else if (tz.includes("Sao_Paulo")) {
        detectedCurrency = "BRL";
        detectedCountry = "BR";
      } else if (
        tz.includes("New_York") ||
        tz.includes("Chicago") ||
        tz.includes("Denver") ||
        tz.includes("Los_Angeles") ||
        tz.includes("Phoenix") ||
        tz.includes("Anchorage") ||
        tz.includes("Honolulu") ||
        tz.startsWith("America/") ||
        tz.startsWith("US/")
      ) {
        detectedCurrency = "USD";
        detectedCountry = "US";
      } else if (typeof navigator !== "undefined" && navigator.language) {
        const lang = navigator.language.toUpperCase();
        if (lang.endsWith("-NG")) {
          detectedCurrency = "NGN";
          detectedCountry = "NG";
        } else if (lang.endsWith("-GB")) {
          detectedCurrency = "GBP";
          detectedCountry = "GB";
        } else if (lang.endsWith("-CA")) {
          detectedCurrency = "CAD";
          detectedCountry = "CA";
        } else if (lang.endsWith("-AU")) {
          detectedCurrency = "AUD";
          detectedCountry = "AU";
        }
      }
    }

    if (detectedCurrency === "USD") {
      const result: UserCurrencyInfo = {
        currency: "USD",
        symbol: "$",
        rateAgainstUSD: 1.0,
        countryCode: detectedCountry,
      };
      cachedCurrencyInfo = result;
      cacheTimestamp = Date.now();
      return result;
    }

    // Static fallback rates if FX API times out, rate limits (429), or errors (5xx)
    const FALLBACK_RATES: Record<string, number> = {
      NGN: 1480,
      EUR: 0.92,
      GBP: 0.79,
      GHS: 15.5,
      KES: 130,
      ZAR: 18.2,
      CAD: 1.36,
      AUD: 1.52,
      INR: 83.5,
      JPY: 155,
      AED: 3.67,
      BRL: 5.4,
    };

    // Initialize with fallback rate for detected currency, defaulting to 1.0
    let rate = FALLBACK_RATES[detectedCurrency] || 1.0;
    try {
      const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(3000) });
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        const detectedRate = fxData?.rates?.[detectedCurrency];
        if (typeof detectedRate === "number" && detectedRate > 0 && isFinite(detectedRate)) {
          rate = detectedRate;
        }
        if (typeof fxData?.rates?.NGN === "number" && fxData.rates.NGN > 0) {
          cachedNgnUsdRate = fxData.rates.NGN;
        }
      }
    } catch {
      // On fetch exception or timeout, preserve fallback rate
    }

    const symbol = CURRENCY_SYMBOLS[detectedCurrency] || `${detectedCurrency} `;
    const result: UserCurrencyInfo = {
      currency: detectedCurrency,
      symbol,
      rateAgainstUSD: rate,
      countryCode: detectedCountry,
    };

    cachedCurrencyInfo = result;
    cacheTimestamp = Date.now();
    return result;
  } catch (err) {
    console.warn("Currency detection error:", err);
    return DEFAULT_CURRENCY;
  }
}

let cachedNgnUsdRate = 1480;

export interface PlanTierConfig {
  id: string;
  name: string;
  ngnMonthly: number;
  quota: number; // Dispatches and receipts combined
  branches: number;
  salesReps: number;
  managers: number;
  description: string;
}

export const PLAN_TIERS: Record<string, PlanTierConfig> = {
  free: {
    id: "free",
    name: "Free",
    ngnMonthly: 0,
    quota: 100,
    branches: 0,
    salesReps: 0,
    managers: 0,
    description: "CEO only · 100 dispatches & receipts",
  },
  starter_500: {
    id: "starter_500",
    name: "Starter",
    ngnMonthly: 500,
    quota: 500,
    branches: 1,
    salesReps: 1,
    managers: 1,
    description: "1 branch · 1 sales rep · 1 manager · 500 dispatches & receipts",
  },
  growth_1000: {
    id: "growth_1000",
    name: "Growth",
    ngnMonthly: 1000,
    quota: 1000,
    branches: 2,
    salesReps: 4,
    managers: 2,
    description: "2 branches · 4 sales reps · 2 managers · 1,000 dispatches & receipts",
  },
  business_2500: {
    id: "business_2500",
    name: "Business",
    ngnMonthly: 2500,
    quota: 2500,
    branches: 3,
    salesReps: 6,
    managers: 3,
    description: "3 branches · 6 sales reps · 3 managers · 2,500 dispatches & receipts",
  },
  scale_5000: {
    id: "scale_5000",
    name: "Scale",
    ngnMonthly: 5000,
    quota: 5000,
    branches: 5,
    salesReps: 10,
    managers: 5,
    description: "5 branches · 10 sales reps · 5 managers · 5,000 dispatches & receipts",
  },
};

export const OVERAGE_FEE_NGN = 1; // ₦1 per extra dispatch, receipt, branch, sales rep in Nigeria
export const OVERAGE_FEE_USD = 0.003; // $0.003 per extra dispatch, receipt, branch, sales rep for non-Nigeria

/**
 * Converts a base NGN amount to the user's detected local currency.
 * If user is in Nigeria, returns exact NGN without foreign exchange.
 * If user is outside Nigeria, applies 3x tier multiplier, or $0.003 for overage fee.
 * Single currency format strictly enforced (e.g. "₦500" or "$1.05").
 */
export function convertNgnPrice(ngnAmount: number, currencyInfo?: UserCurrencyInfo | null): ConvertedPrice {
  const info = currencyInfo || DEFAULT_CURRENCY;

  if (info.currency === "NGN" || info.countryCode === "NG") {
    const formatted = ngnAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return {
      usdAmount: ngnAmount / cachedNgnUsdRate,
      localAmount: ngnAmount,
      formattedLocal: `₦${formatted}`,
      symbol: "₦",
      currency: "NGN",
    };
  }

  // Universal overage for non-Nigeria is fixed at $0.003
  if (ngnAmount === OVERAGE_FEE_NGN) {
    const usdAmount = OVERAGE_FEE_USD;
    const rawLocal = usdAmount * info.rateAgainstUSD;
    const formattedAmount = info.currency === "USD" 
      ? "0.003"
      : rawLocal.toLocaleString(undefined, {
          minimumFractionDigits: 3,
          maximumFractionDigits: 4,
        });

    return {
      usdAmount,
      localAmount: rawLocal,
      formattedLocal: `${info.symbol}${formattedAmount}`,
      symbol: info.symbol,
      currency: info.currency,
    };
  }

  // Triple price for international users (outside Nigeria)
  const effectiveNgn = ngnAmount * 3;
  const usdAmount = effectiveNgn / (cachedNgnUsdRate || 1480);
  const rawLocal = usdAmount * info.rateAgainstUSD;
  const roundedLocal = Math.round(rawLocal * 100) / 100;
  const formattedAmount = roundedLocal.toLocaleString(undefined, {
    minimumFractionDigits: roundedLocal % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return {
    usdAmount,
    localAmount: roundedLocal,
    formattedLocal: `${info.symbol}${formattedAmount}`,
    symbol: info.symbol,
    currency: info.currency,
  };
}

export function getOverageFee(currencyInfo?: UserCurrencyInfo | null): ConvertedPrice {
  return convertNgnPrice(OVERAGE_FEE_NGN, currencyInfo);
}

/**
 * Converts a base USD amount to the user's detected local currency.
 * Single currency format strictly enforced (e.g. "$3.50" or "₦5,180").
 */
export function convertUsdPrice(usdAmount: number, currencyInfo?: UserCurrencyInfo | null): ConvertedPrice {
  const info = currencyInfo || DEFAULT_CURRENCY;
  const rawLocal = usdAmount * info.rateAgainstUSD;

  let roundedLocal = rawLocal;
  let formattedAmount = "";

  if (usdAmount > 0 && usdAmount < 0.01) {
    // Preserve precision for micro-fees such as $0.003 universal overage
    roundedLocal = Math.round(rawLocal * 10000) / 10000;
    formattedAmount = roundedLocal.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 4,
    });
  } else if (info.currency === "NGN" || info.currency === "KES") {
    roundedLocal = Math.round(rawLocal / 100) * 100;
    formattedAmount = roundedLocal.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  } else if (rawLocal > 10) {
    roundedLocal = Math.round(rawLocal);
    formattedAmount = roundedLocal.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  } else {
    roundedLocal = Math.round(rawLocal * 100) / 100;
    formattedAmount = roundedLocal.toLocaleString(undefined, {
      minimumFractionDigits: roundedLocal % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  const formattedLocal = `${info.symbol}${formattedAmount}`;

  return {
    usdAmount,
    localAmount: roundedLocal,
    formattedLocal,
    symbol: info.symbol,
    currency: info.currency,
  };
}

/**
 * Formats accrued overage charges for the merchant dashboard.
 * If user is Nigerian, formatted as integer Naira (₦1 per excess unit).
 * If non-Nigerian, formatted in single local currency using USD micro-fee rate ($0.003 per unit).
 */
export function formatOverageCharges(amount: number, currencyInfo?: UserCurrencyInfo | null): string {
  const info = currencyInfo || DEFAULT_CURRENCY;
  if (!amount || amount <= 0) {
    return info.currency === "NGN" || info.countryCode === "NG" ? "₦0" : `${info.symbol}0.00`;
  }
  if (info.currency === "NGN" || info.countryCode === "NG") {
    return `₦${Math.round(amount).toLocaleString()}`;
  }
  const converted = convertUsdPrice(amount, info);
  return converted.formattedLocal;
}

