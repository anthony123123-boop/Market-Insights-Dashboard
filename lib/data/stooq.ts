import { cache, CACHE_TTL } from './cache';
import type { Indicator, Capability, DataSource } from '../types';
import { getETTimestamp } from '../time';

/**
 * Stooq - PRIMARY data source for US equities and ETFs
 * Free, no API key required, CSV format
 * https://stooq.com/
 *
 * Symbol format: {ticker}.us for US securities
 * Example: spy.us, qqq.us, gld.us, xlf.us
 *
 * IMPORTANT: Stooq rate-limits aggressive parallel requests.
 * This module implements sequential fetching with delays.
 */

// Correct URL format: https://stooq.com/q/l/?s={symbol}&i=d
const STOOQ_BASE_URL = 'https://stooq.com/q/l/';

// Delay between sequential Stooq requests (ms)
const STOOQ_REQUEST_DELAY_MS = 200;

// Max retries per symbol
const MAX_RETRIES = 2;

// Retry backoff base (ms)
const RETRY_BACKOFF_MS = 500;

/**
 * Complete mapping of logical tickers to Stooq symbols
 * All US equities/ETFs use .us suffix
 */
export const STOOQ_SYMBOLS: Record<string, string> = {
  // Core ETFs
  SPY: 'spy.us',
  QQQ: 'qqq.us',
  IWM: 'iwm.us',
  RSP: 'rsp.us',

  // Credit/Bond ETFs
  HYG: 'hyg.us',
  LQD: 'lqd.us',
  TLT: 'tlt.us',
  SHY: 'shy.us',

  // Currency ETFs
  UUP: 'uup.us',
  FXY: 'fxy.us',

  // Commodity ETFs
  GLD: 'gld.us',
  SLV: 'slv.us',
  USO: 'uso.us',
  DBA: 'dba.us',

  // Sector ETFs
  XLK: 'xlk.us',
  XLF: 'xlf.us',
  XLI: 'xli.us',
  XLE: 'xle.us',
  XLV: 'xlv.us',
  XLP: 'xlp.us',
  XLU: 'xlu.us',
  XLRE: 'xlre.us',
  XLY: 'xly.us',
  XLC: 'xlc.us',
};

/**
 * Get all tickers supported by Stooq
 */
export function getStooqTickers(): string[] {
  return Object.keys(STOOQ_SYMBOLS);
}

/**
 * Check if a ticker is supported by Stooq
 */
export function isStooqTicker(ticker: string): boolean {
  return ticker in STOOQ_SYMBOLS;
}

/**
 * Get Stooq symbol for a ticker
 */
export function getStooqSymbol(ticker: string): string | null {
  return STOOQ_SYMBOLS[ticker] || null;
}

interface StooqParseResult {
  symbol: string;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Browser-like headers to avoid being blocked
 */
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/csv,text/plain,*/*;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache',
};

/**
 * Clean CSV response - handle BOM, whitespace, etc.
 */
function cleanCsvResponse(raw: string): string {
  // Remove BOM if present
  let csv = raw.replace(/^\uFEFF/, '');

  // Trim whitespace
  csv = csv.trim();

  // Normalize line endings
  csv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return csv;
}

/**
 * Check if response looks like HTML (error page) instead of CSV
 */
function isHtmlResponse(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('<html') || lower.includes('<!doctype') || lower.includes('<head');
}

/**
 * Check if response looks like valid CSV
 */
function isValidCsv(text: string): boolean {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return false;

  // First line should be header with commas
  const headerCommas = (lines[0].match(/,/g) || []).length;
  if (headerCommas < 3) return false;

  // Second line should have similar structure
  const dataCommas = (lines[1].match(/,/g) || []).length;
  if (dataCommas < 3) return false;

  return true;
}

/**
 * Parse Stooq CSV response
 * Format: Symbol,Date,Time,Open,High,Low,Close,Volume
 */
function parseStooqCSV(csv: string, requestedSymbol: string): StooqParseResult | null {
  const cleaned = cleanCsvResponse(csv);

  // Check for HTML response (error page)
  if (isHtmlResponse(cleaned)) {
    console.warn(`[Stooq] Got HTML instead of CSV for ${requestedSymbol}`);
    return null;
  }

  // Check if it looks like valid CSV
  if (!isValidCsv(cleaned)) {
    console.warn(`[Stooq] Invalid CSV format for ${requestedSymbol}`);
    return null;
  }

  const lines = cleaned.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    console.warn(`[Stooq] CSV too short for ${requestedSymbol}: ${lines.length} lines`);
    return null;
  }

  const header = lines[0].toLowerCase();
  const dataLine = lines[1];

  // Verify header format - be flexible about exact format
  if (!header.includes('symbol') && !header.includes('date')) {
    console.warn(`[Stooq] Unexpected header for ${requestedSymbol}: ${header.substring(0, 100)}`);
    return null;
  }

