import { cache, CACHE_TTL } from './cache';
import type { Indicator, Capability, DataSource } from '../types';
import { getETTimestamp } from '../time';

const AV_BASE_URL = 'https://www.alphavantage.co/query';

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
 * Fetch FX rate from Alpha Vantage
 */
async function fetchFXDailyRaw(fromCurrency: string, toCurrency: string): Promise<AVFXDaily | null> {
  const apiKey = getAPIKey();
  if (!apiKey) {
    console.warn('Alpha Vantage API key not set');
    return null;
  }

  const url = `${AV_BASE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Alpha Vantage request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check for rate limiting
    if (data.Note || data.Information) {
      console.warn('Alpha Vantage rate limited:', data.Note || data.Information);
      return null;
    }

    // Check for error
    if (data['Error Message']) {
      console.warn('Alpha Vantage error:', data['Error Message']);
      return null;
    }

    return data as AVFXDaily;
  } catch (error) {
    console.error('Alpha Vantage fetch error:', error);
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
          reason: 'No data from Alpha Vantage',
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
          reason: 'Insufficient data from Alpha Vantage',
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
        displayName: logicalTicker,
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
    console.error(`Failed to fetch FX ${logicalTicker} from Alpha Vantage:`, error);
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
