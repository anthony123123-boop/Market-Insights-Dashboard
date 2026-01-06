import { fetchStooqIndicator } from './stooq';
import { fetchFredIndicator, fetchYieldSpread, isFredAvailable } from './fred';
import { getBaseTickers, isDerivedTicker, getDerivedComponents, DERIVED_TICKERS, getTickerSource, OPTIONAL_TICKERS } from './symbols';
import { cache, CACHE_TTL, generateCacheKey } from './cache';
import type { Indicator, Capability, CacheState, Warning, DataSource } from '../types';
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
 * Check if a ticker is optional (scoring works without it)
 */
function isOptionalTicker(ticker: string): boolean {
  return (OPTIONAL_TICKERS as readonly string[]).includes(ticker);
}

/**
 * Fetch a single indicator from the appropriate source
 * Sources:
 * - STOOQ: PRIMARY for US ETFs/equities (uses .us suffix)
 * - FRED: PRIMARY for VIX (VIXCLS) and Treasury yields
 * - AV: Not used (25 req/day limit - too restrictive)
 */
async function fetchIndicatorBySource(ticker: string): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  const source = getTickerSource(ticker);

  switch (source) {
    case 'STOOQ':
      return fetchStooqIndicator(ticker);

    case 'FRED':
      return fetchFredIndicator(ticker);

    case 'AV':
      // AV is not used - return unavailable
      console.warn(`[Fetcher] Ticker ${ticker} mapped to AV but AV is disabled`);
      return {
        indicator: {
          displayName: ticker,
          session: 'NA',
          source: 'AV' as DataSource,
        },
        capability: {
          ok: false,
          reason: 'AlphaVantage disabled (25 req/day limit)',
          sourceUsed: 'AV' as DataSource,
        },
      };

    default:
      return {
        indicator: {
          displayName: ticker,
          session: 'NA',
          source: 'PROXY' as DataSource,
        },
        capability: {
          ok: false,
          reason: `Unknown source for ${ticker}`,
        },
      };
  }
}

/**
 * Fetch all base indicators in parallel (with rate limiting awareness)
 * Optional indicators (VVIX, VIX9D, VIX3M, SKEW, MOVE) don't generate warnings if missing.
 */
async function fetchAllBaseIndicators(tickers: string[]): Promise<{
  indicators: Record<string, Indicator>;
  capabilities: Record<string, Capability>;
  warnings: Warning[];
}> {
  const indicators: Record<string, Indicator> = {};
  const capabilities: Record<string, Capability> = {};
  const warnings: Warning[] = [];

  // Group tickers by source for efficient fetching
  const bySource: Record<string, string[]> = {
    AV: [],
    STOOQ: [],
    FRED: [],
  };

  for (const ticker of tickers) {
    const source = getTickerSource(ticker);
    if (source !== 'PROXY') {
      bySource[source] = bySource[source] || [];
      bySource[source].push(ticker);
    }
  }

  // Check data source availability - only warn for FRED (critical for VIX + rates)
  if (!isFredAvailable() && bySource.FRED.length > 0) {
    warnings.push({
      code: 'FRED_UNAVAILABLE',
      message: 'FRED API key not configured - VIX and Treasury yield data unavailable',
    });
  }

  // Note: We no longer warn about AV unavailability since Stooq is primary for ETFs

  // Fetch all indicators in parallel
  // With 60-minute cache, this happens at most once per hour
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const result = await fetchIndicatorBySource(ticker);

        // If fetch failed for an optional ticker, don't treat it as critical
        if (!result.capability.ok && isOptionalTicker(ticker)) {
          console.log(`[Fetcher] Optional ticker ${ticker} unavailable - this is OK`);
        }

        return { ticker, ...result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Only log errors for non-optional tickers
        if (!isOptionalTicker(ticker)) {
          console.error(`[Fetcher] Error fetching ${ticker}: ${errorMessage}`);
        }

        return {
          ticker,
          indicator: {
            displayName: ticker,
            session: 'NA' as const,
            source: getTickerSource(ticker) as DataSource,
          },
          capability: {
            ok: false,
            reason: `Error: ${errorMessage}`,
            sourceUsed: getTickerSource(ticker) as DataSource,
          },
        };
      }
    })
  );

  for (const { ticker, indicator, capability } of results) {
    indicators[ticker] = indicator;
    capabilities[ticker] = capability;
  }

  return { indicators, capabilities, warnings };
}

/**
 * Compute derived indicators from base indicators
 * Handles missing optional indicators gracefully (no warnings for optional)
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
    // Special handling for YIELD_10Y_2Y - use FRED's dedicated endpoint
    if (derivedTicker === 'YIELD_10Y_2Y' && isFredAvailable()) {
      // This will be computed separately
      continue;
    }

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
        sourceUsed: 'PROXY',
      };

      // Only warn if the missing component is NOT an optional ticker
      const missingComponent = !indicatorA?.price ? components.a : components.b;
      if (!isOptionalTicker(missingComponent)) {
        warnings.push({
          code: 'DERIVED_MISSING',
          message: `Cannot compute ${derivedTicker}: missing ${missingComponent}`,
        });
      }
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

    // Add source attribution to derived indicators
    const sourceA = indicatorA.source;
    const sourceB = indicatorB.source;
    const sourceSuffix = sourceA === sourceB ? `(${sourceA})` : `(${sourceA}/${sourceB})`;

    indicators[derivedTicker] = {
      displayName: `${getDisplayName(derivedTicker)} ${sourceSuffix}`,
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

  // Fetch base indicators from all sources
  const baseTickers = getBaseTickers();
  const { indicators: baseIndicators, capabilities: baseCapabilities, warnings: baseWarnings } =
    await fetchAllBaseIndicators(baseTickers);

  const allWarnings: Warning[] = [...baseWarnings];

  // Compute derived indicators
  const { indicators: derivedIndicators, capabilities: derivedCapabilities, warnings: derivedWarnings } =
    computeDerivedIndicators(baseIndicators, baseCapabilities);

  // Fetch YIELD_10Y_2Y directly from FRED if available
  if (isFredAvailable()) {
    try {
      const { indicator, capability } = await fetchYieldSpread();
      derivedIndicators['YIELD_10Y_2Y'] = indicator;
      derivedCapabilities['YIELD_10Y_2Y'] = capability;
    } catch (error) {
      allWarnings.push({
        code: 'YIELD_SPREAD_FAILED',
        message: 'Failed to fetch 10Y-2Y yield spread from FRED',
      });
    }
  }

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
 * Fetch historical data is not available with new sources
 * Returns empty for now - historical analysis would need a different approach
 */
export async function fetchHistoricalData(
  symbols: string[],
  lookbackDays: number = 365
): Promise<Record<string, Array<{ date: Date; close: number; volume: number }>>> {
  // Historical data not available from current sources
  // Would need to implement using Alpha Vantage TIME_SERIES_DAILY or similar
  return {};
}