  // Split values, handling trailing commas
  const values = dataLine.split(',').map(v => v.trim());

  // Check for "N/D" (No Data) markers
  if (values.some(v => v === 'N/D' || v === 'N/A')) {
    console.warn(`[Stooq] No data marker for ${requestedSymbol}`);
    return null;
  }

  // Check we have enough fields (at least 7: symbol,date,time,open,high,low,close)
  if (values.length < 7) {
    console.warn(`[Stooq] Insufficient fields for ${requestedSymbol}: ${values.length}`);
    return null;
  }

  const close = parseFloat(values[6]);
  const open = parseFloat(values[3]);

  if (isNaN(close) || close <= 0) {
    console.warn(`[Stooq] Invalid close price for ${requestedSymbol}: ${values[6]}`);
    return null;
  }

  return {
    symbol: values[0],
    date: values[1],
    time: values[2],
    open: isNaN(open) || open <= 0 ? close : open,
    high: parseFloat(values[4]) || close,
    low: parseFloat(values[5]) || close,
    close,
    volume: parseFloat(values[7]) || 0,
  };
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Symbols to log detailed diagnostics for
const DEBUG_SYMBOLS = ['spy.us', 'qqq.us', 'gld.us', 'xlk.us'];

/**
 * Fetch raw quote from Stooq with retry logic
 */
async function fetchStooqRaw(stooqSymbol: string, retryCount = 0): Promise<{
  price: number;
  previousClose: number;
  date: string;
  rawCsv: string;
} | null> {
  // Correct URL format: s=symbol, i=d (daily interval)
  const url = `${STOOQ_BASE_URL}?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const isDebugSymbol = DEBUG_SYMBOLS.includes(stooqSymbol.toLowerCase());

  if (isDebugSymbol || retryCount > 0) {
    console.log(`[Stooq] Fetching ${stooqSymbol} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Stooq] HTTP ${response.status} for ${stooqSymbol}`);

      // Retry on server errors
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * (retryCount + 1));
        return fetchStooqRaw(stooqSymbol, retryCount + 1);
      }
      return null;
    }

    const csv = await response.text();

    if (!csv || csv.length < 20) {
      console.warn(`[Stooq] Empty response for ${stooqSymbol}`);

      // Retry on empty response
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * (retryCount + 1));
        return fetchStooqRaw(stooqSymbol, retryCount + 1);
      }
      return null;
    }

    // Check if we got HTML instead of CSV (rate limited or error page)
    if (isHtmlResponse(csv)) {
      console.warn(`[Stooq] Got HTML instead of CSV for ${stooqSymbol} - may be rate limited`);

      // Retry with longer delay
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * 2 * (retryCount + 1));
        return fetchStooqRaw(stooqSymbol, retryCount + 1);
      }
      return null;
    }

    if (isDebugSymbol) {
      console.log(`[Stooq:DEBUG] Raw CSV for ${stooqSymbol}:\n${csv.substring(0, 300)}`);
    }

    const parsed = parseStooqCSV(csv, stooqSymbol);

    if (!parsed) {
      // Retry on parse failure
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * (retryCount + 1));
        return fetchStooqRaw(stooqSymbol, retryCount + 1);
      }
      return null;
    }

    // Use open as previous close (Stooq quote API doesn't provide prev close)
    const previousClose = parsed.open;

    if (isDebugSymbol) {
      console.log(`[Stooq:DEBUG] SUCCESS ${stooqSymbol}: price=${parsed.close}, open=${parsed.open}, date=${parsed.date}`);
    }

    return {
      price: parsed.close,
      previousClose,
      date: parsed.date,
      rawCsv: csv,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Stooq] Timeout for ${stooqSymbol}`);
    } else {
      console.error(`[Stooq] Fetch error for ${stooqSymbol}:`, error);
    }

    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      await sleep(RETRY_BACKOFF_MS * (retryCount + 1));
      return fetchStooqRaw(stooqSymbol, retryCount + 1);
    }
    return null;
  }
}

/**
 * Fetch indicator from Stooq (single symbol)
 */
