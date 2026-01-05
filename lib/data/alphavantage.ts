import { cache, CACHE_TTL } from './cache';
import type { Indicator, Capability, DataSource } from '../types';
import { getETTimestamp } from '../time';

/**
 * Alpha Vantage - Primary data source for ETFs, equities, and FX
 * Free tier: 25 requests/day (premium has higher limits)
 * https://www.alphavantage.co/documentation/
 */

const AV_BASE_URL = 'https://www.alphavantage.co/query';

/**
 * ETF and equity symbols supported by Alpha Vantage
 */
export const AV_EQUITY_SYMBOLS: string[] = [
  // Core ETFs
  'SPY', 'QQQ', 'IWM', 'RSP',
  // Credit ETFs
  'HYG', 'LQD', 'TLT', 'SHY',
  // USD/FX ETFs
  'UUP', 'FXY',
  // Commodities
  'GLD', 'SLV', 'USO', 'DBA',
  // Sector ETFs
  'XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC',
];

/**
 * FX pairs supported by Alpha Vantage
 */
export const AV_FX_PAIRS: Record<string, { from: string; to: string }> = {
  EURUSD: { from: 'EUR', to: 'USD' },
  DXY: { from: 'USD', to: 'EUR' }, // Inverse as proxy for DXY
};

interface AVFXDaily {
  'Meta Data': {
    '1. Information': string;
    '2. From Symbol': string;
    '3. To Symbol': string;
    '4. Last Refreshed': string;
  };
  'Time Series FX (Daily)': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
  }>;
}

interface AVGlobalQuote {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

/**
 * Raw response from Alpha Vantage (for debugging)
 */
export interface AVDebugResponse {
  httpStatus: number;
  symbol: string;
  rawResponse: Record<string, unknown>;
  parsed: {
    price?: number;
    previousClose?: number;
    tradingDay?: string;
  } | null;
  error?: string;
  note?: string;
  information?: string;
  isRateLimited: boolean;
  isError: boolean;
}

/**
 * Get Alpha Vantage API key
 */
function getAPIKey(): string | null {
  return process.env.ALPHAVANTAGE_API_KEY || null;
}

/**
 * Check if Alpha Vantage is available
 */
export function isAlphaVantageAvailable(): boolean {
  return !!getAPIKey();
}

/**
 * Get all equity tickers supported by Alpha Vantage
 */
export function getAVEquityTickers(): string[] {
  return AV_EQUITY_SYMBOLS;
}

/**
 * Check if a ticker is an AV equity/ETF
 */
export function isAVEquityTicker(ticker: string): boolean {
  return AV_EQUITY_SYMBOLS.includes(ticker);
}

/**
 * Check if a ticker is an AV FX pair
 */
export function isAVFXTicker(ticker: string): boolean {
  return ticker in AV_FX_PAIRS;
}

/**
 * Normalize symbol for Alpha Vantage (no prefixes, uppercase)
 */
function normalizeSymbol(symbol: string): string {
  // Remove any prefixes and ensure uppercase
  return symbol.replace(/^[\^$]/, '').toUpperCase();
}

/**
 * Fetch global quote (ETF/equity) from Alpha Vantage with detailed response
 */
export async function fetchGlobalQuoteRaw(symbol: string): Promise<{
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  tradingDay: string;
} | null> {
  const apiKey = getAPIKey();
  if (!apiKey) {
    console.warn('[AV] API key not set');
    return null;
  }

  // Normalize symbol (remove prefixes, uppercase)
  const normalizedSymbol = normalizeSymbol(symbol);
  const url = `${AV_BASE_URL}?function=GLOBAL_QUOTE&symbol=${normalizedSymbol}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[AV] HTTP ${response.status} for ${normalizedSymbol}`);
      return null;
    }

    const data = await response.json();

    // Check for rate limiting - "Note" indicates API limit reached
    if (data.Note) {
      console.warn(`[AV] Rate limited for ${normalizedSymbol}: ${data.Note}`);
      return null;
    }

    // Check for "Information" field (often indicates API issues)
    if (data.Information) {
      console.warn(`[AV] Information for ${normalizedSymbol}: ${data.Information}`);
      return null;
    }

    // Check for error message
    if (data['Error Message']) {
      console.warn(`[AV] Error for ${normalizedSymbol}: ${data['Error Message']}`);
      return null;
    }

    const quote = data['Global Quote'];

    // Check if Global Quote exists and has data
    if (!quote || Object.keys(quote).length === 0) {
      console.warn(`[AV] Empty Global Quote for ${normalizedSymbol}. Response keys: ${Object.keys(data).join(', ')}`);
      return null;
    }

    // Check for required fields
    if (!quote['05. price']) {
      console.warn(`[AV] Missing price field for ${normalizedSymbol}. Quote keys: ${Object.keys(quote).join(', ')}`);
      return null;
    }

    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);

    if (isNaN(price) || price === 0) {
      console.warn(`[AV] Invalid price for ${normalizedSymbol}: ${quote['05. price']}`);
      return null;
    }

    // Always recompute change from price and previousClose
    const change = price - previousClose;
    const changePct = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    console.log(`[AV] Success for ${normalizedSymbol}: price=${price}, prevClose=${previousClose}`);

    return {
      price,
      previousClose,
      change,
      changePct,
      tradingDay: quote['07. latest trading day'] || '',
    };
  } catch (error) {
    console.error(`[AV] Fetch error for ${normalizedSymbol}:`, error);
    return null;
  }
}

