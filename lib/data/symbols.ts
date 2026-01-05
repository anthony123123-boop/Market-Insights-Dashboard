import type { Capability, DataSource } from '../types';

/**
 * Data source routing - maps each ticker to its primary data source
 *
 * Sources:
 * - AV (Alpha Vantage): ETFs, equities, FX
 * - STOOQ: VIX and volatility indices (free, no API key)
 * - FRED: Treasury yields and economic data (free with API key)
 * - PROXY: Derived/calculated indicators
 */

export type TickerSource = 'AV' | 'STOOQ' | 'FRED' | 'PROXY';

/**
 * Source routing for each ticker
 */
export const TICKER_SOURCES: Record<string, TickerSource> = {
  // Volatility indices - Stooq (free, no key)
  VIX: 'STOOQ',
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

  // ETFs - Alpha Vantage
  SPY: 'AV',
  QQQ: 'AV',
  IWM: 'AV',
  RSP: 'AV',
  HYG: 'AV',
  LQD: 'AV',
  TLT: 'AV',
  SHY: 'AV',
  UUP: 'AV',
  FXY: 'AV',
  GLD: 'AV',
  SLV: 'AV',
  USO: 'AV',
  DBA: 'AV',

  // Sector ETFs - Alpha Vantage
  XLK: 'AV',
  XLF: 'AV',
  XLI: 'AV',
  XLE: 'AV',
  XLV: 'AV',
  XLP: 'AV',
  XLU: 'AV',
  XLRE: 'AV',
  XLY: 'AV',
  XLC: 'AV',

  // FX - Alpha Vantage
  DXY: 'AV', // Will use UUP as proxy
  EURUSD: 'AV',
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
