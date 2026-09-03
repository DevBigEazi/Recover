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

    // Fetch live exchange rate against USD
    let rate = 1.0;
    try {
      const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(3000) });
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        if (fxData.rates && fxData.rates[detectedCurrency]) {
          rate = fxData.rates[detectedCurrency];
        }
      }
    } catch {
      // Static fallback rates if FX API times out
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
      rate = FALLBACK_RATES[detectedCurrency] || 1.0;
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

/**
 * Converts a base USD amount to the user's detected local currency.
 */
export function convertUsdPrice(usdAmount: number, currencyInfo?: UserCurrencyInfo | null): ConvertedPrice {
  const info = currencyInfo || DEFAULT_CURRENCY;
  const rawLocal = usdAmount * info.rateAgainstUSD;

  let roundedLocal = rawLocal;
  if (info.currency === "NGN" || info.currency === "KES") {
    roundedLocal = Math.round(rawLocal / 100) * 100;
  } else if (rawLocal > 10) {
    roundedLocal = Math.round(rawLocal);
  } else {
    roundedLocal = Math.round(rawLocal * 100) / 100;
  }

  const formattedAmount = roundedLocal.toLocaleString(undefined, {
    minimumFractionDigits: roundedLocal % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  const formattedLocal = info.currency === "USD"
    ? `$${usdAmount.toFixed(2)} USD`
    : `${info.symbol}${formattedAmount} ${info.currency} ($${usdAmount.toFixed(2)} USD)`;

  return {
    usdAmount,
    localAmount: roundedLocal,
    formattedLocal,
    symbol: info.symbol,
    currency: info.currency,
  };
}