/**
 * Debug function to test a single symbol and return detailed response
 */
export async function debugFetchSymbol(symbol: string): Promise<AVDebugResponse> {
  const apiKey = getAPIKey();
  const normalizedSymbol = normalizeSymbol(symbol);

  if (!apiKey) {
    return {
      httpStatus: 0,
      symbol: normalizedSymbol,
      rawResponse: {},
      parsed: null,
      error: 'ALPHAVANTAGE_API_KEY not set',
      isRateLimited: false,
      isError: true,
    };
  }

  const url = `${AV_BASE_URL}?function=GLOBAL_QUOTE&symbol=${normalizedSymbol}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Redact API key from any error messages
    const sanitizedData = JSON.parse(
      JSON.stringify(data).replace(new RegExp(apiKey, 'g'), '[REDACTED]')
    );

    const result: AVDebugResponse = {
      httpStatus: response.status,
      symbol: normalizedSymbol,
      rawResponse: sanitizedData,
      parsed: null,
      isRateLimited: false,
      isError: false,
    };

    // Check for Note (rate limiting)
    if (data.Note) {
      result.note = data.Note;
      result.isRateLimited = true;
    }

    // Check for Information
    if (data.Information) {
      result.information = data.Information;
    }

    // Check for Error Message
    if (data['Error Message']) {
      result.error = data['Error Message'];
      result.isError = true;
    }

    // Try to parse Global Quote
    const quote = data['Global Quote'];
    if (quote && Object.keys(quote).length > 0) {
      const price = parseFloat(quote['05. price']);
      const previousClose = parseFloat(quote['08. previous close']);

      if (!isNaN(price)) {
        result.parsed = {
          price,
          previousClose: isNaN(previousClose) ? undefined : previousClose,
          tradingDay: quote['07. latest trading day'],
        };
      }
    }

    return result;
  } catch (error) {
    return {
      httpStatus: 0,
      symbol: normalizedSymbol,
      rawResponse: {},
      parsed: null,
      error: error instanceof Error ? error.message : 'Unknown fetch error',
      isRateLimited: false,
      isError: true,
    };
  }
}

/**
 * Fetch equity/ETF indicator from Alpha Vantage
 */
export async function fetchAVEquityIndicator(symbol: string): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  if (!isAlphaVantageAvailable()) {
    return {
      indicator: {
        displayName: symbol,
        session: 'NA',
        source: 'AV' as DataSource,
      },
      capability: {
        ok: false,
        reason: 'Alpha Vantage API key not configured',
        sourceUsed: 'AV' as DataSource,
      },
    };
  }

  const normalizedSymbol = normalizeSymbol(symbol);
  const cacheKey = `av:quote:${normalizedSymbol}`;

  try {
    const result = await cache.singleFlight(
      cacheKey,
      () => fetchGlobalQuoteRaw(normalizedSymbol),
      { ttlMs: CACHE_TTL.QUOTES }
    );

    const data = result.data;

    if (!data) {
      return {
        indicator: {
          displayName: symbol,
          session: 'NA',
          source: 'AV' as DataSource,
        },
        capability: {
          ok: false,
          resolvedSymbol: normalizedSymbol,
          reason: 'No data from Alpha Vantage (check /api/debug/av for details)',
          sourceUsed: 'AV' as DataSource,
        },
      };
    }

    return {
      indicator: {
        displayName: `${symbol} (AV)`,
        price: data.price,
        previousClose: data.previousClose,
        change: data.change,
        changePct: data.changePct,
        session: 'CLOSE',
        asOfET: getETTimestamp(),
        source: 'AV' as DataSource,
      },
      capability: {
        ok: true,
        resolvedSymbol: normalizedSymbol,
        sourceUsed: 'AV' as DataSource,
      },
    };
  } catch (error) {
    console.error(`[AV] Error for ${symbol}:`, error);
    return {
      indicator: {
        displayName: symbol,
        session: 'NA',
        source: 'AV' as DataSource,
      },
      capability: {
        ok: false,
        resolvedSymbol: normalizedSymbol,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceUsed: 'AV' as DataSource,
      },
    };
  }
}

/**
 * Fetch FX rate from Alpha Vantage
 */
async function fetchFXDailyRaw(fromCurrency: string, toCurrency: string): Promise<AVFXDaily | null> {
  const apiKey = getAPIKey();
  if (!apiKey) {
    console.warn('[AV] API key not set');
    return null;
  }

  const url = `${AV_BASE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[AV] FX HTTP ${response.status} for ${fromCurrency}/${toCurrency}`);
      return null;
    }

    const data = await response.json();

    // Check for rate limiting
    if (data.Note) {
      console.warn(`[AV] FX rate limited: ${data.Note}`);
      return null;
    }

    if (data.Information) {
      console.warn(`[AV] FX information: ${data.Information}`);
      return null;
    }

    // Check for error
    if (data['Error Message']) {
      console.warn(`[AV] FX error: ${data['Error Message']}`);
      return null;
    }

    return data as AVFXDaily;
  } catch (error) {
    console.error('[AV] FX fetch error:', error);
    return null;
  }
}

/**
 * Fetch FX indicator from Alpha Vantage
 */
export async function fetchFXIndicator(
  logicalTicker: string,
  fromCurrency: string,
  toCurrency: string
): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  const cacheKey = `av:fx:${fromCurrency}:${toCurrency}`;

  try {
    const result = await cache.singleFlight(
      cacheKey,
      () => fetchFXDailyRaw(fromCurrency, toCurrency),
      { ttlMs: CACHE_TTL.FX_RATE }
    );

    const data = result.data;

    if (!data || !data['Time Series FX (Daily)']) {
      return {
        indicator: {
          displayName: logicalTicker,
          session: 'NA',
          source: 'AV' as DataSource,
        },
        capability: {
          ok: false,
          reason: 'No FX data from Alpha Vantage',
          sourceUsed: 'AV' as DataSource,
        },
      };
    }

    const timeSeries = data['Time Series FX (Daily)'];
    const dates = Object.keys(timeSeries).sort().reverse();

    if (dates.length < 2) {
      return {
        indicator: {
          displayName: logicalTicker,
          session: 'NA',
          source: 'AV' as DataSource,
        },
        capability: {
          ok: false,
          reason: 'Insufficient FX data from Alpha Vantage',
          sourceUsed: 'AV' as DataSource,
        },
      };
    }

    const latestDate = dates[0];
    const previousDate = dates[1];

    const price = parseFloat(timeSeries[latestDate]['4. close']);
    const previousClose = parseFloat(timeSeries[previousDate]['4. close']);

    const change = price - previousClose;
    const changePct = (change / previousClose) * 100;

    return {
      indicator: {
        displayName: `${logicalTicker} (AV)`,
        price,
        previousClose,
        change,
        changePct,
        session: 'CLOSE',
        asOfET: getETTimestamp(),
        source: 'AV' as DataSource,
      },
      capability: {
        ok: true,
        resolvedSymbol: `${fromCurrency}/${toCurrency}`,
        sourceUsed: 'AV' as DataSource,
      },
    };
  } catch (error) {
    console.error(`[AV] FX error for ${logicalTicker}:`, error);
    return {
      indicator: {
        displayName: logicalTicker,
        session: 'NA',
        source: 'AV' as DataSource,
      },
      capability: {
        ok: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceUsed: 'AV' as DataSource,
      },
    };
  }
}

/**
 * Fetch EURUSD specifically
 */
export async function fetchEURUSD(): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  return fetchFXIndicator('EURUSD', 'EUR', 'USD');
}
