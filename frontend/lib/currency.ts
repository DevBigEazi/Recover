export interface UserCurrencyInfo {
  currency: "NGN" | "USD";
  symbol: string;
  rateAgainstUSD: number; // 1 USD = rate units of local currency
  countryCode: string;
}

export interface ConvertedPrice {
  usdAmount: number;
  localAmount: number;
  formattedLocal: string; // e.g. "₦5,200 ($3.50 USD)" for Nigeria, "$3.50 USD" for others
  symbol: string;
  currency: "NGN" | "USD";
  isNigeria: boolean;
  paymentGateway: "paystack" | "stripe";
}

const DEFAULT_USD_CURRENCY: UserCurrencyInfo = {
  currency: "USD",
  symbol: "$",
  rateAgainstUSD: 1.0,
  countryCode: "US",
};

const DEFAULT_NGN_FALLBACK_RATE = 1480;

let cachedCurrencyInfo: UserCurrencyInfo | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Detects whether the user is in Nigeria or elsewhere.
 * Rule:
 * - If from Nigeria: display Naira (NGN, ₦) with real-time conversion & use Paystack.
 * - If from any other country: display US Dollars (USD, $) & use Stripe.
 */
export async function detectUserCurrency(): Promise<UserCurrencyInfo> {
  if (cachedCurrencyInfo && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedCurrencyInfo;
  }

  try {
    let detectedCountry = "US";
    let isNigeria = false;

    // 1. First attempt: IP-based geo detection via ipapi.co
    try {
      const ipRes = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
      if (ipRes.ok) {
        const geoData = await ipRes.json();
        if (geoData.country_code) {
          detectedCountry = String(geoData.country_code).toUpperCase();
        }
        if (detectedCountry === "NG" || geoData.currency === "NGN") {
          isNigeria = true;
        }
      }
    } catch {
      // 2. Fallback attempt: Browser Timezone check
      if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (tz.includes("Lagos")) {
          isNigeria = true;
          detectedCountry = "NG";
        }
      }
    }

    // If Nigeria, fetch live USD -> NGN exchange rate
    if (isNigeria) {
      let ngnRate = DEFAULT_NGN_FALLBACK_RATE;
      try {
        const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(3000) });
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          if (fxData.rates && typeof fxData.rates.NGN === "number" && fxData.rates.NGN > 0) {
            ngnRate = Math.round(fxData.rates.NGN);
          }
        }
      } catch {
        ngnRate = DEFAULT_NGN_FALLBACK_RATE;
      }

      const result: UserCurrencyInfo = {
        currency: "NGN",
        symbol: "₦",
        rateAgainstUSD: ngnRate,
        countryCode: "NG",
      };
      cachedCurrencyInfo = result;
      cacheTimestamp = Date.now();
      return result;
    }

    // For all other countries: USD
    const result: UserCurrencyInfo = {
      currency: "USD",
      symbol: "$",
      rateAgainstUSD: 1.0,
      countryCode: detectedCountry,
    };
    cachedCurrencyInfo = result;
    cacheTimestamp = Date.now();
    return result;
  } catch (err) {
    console.warn("Currency detection fallback to USD:", err);
    return DEFAULT_USD_CURRENCY;
  }
}

/**
 * Returns whether a given currency info or country corresponds to Nigeria.
 */
export function isNigerianUser(currencyInfo?: UserCurrencyInfo | null): boolean {
  if (!currencyInfo) return false;
  return currencyInfo.countryCode === "NG" || currencyInfo.currency === "NGN";
}

/**
 * Returns the recommended payment gateway based on user location:
 * - Nigeria -> "paystack"
 * - All others -> "stripe"
 */
export function getPaymentGateway(currencyInfo?: UserCurrencyInfo | null): "paystack" | "stripe" {
  return isNigerianUser(currencyInfo) ? "paystack" : "stripe";
}

/**
 * Converts a base USD amount to the user's localized currency:
 * - If Nigeria: returns rounded Naira with formatted reference `₦5,200 ($3.50 USD)`.
 * - If Others: returns clean `$3.50 USD`.
 */
export function convertUsdPrice(usdAmount: number, currencyInfo?: UserCurrencyInfo | null): ConvertedPrice {
  const info = currencyInfo || DEFAULT_USD_CURRENCY;
  const isNigeria = isNigerianUser(info);
  const paymentGateway = isNigeria ? "paystack" : "stripe";

  if (isNigeria) {
    const rawLocal = usdAmount * (info.rateAgainstUSD || DEFAULT_NGN_FALLBACK_RATE);
    // Round to nearest 100 for clean Naira amounts (e.g. ₦5,200)
    const roundedNaira = Math.round(rawLocal / 100) * 100;
    const formattedNaira = roundedNaira.toLocaleString();

    return {
      usdAmount,
      localAmount: roundedNaira,
      formattedLocal: `₦${formattedNaira} ($${usdAmount.toFixed(2)} USD)`,
      symbol: "₦",
      currency: "NGN",
      isNigeria: true,
      paymentGateway: "paystack",
    };
  }

  // All other countries: strictly USD
  return {
    usdAmount,
    localAmount: usdAmount,
    formattedLocal: `$${usdAmount.toFixed(2)} USD`,
    symbol: "$",
    currency: "USD",
    isNigeria: false,
    paymentGateway: "stripe",
  };
}
