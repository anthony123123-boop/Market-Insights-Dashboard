import { cache, CACHE_TTL } from './cache';
import type { Indicator, Capability, DataSource } from '../types';
import { getETTimestamp } from '../time';

/**
 * Stooq - Free data source for VIX and volatility indices
 * No API key required, CSV format
 * https://stooq.com/
 *
 * Note: Stooq's free CSV API has limitations and may not always return data.
 * VIX data availability can be inconsistent.
 */

const STOOQ_BASE_URL = 'https://stooq.com/q/l/';

/**
 * Symbol mapping for Stooq
 * Stooq uses .us suffix for US indices
 */
export const STOOQ_SYMBOLS: Record<string, string> = {
  VIX: '^vix',       // CBOE VIX
  VVIX: '^vvix',     // CBOE VVIX
  VIX9D: '^vix9d',   // 9-Day VIX
  VIX3M: '^vix3m',   // 3-Month VIX
  SKEW: '^skew',     // CBOE SKEW
  MOVE: '^move',     // ICE MOVE Index
};

/**
 * Alternative Stooq symbol formats to try if primary fails
 */
const STOOQ_SYMBOL_ALTERNATIVES: Record<string, string[]> = {
  VIX: ['^vix', 'vix.us', '^vix.us'],
  VVIX: ['^vvix', 'vvix.us'],
  VIX9D: ['^vix9d', 'vix9d.us'],
  VIX3M: ['^vix3m', 'vix3m.us'],
  SKEW: ['^skew', 'skew.us'],
  MOVE: ['^move', 'move.us'],
};

/**
 * Get all tickers supported by Stooq
 */
export function getStooqTickers(): string[] {
  return Object.keys(STOOQ_SYMBOLS);
}

/**
 * Parse Stooq CSV response
 * Format: Symbol,Date,Time,Open,High,Low,Close,Volume
 * Some responses may have different field counts
 */
function parseStooqCSV(csv: string, symbol: string): {
  symbol: string;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
} | null {
  const lines = csv.trim().split('\n');

  // Need at least header + 1 data row
  if (lines.length < 2) {
    console.warn(`[Stooq] CSV too short for ${symbol}: ${lines.length} lines`);
    return null;
  }

  const header = lines[0].toLowerCase();
  const dataLine = lines[1];

  // Check if this looks like a valid response
  if (!header.includes('symbol') && !header.includes('date')) {
    console.warn(`[Stooq] Unexpected header for ${symbol}: ${header}`);
    return null;
  }

  const values = dataLine.split(',');

  // Handle "N/D" (No Data) responses
  if (values.some(v => v.trim() === 'N/D' || v.trim() === '')) {
    console.warn(`[Stooq] No data marker found for ${symbol}`);
    return null;
  }

  // Try to find close price - it could be in different positions
  // Standard format: Symbol,Date,Time,Open,High,Low,Close,Volume
  let close = 0;

  if (values.length >= 7) {
    close = parseFloat(values[6]);
  } else if (values.length >= 5) {
    // Try last numeric value
    for (let i = values.length - 1; i >= 0; i--) {
      const num = parseFloat(values[i]);
      if (!isNaN(num) && num > 0) {
        close = num;
        break;
      }
    }
  }

  if (isNaN(close) || close === 0) {
    console.warn(`[Stooq] Invalid close price for ${symbol}: ${dataLine}`);
    return null;
  }

  return {
    symbol: values[0] || symbol,
    date: values[1] || '',
    time: values[2] || '',
    open: parseFloat(values[3]) || close,
    high: parseFloat(values[4]) || close,
    low: parseFloat(values[5]) || close,
    close,
    volume: parseFloat(values[7]) || 0,
  };
}

/**
 * Fetch quote from Stooq using a specific symbol format
 */
