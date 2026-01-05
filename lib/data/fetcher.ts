import { fetchIndicators, fetchHistorical } from './yahoo';
import { fetchEURUSD, isAlphaVantageAvailable } from './alphavantage';
import { getBaseTickers, isDerivedTicker, getDerivedComponents, DERIVED_TICKERS } from './symbols';
import { cache, CACHE_TTL, generateCacheKey } from './cache';
import type { Indicator, Capability, CacheState, Warning } from '../types';
import { getETTimestamp } from '../time';
import { getDisplayName } from '../format';

interface FetchResult {
  indicators: Record<string, Indicator>;
  capabilities: Record<string, Capability>;
  warnings: Warning[];
  cacheState: CacheState;
  cacheAgeSeconds: number;
  pulledAtET: string;
  lastUpdatedET: string;
  dataAsOfET: string;
}

/**
 * Compute derived indicators from base indicators
 */
function computeDerivedIndicators(
  baseIndicators: Record<string, Indicator>,
  baseCapabilities: Record<string, Capability>
): {
  indicators: Record<string, Indicator>;
  capabilities: Record<string, Capability>;
  warnings: Warning[];
} {
  const indicators: Record<string, Indicator> = {};
  const capabilities: Record<string, Capability> = {};
  const warnings: Warning[] = [];

  for (const derivedTicker of DERIVED_TICKERS) {
    const components = getDerivedComponents(derivedTicker);
    const indicatorA = baseIndicators[components.a];
    const indicatorB = baseIndicators[components.b];

    // Check if both components are available
    if (
      !indicatorA?.price ||
      !indicatorB?.price ||
      !indicatorA?.previousClose ||
      !indicatorB?.previousClose
    ) {
      indicators[derivedTicker] = {
        displayName: getDisplayName(derivedTicker),
        session: 'NA',
        source: 'PROXY',
      };
      capabilities[derivedTicker] = {
        ok: false,
        reason: `Missing components: ${!indicatorA?.price ? components.a : ''} ${!indicatorB?.price ? components.b : ''}`.trim(),
      };
      warnings.push({
        code: 'DERIVED_MISSING',
        message: `Cannot compute ${derivedTicker}: missing ${!indicatorA?.price ? components.a : components.b}`,
      });
      continue;
    }

    let price: number;
    let previousClose: number;
    let change: number;
    let changePct: number;

    if (components.type === 'ratio') {
      // For ratios: A / B
      price = indicatorA.price / indicatorB.price;
      previousClose = indicatorA.previousClose / indicatorB.previousClose;
      change = price - previousClose;
      changePct = (change / previousClose) * 100;
    } else {
      // For spreads: A - B
      price = indicatorA.price - indicatorB.price;
      previousClose = indicatorA.previousClose - indicatorB.previousClose;
      change = price - previousClose;
      // For spreads, percentage change might be tricky if prev is near zero
      changePct = previousClose !== 0 ? (change / Math.abs(previousClose)) * 100 : 0;
    }

    indicators[derivedTicker] = {
      displayName: getDisplayName(derivedTicker),
      price,
      previousClose,
      change,
      changePct,
      session: indicatorA.session,
      asOfET: indicatorA.asOfET || indicatorB.asOfET,
      source: 'PROXY',
    };

    capabilities[derivedTicker] = {
      ok: true,
      resolvedSymbol: `${components.a}/${components.b}`,
      sourceUsed: 'PROXY',
    };
  }

  return { indicators, capabilities, warnings };
}

/**
 * Fetch all market data
 */
export async function fetchAllMarketData(settings?: {
  refreshInterval?: number;
  timeframes?: { short: { min: number; max: number }; medium: { min: number; max: number }; long: { min: number; max: number } };
  weightPreset?: string;
}): Promise<FetchResult> {
  const cacheKey = generateCacheKey('market:all', settings);
  const pulledAtET = getETTimestamp();

  // Check cache first
  const cached = cache.get<FetchResult>(cacheKey);
  if (cached.data && cached.state === 'CACHED') {
    return {
      ...cached.data,
      pulledAtET,
      cacheState: 'CACHED',
      cacheAgeSeconds: cached.ageSeconds,
    };
  }

  // Fetch base indicators
  const baseTickers = getBaseTickers();
  const { indicators: baseIndicators, capabilities: baseCapabilities } = await fetchIndicators(baseTickers);

  const allWarnings: Warning[] = [];

  // Try EURUSD from Alpha Vantage if Yahoo failed
  if (!baseCapabilities['EURUSD']?.ok && isAlphaVantageAvailable()) {
    try {
      const { indicator, capability } = await fetchEURUSD();
      baseIndicators['EURUSD'] = indicator;
      baseCapabilities['EURUSD'] = capability;
    } catch (error) {
      allWarnings.push({
        code: 'EURUSD_FALLBACK_FAILED',
        message: 'Failed to fetch EURUSD from Alpha Vantage',
      });
    }
  }

  // Compute derived indicators
  const { indicators: derivedIndicators, capabilities: derivedCapabilities, warnings: derivedWarnings } =
    computeDerivedIndicators(baseIndicators, baseCapabilities);

  // Merge all indicators
  const allIndicators: Record<string, Indicator> = {
    ...baseIndicators,
    ...derivedIndicators,
  };

  const allCapabilities: Record<string, Capability> = {
    ...baseCapabilities,
    ...derivedCapabilities,
  };

  allWarnings.push(...derivedWarnings);

  // Find latest data timestamp
  let latestAsOf = '';
  for (const indicator of Object.values(allIndicators)) {
    if (indicator.asOfET && indicator.asOfET > latestAsOf) {
      latestAsOf = indicator.asOfET;
    }
  }

  const lastUpdatedET = getETTimestamp();
  const dataAsOfET = latestAsOf || lastUpdatedET;

  const result: FetchResult = {
    indicators: allIndicators,
    capabilities: allCapabilities,
    warnings: allWarnings,
    cacheState: 'LIVE',
    cacheAgeSeconds: 0,
    pulledAtET,
    lastUpdatedET,
    dataAsOfET,
  };

  // Cache the result
  cache.set(cacheKey, result, { ttlMs: CACHE_TTL.ANALYSIS });

  return result;
}

/**
 * Fetch historical data for multiple symbols
 */
export async function fetchHistoricalData(
  symbols: string[],
  lookbackDays: number = 365
): Promise<Record<string, Array<{ date: Date; close: number; volume: number }>>> {
  const period1 = new Date();
  period1.setDate(period1.getDate() - lookbackDays);

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const data = await fetchHistorical(symbol, period1);
      return { symbol, data };
    })
  );

  const historical: Record<string, Array<{ date: Date; close: number; volume: number }>> = {};
  for (const { symbol, data } of results) {
    historical[symbol] = data;
  }

  return historical;
}
