import { cache, CACHE_TTL } from './cache';
import type { Indicator, Capability, DataSource } from '../types';
import { getETTimestamp } from '../time';

/**
 * FRED - Federal Reserve Economic Data
 * Free API with key, rate limited to 120 requests/minute
 * https://fred.stlouisfed.org/docs/api/fred/
 */

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

/**
 * FRED series IDs for treasury yields and economic indicators
 */
export const FRED_SERIES: Record<string, { seriesId: string; displayName: string }> = {
  // VIX - CBOE Volatility Index (PRIMARY source for VIX)
  VIX: { seriesId: 'VIXCLS', displayName: 'VIX' },

  // Treasury Yields
  TNX: { seriesId: 'DGS10', displayName: '10Y Treasury' },
  IRX: { seriesId: 'DGS3MO', displayName: '3M T-Bill' },
  FVX: { seriesId: 'DGS5', displayName: '5Y Treasury' },
  TYX: { seriesId: 'DGS30', displayName: '30Y Treasury' },

  // Additional rates for yield curve
  DGS2: { seriesId: 'DGS2', displayName: '2Y Treasury' },
  DGS1: { seriesId: 'DGS1', displayName: '1Y Treasury' },
};

/**
 * Get all tickers supported by FRED
 */
export function getFredTickers(): string[] {
  return Object.keys(FRED_SERIES);
}

/**
 * Get FRED API key
 */
function getAPIKey(): string | null {
  return process.env.FRED_API_KEY || null;
}

/**
 * Check if FRED is available
 */
export function isFredAvailable(): boolean {
  return !!getAPIKey();
}

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

/**
 * Fetch series data from FRED
 */
