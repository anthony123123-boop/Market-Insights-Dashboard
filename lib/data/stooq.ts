import { cache, CACHE_TTL } from './cache';
import type { Indicator, Capability, DataSource } from '../types';
import { getETTimestamp } from '../time';

/**
 * Stooq - Free data source for VIX and volatility indices
 * No API key required, CSV format
 * https://stooq.com/
 */

const STOOQ_BASE_URL = 'https://stooq.com/q/l/';

/**
 * Symbol mapping for Stooq
 */
export const STOOQ_SYMBOLS: Record<string, string> = {
  VIX: '^vix',
  VVIX: '^vvix',
  VIX9D: '^vix9d',
  VIX3M: '^vix3m',
  SKEW: '^skew',
  MOVE: '^move',
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
 */
function parseStooqCSV(csv: string): {
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
  if (lines.length < 2) return null;

  const values = lines[1].split(',');
  if (values.length < 8) return null;

  const close = parseFloat(values[6]);
  if (isNaN(close) || close === 0) return null;

  return {
    symbol: values[0],
    date: values[1],
    time: values[2],
    open: parseFloat(values[3]),
    high: parseFloat(values[4]),
    low: parseFloat(values[5]),
    close,
    volume: parseFloat(values[7]) || 0,
  };
}

/**
 * Fetch quote from Stooq
 */
async function fetchStooqQuoteRaw(stooqSymbol: string): Promise<{
  price: number;
  previousClose: number;
  date: string;
} | null> {
  try {
    // Fetch current quote
    const url = `${STOOQ_BASE_URL}?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)',
      },
    });

    if (!response.ok) {
      console.warn(`Stooq request failed: ${response.status}`);
      return null;
    }

    const csv = await response.text();
    const parsed = parseStooqCSV(csv);

    if (!parsed) {
      console.warn(`Stooq CSV parse failed for ${stooqSymbol}`);
      return null;
    }

    // For previous close, we need historical data
    // Stooq provides previous day data in their historical endpoint
    const histUrl = `${STOOQ_BASE_URL}?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv&d1=${getYesterdayDate()}&d2=${getTodayDate()}`;

    let previousClose = parsed.open; // Fallback to open as approximation

    try {
      const histResponse = await fetch(histUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)',
        },
      });

      if (histResponse.ok) {
        const histCsv = await histResponse.text();
        const histLines = histCsv.trim().split('\n');

        // If we have 2+ data rows, second-to-last is previous day
        if (histLines.length >= 3) {
          const prevValues = histLines[histLines.length - 1].split(',');
          const prevClose = parseFloat(prevValues[6]);
          if (!isNaN(prevClose) && prevClose > 0) {
            previousClose = prevClose;
          }
        }
      }
    } catch (e) {
      console.warn('Stooq historical fetch failed, using open as previous close');
    }

    return {
      price: parsed.close,
      previousClose,
      date: parsed.date,
    };
  } catch (error) {
    console.error(`Stooq fetch error for ${stooqSymbol}:`, error);
    return null;
  }
}

/**
 * Get today's date in YYYYMMDD format
 */
function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Get yesterday's date in YYYYMMDD format
 */
function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 5); // Go back 5 days to ensure we get previous trading day
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
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
        reason: `No Stooq symbol mapping for ${logicalTicker}`,
        sourceUsed: 'STOOQ' as DataSource,
      },
    };
  }

  const cacheKey = `stooq:${stooqSymbol}`;

  try {
    const result = await cache.singleFlight(
      cacheKey,
      () => fetchStooqQuoteRaw(stooqSymbol),
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
          resolvedSymbol: stooqSymbol,
          reason: 'No data from Stooq',
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
        resolvedSymbol: stooqSymbol,
        sourceUsed: 'STOOQ' as DataSource,
      },
    };
  } catch (error) {
    console.error(`Stooq fetch error for ${logicalTicker}:`, error);
    return {
      indicator: {
        displayName: logicalTicker,
        session: 'NA',
        source: 'STOOQ' as DataSource,
      },
      capability: {
        ok: false,
        resolvedSymbol: stooqSymbol,
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
