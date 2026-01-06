import type { Capability, DataSource } from '../types';

/**
 * Data source routing - maps each ticker to its primary data source
 *
 * Sources (Priority Order for Swing/Long-Term):
 * - STOOQ: PRIMARY for US ETFs/equities (free, no API key, reliable)
 * - FRED: PRIMARY for VIX (VIXCLS) and Treasury yields (free with API key)
 * - AV (Alpha Vantage): FALLBACK only (25 req/day limit on free tier)
 * - PROXY: Derived/calculated indicators
 *
 * Note: VVIX, VIX9D, VIX3M, SKEW, MOVE are optional - scoring works without them
 */

export type TickerSource = 'AV' | 'STOOQ' | 'FRED' | 'PROXY';

/**
 * Priority tickers for swing/long-term analysis
 * These must always have data (from cache if fetch fails)
 */
export const PRIORITY_TICKERS = [
  // Core ETFs
  'SPY', 'QQQ', 'IWM', 'GLD', 'HYG', 'LQD', 'TLT',
  // Rates
  'TNX', 'DGS2', 'IRX',
  // Sectors
  'XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC',
] as const;

/**
 * Optional tickers - scoring works if these are unavailable
 */
export const OPTIONAL_TICKERS = [
  'VVIX', 'VIX9D', 'VIX3M', 'SKEW', 'MOVE',
] as const;

/**
 * Source routing for each ticker
 */
export const TICKER_SOURCES: Record<string, TickerSource> = {
  // VIX - FRED PRIMARY (VIXCLS series, very reliable)
  VIX: 'FRED',

  // Optional volatility indices - marked but may not be available
  // These don't break scoring if missing
  VVIX: 'STOOQ',
  VIX9D: 'STOOQ',
  VIX3M: 'STOOQ',
  SKEW: 'STOOQ',
  MOVE: 'STOOQ',

  // Treasury yields - FRED (free with key)
  TNX: 'FRED',
  IRX: 'FRED',
  FVX: 'FRED',
  TYX: 'FRED',
  DGS2: 'FRED',
  DGS1: 'FRED',

  // Core ETFs - STOOQ PRIMARY (free, no key, uses .us suffix)
  SPY: 'STOOQ',
  QQQ: 'STOOQ',
  IWM: 'STOOQ',
  RSP: 'STOOQ',
  HYG: 'STOOQ',
  LQD: 'STOOQ',
  TLT: 'STOOQ',
  SHY: 'STOOQ',
  UUP: 'STOOQ',
  FXY: 'STOOQ',
  GLD: 'STOOQ',
  SLV: 'STOOQ',
  USO: 'STOOQ',
  DBA: 'STOOQ',

  // Sector ETFs - STOOQ PRIMARY
  XLK: 'STOOQ',
  XLF: 'STOOQ',
  XLI: 'STOOQ',
  XLE: 'STOOQ',
  XLV: 'STOOQ',
  XLP: 'STOOQ',
  XLU: 'STOOQ',
  XLRE: 'STOOQ',
  XLY: 'STOOQ',
  XLC: 'STOOQ',

  // FX - STOOQ via UUP proxy
  DXY: 'STOOQ', // Uses UUP as proxy
  EURUSD: 'AV', // Keep on AV as fallback
};

/**
 * Get the source for a ticker
 */
export function getTickerSource(ticker: string): TickerSource {
  if (isDerivedTicker(ticker)) return 'PROXY';
  return TICKER_SOURCES[ticker] || 'AV';
}

/**
 * Proxy mappings for when primary fails
 */
export const PROXY_MAPPINGS: Record<string, { proxy: string; label: string }> = {
  DXY: { proxy: 'UUP', label: 'USD proxy (UUP)' },
};

/**
 * Derived/calculated tickers (computed from other indicators)
 */
export const DERIVED_TICKERS = [
  'VIX_VVIX_RATIO',
  'HYG_LQD_RATIO',
  'YIELD_10Y_2Y',
  'RSP_SPY_RATIO',
  'IWM_SPY_RATIO',
] as const;

export type DerivedTicker = typeof DERIVED_TICKERS[number];

/**
 * Get components for derived tickers
 */
export function getDerivedComponents(ticker: DerivedTicker): { a: string; b: string; type: 'ratio' | 'spread' } {
  const mappings: Record<DerivedTicker, { a: string; b: string; type: 'ratio' | 'spread' }> = {
    VIX_VVIX_RATIO: { a: 'VIX', b: 'VVIX', type: 'ratio' },
    HYG_LQD_RATIO: { a: 'HYG', b: 'LQD', type: 'ratio' },
    YIELD_10Y_2Y: { a: 'TNX', b: 'IRX', type: 'spread' },
    RSP_SPY_RATIO: { a: 'RSP', b: 'SPY', type: 'ratio' },
    IWM_SPY_RATIO: { a: 'IWM', b: 'SPY', type: 'ratio' },
  };
  return mappings[ticker];
}

/**
 * Check if ticker is derived
 */
export function isDerivedTicker(ticker: string): ticker is DerivedTicker {
  return DERIVED_TICKERS.includes(ticker as DerivedTicker);
}

/**
 * All tickers that need to be fetched
 */
export function getAllTickers(): string[] {
  return [
    ...Object.keys(TICKER_SOURCES),
    ...DERIVED_TICKERS,
  ];
}

/**
 * Get base tickers (non-derived)
 */
export function getBaseTickers(): string[] {
  return Object.keys(TICKER_SOURCES);
}

/**
 * Get tickers by source
 */
export function getTickersBySource(source: TickerSource): string[] {
  return Object.entries(TICKER_SOURCES)
    .filter(([_, s]) => s === source)
    .map(([ticker]) => ticker);
}

/**
 * Create initial capabilities map
 */
export function createInitialCapabilities(): Record<string, Capability> {
  const capabilities: Record<string, Capability> = {};

  for (const ticker of getAllTickers()) {
    capabilities[ticker] = {
      ok: false,
      sourceUsed: getTickerSource(ticker) as DataSource,
    };
  }

  return capabilities;
}