async function fetchFredSeriesRaw(seriesId: string): Promise<{
  price: number;
  previousClose: number;
  date: string;
} | null> {
  const apiKey = getAPIKey();

  if (!apiKey) {
    console.warn('FRED API key not set');
    return null;
  }

  try {
    // Fetch last 10 observations to get current and previous values
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&sort_order=desc&limit=10`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`FRED request failed: ${response.status}`);
      return null;
    }

    const data: FredResponse = await response.json();

    if (!data.observations || data.observations.length < 2) {
      console.warn(`FRED insufficient data for ${seriesId}`);
      return null;
    }

    // Find last two valid observations (skip "." values which mean no data)
    const validObs = data.observations.filter((obs) => obs.value !== '.');

    if (validObs.length < 2) {
      console.warn(`FRED insufficient valid data for ${seriesId}`);
      return null;
    }

    const latest = validObs[0];
    const previous = validObs[1];

    const price = parseFloat(latest.value);
    const previousClose = parseFloat(previous.value);

    if (isNaN(price) || isNaN(previousClose)) {
      return null;
    }

    return {
      price,
      previousClose,
      date: latest.date,
    };
  } catch (error) {
    console.error(`FRED fetch error for ${seriesId}:`, error);
    return null;
  }
}

/**
 * Fetch indicator from FRED
 */
export async function fetchFredIndicator(logicalTicker: string): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  const fredInfo = FRED_SERIES[logicalTicker];

  if (!fredInfo) {
    return {
      indicator: {
        displayName: logicalTicker,
        session: 'NA',
        source: 'FRED' as DataSource,
      },
      capability: {
        ok: false,
        reason: `No FRED series mapping for ${logicalTicker}`,
        sourceUsed: 'FRED' as DataSource,
      },
    };
  }

  if (!isFredAvailable()) {
    return {
      indicator: {
        displayName: fredInfo.displayName,
        session: 'NA',
        source: 'FRED' as DataSource,
      },
      capability: {
        ok: false,
        reason: 'FRED API key not configured',
        sourceUsed: 'FRED' as DataSource,
      },
    };
  }

  const cacheKey = `fred:${fredInfo.seriesId}`;

  try {
    // Use singleFlightWithLKG for automatic last-known-good fallback
    const result = await cache.singleFlightWithLKG(
      cacheKey,
      () => fetchFredSeriesRaw(fredInfo.seriesId),
      { ttlMs: CACHE_TTL.QUOTES }
    );

    const data = result.data;
    const isStale = result.isStale || false;

    if (!data) {
      console.warn(`[FRED] No data available for ${logicalTicker} (${fredInfo.seriesId})`);
      return {
        indicator: {
          displayName: fredInfo.displayName,
          session: 'NA',
          source: 'FRED' as DataSource,
        },
        capability: {
          ok: false,
          resolvedSymbol: fredInfo.seriesId,
          reason: 'No data from FRED',
          sourceUsed: 'FRED' as DataSource,
        },
      };
    }

    if (isStale) {
      console.log(`[FRED] Using stale/LKG data for ${logicalTicker} (${result.ageSeconds}s old)`);
    }

    const change = data.price - data.previousClose;
    const changePct = data.previousClose !== 0 ? (change / data.previousClose) * 100 : 0;

    return {
      indicator: {
        displayName: fredInfo.displayName,
        price: data.price,
        previousClose: data.previousClose,
        change,
        changePct,
        session: 'CLOSE',
        asOfET: getETTimestamp(),
        source: 'FRED' as DataSource,
      },
      capability: {
        ok: true,
        resolvedSymbol: fredInfo.seriesId,
        sourceUsed: 'FRED' as DataSource,
        isStale,
      },
    };
  } catch (error) {
    console.error(`FRED fetch error for ${logicalTicker}:`, error);
    return {
      indicator: {
        displayName: fredInfo.displayName,
        session: 'NA',
        source: 'FRED' as DataSource,
      },
      capability: {
        ok: false,
        resolvedSymbol: fredInfo.seriesId,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceUsed: 'FRED' as DataSource,
      },
    };
  }
}

/**
 * Fetch 10Y-2Y spread from FRED (for yield curve)
 */
export async function fetchYieldSpread(): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  if (!isFredAvailable()) {
    return {
      indicator: {
        displayName: '10Y-2Y Spread',
        session: 'NA',
        source: 'FRED' as DataSource,
      },
      capability: {
        ok: false,
        reason: 'FRED API key not configured',
        sourceUsed: 'FRED' as DataSource,
      },
    };
  }

  const cacheKey = 'fred:yield-spread';

  try {
    // Use singleFlightWithLKG for automatic last-known-good fallback
    const result = await cache.singleFlightWithLKG(
      cacheKey,
      async () => {
        const [tenYear, twoYear] = await Promise.all([
          fetchFredSeriesRaw('DGS10'),
          fetchFredSeriesRaw('DGS2'),
        ]);

        if (!tenYear || !twoYear) {
          return null;
        }

        return {
          spread: tenYear.price - twoYear.price,
          prevSpread: tenYear.previousClose - twoYear.previousClose,
          date: tenYear.date,
        };
      },
      { ttlMs: CACHE_TTL.QUOTES }
    );

    const data = result.data;
    const isStale = result.isStale || false;

    if (!data) {
      return {
        indicator: {
          displayName: '10Y-2Y Spread',
          session: 'NA',
          source: 'FRED' as DataSource,
        },
        capability: {
          ok: false,
          reason: 'Could not fetch yield data',
          sourceUsed: 'FRED' as DataSource,
        },
      };
    }

    const change = data.spread - data.prevSpread;
    const changePct = data.prevSpread !== 0 ? (change / Math.abs(data.prevSpread)) * 100 : 0;

    return {
      indicator: {
        displayName: '10Y-2Y Spread',
        price: data.spread,
        previousClose: data.prevSpread,
        change,
        changePct,
        session: 'CLOSE',
        asOfET: getETTimestamp(),
        source: 'FRED' as DataSource,
      },
      capability: {
        ok: true,
        resolvedSymbol: 'DGS10-DGS2',
        sourceUsed: 'FRED' as DataSource,
        isStale,
      },
    };
  } catch (error) {
    console.error('FRED yield spread fetch error:', error);
    return {
      indicator: {
        displayName: '10Y-2Y Spread',
        session: 'NA',
        source: 'FRED' as DataSource,
      },
      capability: {
        ok: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceUsed: 'FRED' as DataSource,
      },
    };
  }
}

/**
 * Check if a ticker is supported by FRED
 */
export function isFredTicker(ticker: string): boolean {
  return ticker in FRED_SERIES;
}
