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
 */

const STOOQ_BASE_URL = 'https://stooq.com/q/l/';

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
 * Parse Stooq CSV response
 * Format: Symbol,Date,Time,Open,High,Low,Close,Volume
 */
function parseStooqCSV(csv: string, requestedSymbol: string): StooqParseResult | null {
  const lines = csv.trim().split('\n');

  if (lines.length < 2) {
    console.warn(`[Stooq] CSV too short for ${requestedSymbol}: ${lines.length} lines`);
    return null;
  }

  const header = lines[0].toLowerCase();
  const dataLine = lines[1];

  // Verify header format
  if (!header.includes('symbol') || !header.includes('close')) {
    console.warn(`[Stooq] Unexpected header for ${requestedSymbol}: ${header}`);
    return null;
  }

  const values = dataLine.split(',');

  // Check for "N/D" (No Data) markers
  if (values.some(v => v.trim() === 'N/D')) {
    console.warn(`[Stooq] No data (N/D) for ${requestedSymbol}`);
    return null;
  }

  // Check we have enough fields
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
    open: isNaN(open) ? close : open,
    high: parseFloat(values[4]) || close,
    low: parseFloat(values[5]) || close,
    close,
    volume: parseFloat(values[7]) || 0,
  };
}

// Symbols to log detailed diagnostics for
const DEBUG_SYMBOLS = ['spy.us', 'qqq.us', 'gld.us', 'uup.us'];

/**
 * Fetch raw quote from Stooq
 */
async function fetchStooqRaw(stooqSymbol: string): Promise<{
  price: number;
  previousClose: number;
  date: string;
  rawCsv: string;
} | null> {
  // Stooq CSV endpoint: s=symbol, f=fields, h=header, e=csv
  // Fields: s=symbol, d2=date, t2=time, o=open, h=high, l=low, c=close, v=volume
  const url = `${STOOQ_BASE_URL}?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
  const isDebugSymbol = DEBUG_SYMBOLS.includes(stooqSymbol.toLowerCase());

  if (isDebugSymbol) {
    console.log(`[Stooq:DEBUG] Fetching ${stooqSymbol} from URL: ${url}`);
  } else {
    console.log(`[Stooq] Fetching: ${stooqSymbol}`);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv, text/plain, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (isDebugSymbol) {
        console.error(`[Stooq:DEBUG] HTTP ${response.status} for ${stooqSymbol} - FAILED`);
      } else {
        console.warn(`[Stooq] HTTP ${response.status} for ${stooqSymbol}`);
      }
      return null;
    }

    const csv = await response.text();

    if (!csv || csv.length < 20) {
      if (isDebugSymbol) {
        console.error(`[Stooq:DEBUG] Empty response for ${stooqSymbol}, length=${csv?.length || 0}`);
      } else {
        console.warn(`[Stooq] Empty response for ${stooqSymbol}`);
      }
      return null;
    }

    if (isDebugSymbol) {
      console.log(`[Stooq:DEBUG] Raw CSV for ${stooqSymbol}:\n${csv.substring(0, 200)}`);
    }

    const parsed = parseStooqCSV(csv, stooqSymbol);

    if (!parsed) {
      if (isDebugSymbol) {
        console.error(`[Stooq:DEBUG] Failed to parse CSV for ${stooqSymbol}`);
      }
      return null;
    }

    // Use open as previous close (Stooq doesn't provide prev close in quote API)
    // This is an approximation - for more accurate prev close, would need historical data
    const previousClose = parsed.open;

    if (isDebugSymbol) {
      console.log(`[Stooq:DEBUG] SUCCESS ${stooqSymbol}: price=${parsed.close}, open=${parsed.open}, date=${parsed.date}`);
    } else {
      console.log(`[Stooq] Success: ${stooqSymbol} price=${parsed.close} open=${parsed.open}`);
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
    return null;
  }
}

/**
 * Fetch indicator from Stooq
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
        displayName: `${logicalTicker} (Stooq)${isStale ? ' [cached]' : ''}`,
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