export async function fetchStooqIndicator(logicalTicker: string): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  const stooqSymbol = STOOQ_SYMBOLS[logicalTicker];

  if (!stooqSymbol) {
    return {
      indicator: {
        displayName: logicalTicker,
        session: 'NA',
        source: 'STOOQ' as DataSource,
      },
      capability: {
        ok: false,
        reason: `${logicalTicker} not mapped to Stooq symbol`,
        sourceUsed: 'STOOQ' as DataSource,
      },
    };
  }

  const cacheKey = `stooq:${stooqSymbol}`;
  const isDebugSymbol = DEBUG_SYMBOLS.includes(stooqSymbol.toLowerCase());

  try {
    // Use singleFlightWithLKG for automatic last-known-good fallback
    const result = await cache.singleFlightWithLKG(
      cacheKey,
      () => fetchStooqRaw(stooqSymbol),
      { ttlMs: CACHE_TTL.QUOTES }
    );

    const data = result.data;
    const isStale = result.isStale || false;

    if (!data) {
      if (isDebugSymbol) {
        console.error(`[Stooq:DEBUG] No data available for ${logicalTicker} (${stooqSymbol}) - no cache fallback`);
      }
      return {
        indicator: {
          displayName: logicalTicker,
          session: 'NA',
          source: 'STOOQ' as DataSource,
        },
        capability: {
          ok: false,
          resolvedSymbol: stooqSymbol,
          reason: 'No data from Stooq',
          sourceUsed: 'STOOQ' as DataSource,
        },
      };
    }

    if (isStale && isDebugSymbol) {
      console.log(`[Stooq:DEBUG] Using stale/LKG data for ${logicalTicker} (${result.ageSeconds}s old)`);
    }

    const change = data.price - data.previousClose;
    const changePct = data.previousClose !== 0 ? (change / data.previousClose) * 100 : 0;

    return {
      indicator: {
        displayName: logicalTicker,
        price: data.price,
        previousClose: data.previousClose,
        change,
        changePct,
        session: 'CLOSE',
        asOfET: getETTimestamp(),
        source: 'STOOQ' as DataSource,
      },
      capability: {
        ok: true,
        resolvedSymbol: stooqSymbol,
        sourceUsed: 'STOOQ' as DataSource,
        isStale,
      },
    };
  } catch (error) {
    console.error(`[Stooq] Error for ${logicalTicker}:`, error);
    return {
      indicator: {
        displayName: logicalTicker,
        session: 'NA',
        source: 'STOOQ' as DataSource,
      },
      capability: {
        ok: false,
        resolvedSymbol: stooqSymbol,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        sourceUsed: 'STOOQ' as DataSource,
      },
    };
  }
}

/**
 * Fetch multiple Stooq indicators SEQUENTIALLY with delays
 * This is critical for avoiding rate limits on Netlify
 */
export async function fetchStooqIndicatorsSequential(tickers: string[]): Promise<{
  indicators: Record<string, Indicator>;
  capabilities: Record<string, Capability>;
}> {
  const indicators: Record<string, Indicator> = {};
  const capabilities: Record<string, Capability> = {};

  console.log(`[Stooq] Fetching ${tickers.length} symbols sequentially with ${STOOQ_REQUEST_DELAY_MS}ms delay`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];

    // Add delay between requests (except for the first one)
    if (i > 0) {
      await sleep(STOOQ_REQUEST_DELAY_MS);
    }

    try {
      const result = await fetchStooqIndicator(ticker);
      indicators[ticker] = result.indicator;
      capabilities[ticker] = result.capability;
    } catch (error) {
      console.error(`[Stooq] Error fetching ${ticker}:`, error);
      indicators[ticker] = {
        displayName: ticker,
        session: 'NA',
        source: 'STOOQ' as DataSource,
      };
      capabilities[ticker] = {
        ok: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        sourceUsed: 'STOOQ' as DataSource,
      };
    }
  }

  const successCount = Object.values(capabilities).filter(c => c.ok).length;
  console.log(`[Stooq] Completed: ${successCount}/${tickers.length} symbols successful`);

  return { indicators, capabilities };
}

/**
 * Debug function - fetch and return raw data for a symbol
 */
export async function debugStooqSymbol(logicalTicker: string): Promise<{
  logicalTicker: string;
  stooqSymbol: string | null;
  success: boolean;
  data: {
    price?: number;
    previousClose?: number;
    change?: number;
    changePct?: number;
    date?: string;
    rawCsv?: string;
  } | null;
  error?: string;
}> {
  const stooqSymbol = STOOQ_SYMBOLS[logicalTicker];

  if (!stooqSymbol) {
    return {
      logicalTicker,
      stooqSymbol: null,
      success: false,
      data: null,
      error: `No Stooq symbol mapping for ${logicalTicker}`,
    };
  }

  try {
    const result = await fetchStooqRaw(stooqSymbol);

    if (!result) {
      return {
        logicalTicker,
        stooqSymbol,
        success: false,
        data: null,
        error: 'Stooq returned no data',
      };
    }

    const change = result.price - result.previousClose;
    const changePct = result.previousClose !== 0 ? (change / result.previousClose) * 100 : 0;

    return {
      logicalTicker,
      stooqSymbol,
      success: true,
      data: {
        price: result.price,
        previousClose: result.previousClose,
        change,
        changePct,
        date: result.date,
        rawCsv: result.rawCsv,
      },
    };
  } catch (error) {
    return {
      logicalTicker,
      stooqSymbol,
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