async function fetchStooqWithSymbol(stooqSymbol: string): Promise<{
  price: number;
  previousClose: number;
  date: string;
  rawCsv: string;
} | null> {
  try {
    // Stooq CSV endpoint with specific fields
    const url = `${STOOQ_BASE_URL}?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;

    console.log(`[Stooq] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv, text/plain, */*',
      },
    });

    if (!response.ok) {
      console.warn(`[Stooq] HTTP ${response.status} for ${stooqSymbol}`);
      return null;
    }

    const csv = await response.text();
    console.log(`[Stooq] Response for ${stooqSymbol}: ${csv.substring(0, 200)}`);

    const parsed = parseStooqCSV(csv, stooqSymbol);

    if (!parsed) {
      return null;
    }

    // Use open price as previous close approximation
    // (Stooq doesn't provide previous close directly in quote endpoint)
    const previousClose = parsed.open || parsed.close;

    return {
      price: parsed.close,
      previousClose,
      date: parsed.date,
      rawCsv: csv,
    };
  } catch (error) {
    console.error(`[Stooq] Fetch error for ${stooqSymbol}:`, error);
    return null;
  }
}

/**
 * Fetch quote from Stooq, trying multiple symbol formats
 */
async function fetchStooqQuoteRaw(logicalTicker: string): Promise<{
  price: number;
  previousClose: number;
  date: string;
  usedSymbol: string;
} | null> {
  const alternatives = STOOQ_SYMBOL_ALTERNATIVES[logicalTicker] || [STOOQ_SYMBOLS[logicalTicker]];

  // Try each symbol format
  for (const stooqSymbol of alternatives) {
    if (!stooqSymbol) continue;

    const result = await fetchStooqWithSymbol(stooqSymbol);
    if (result) {
      console.log(`[Stooq] Success for ${logicalTicker} using ${stooqSymbol}`);
      return {
        price: result.price,
        previousClose: result.previousClose,
        date: result.date,
        usedSymbol: stooqSymbol,
      };
    }
  }

  console.warn(`[Stooq] All symbol formats failed for ${logicalTicker}`);
  return null;
}

/**
 * Fetch indicator from Stooq
 */
export async function fetchStooqIndicator(logicalTicker: string): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  if (!(logicalTicker in STOOQ_SYMBOLS)) {
    return {
      indicator: {
        displayName: logicalTicker,
        session: 'NA',
        source: 'STOOQ' as DataSource,
      },
      capability: {
        ok: false,
        reason: `${logicalTicker} not supported by Stooq`,
        sourceUsed: 'STOOQ' as DataSource,
      },
    };
  }

  const cacheKey = `stooq:${logicalTicker}`;

  try {
    const result = await cache.singleFlight(
      cacheKey,
      () => fetchStooqQuoteRaw(logicalTicker),
      { ttlMs: CACHE_TTL.QUOTES }
    );

    const data = result.data;

    if (!data) {
      return {
        indicator: {
          displayName: logicalTicker,
          session: 'NA',
          source: 'STOOQ' as DataSource,
        },
        capability: {
          ok: false,
          resolvedSymbol: STOOQ_SYMBOLS[logicalTicker],
          reason: 'No data from Stooq (VIX indices may be temporarily unavailable)',
          sourceUsed: 'STOOQ' as DataSource,
        },
      };
    }

    const change = data.price - data.previousClose;
    const changePct = data.previousClose !== 0 ? (change / data.previousClose) * 100 : 0;

    return {
      indicator: {
        displayName: `${logicalTicker} (Stooq)`,
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
        resolvedSymbol: data.usedSymbol,
        sourceUsed: 'STOOQ' as DataSource,
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
        resolvedSymbol: STOOQ_SYMBOLS[logicalTicker],
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceUsed: 'STOOQ' as DataSource,
      },
    };
  }
}

/**
 * Check if a ticker is supported by Stooq
 */
export function isStooqTicker(ticker: string): boolean {
  return ticker in STOOQ_SYMBOLS;
}

/**
 * Debug function to test Stooq for a specific symbol
 */
export async function debugStooqSymbol(logicalTicker: string): Promise<{
  logicalTicker: string;
  symbolsTried: string[];
  success: boolean;
  data: {
    price?: number;
    previousClose?: number;
    date?: string;
    usedSymbol?: string;
    rawCsv?: string;
  } | null;
  error?: string;
}> {
  const alternatives = STOOQ_SYMBOL_ALTERNATIVES[logicalTicker] || [STOOQ_SYMBOLS[logicalTicker]];

  for (const stooqSymbol of alternatives) {
    if (!stooqSymbol) continue;

    try {
      const result = await fetchStooqWithSymbol(stooqSymbol);
      if (result) {
        return {
          logicalTicker,
          symbolsTried: alternatives,
          success: true,
          data: {
            price: result.price,
            previousClose: result.previousClose,
            date: result.date,
            usedSymbol: stooqSymbol,
            rawCsv: result.rawCsv,
          },
        };
      }
    } catch (error) {
      // Continue to next alternative
    }
  }

  return {
    logicalTicker,
    symbolsTried: alternatives,
    success: false,
    data: null,
    error: 'All symbol formats failed',
  };
}
