import type { Capability } from '../types';

/**
 * Symbol resolution mapping - maps logical tickers to Yahoo Finance symbols
 */
export const SYMBOL_CANDIDATES: Record<string, string[]> = {
  // Volatility
  VIX: ['^VIX'],
  VVIX: ['^VVIX'],
  VIX9D: ['^VIX9D', 'VIX9D'],
  VIX3M: ['^VIX3M', 'VIX3M'],
  SKEW: ['^SKEW'],
  MOVE: ['^MOVE', 'MOVE'],

  // Yields/Rates
  TNX: ['^TNX'],
  IRX: ['^IRX'],
  FVX: ['^FVX'],
  TYX: ['^TYX'],

  // Currency
  DXY: ['DX-Y.NYB', 'DX=F', '^DXY'],
  EURUSD: ['EURUSD=X', 'EUR=X'],
  USDJPY: ['USDJPY=X', 'JPY=X'],

  // ETFs (direct symbols)
  SPY: ['SPY'],
  QQQ: ['QQQ'],
  IWM: ['IWM'],
  RSP: ['RSP'],
  HYG: ['HYG'],
  LQD: ['LQD'],
  TLT: ['TLT'],
  SHY: ['SHY'],
  UUP: ['UUP'],
  FXY: ['FXY'],
  GLD: ['GLD'],
  SLV: ['SLV'],
  USO: ['USO'],
  DBA: ['DBA'],

  // Sector ETFs
  XLK: ['XLK'],
  XLF: ['XLF'],
  XLI: ['XLI'],
  XLE: ['XLE'],
  XLV: ['XLV'],
  XLP: ['XLP'],
  XLU: ['XLU'],
  XLRE: ['XLRE'],
  XLY: ['XLY'],
  XLC: ['XLC'],
};

/**
 * Proxy mappings for when primary fails
 */
export const PROXY_MAPPINGS: Record<string, { proxy: string; label: string }> = {
  DXY: { proxy: 'UUP', label: 'USD proxy (UUP)' },
};

/**
 * Derived/calculated tickers
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
    ...Object.keys(SYMBOL_CANDIDATES),
    ...DERIVED_TICKERS,
  ];
}

/**
 * Get base tickers (non-derived)
 */
export function getBaseTickers(): string[] {
  return Object.keys(SYMBOL_CANDIDATES);
}

/**
 * Create initial capabilities map
 */
export function createInitialCapabilities(): Record<string, Capability> {
  const capabilities: Record<string, Capability> = {};

  for (const ticker of getAllTickers()) {
    capabilities[ticker] = {
      ok: false,
      triedSymbols: isDerivedTicker(ticker) ? undefined : SYMBOL_CANDIDATES[ticker] || [ticker],
    };
  }

  return capabilities;
}
