// Data source types
export type DataSource = 'FRED' | 'AV' | 'FINNHUB' | 'PROXY';
export type CacheState = 'LIVE' | 'CACHED' | 'STALE';
export type SessionType = 'REGULAR' | 'PRE' | 'POST' | 'CLOSE' | 'NA';

// Indicator data
export interface Indicator {
  displayName: string;
  ticker: string;
  price?: number;
  previousClose?: number;
  change?: number;
  changePct?: number;
  session: SessionType;
  asOfET?: string;
  source: DataSource;
  isProxy?: boolean;
  proxyNote?: string;
}

// Sector data
export interface Sector {
  ticker: string;
  name: string;
  score: number;
  changePct?: number;
}

// Scores
export interface Scores {
  short: number;
  medium: number;
  long: number;
}

// Market regime status
export interface Status {
  label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF' | 'CHOPPY';
  plan: string;
  reasons: string[];
}

// Cache information
export interface CacheInfo {
  state: CacheState;
  ageSeconds: number;
  timestamp: string;
}

// Full API response
export interface MarketDataResponse {
  updatedAtNY: string;
  currentTimeNY: string;
  cache: CacheInfo;
  indicators: Record<string, Indicator>;
  scores: Scores;
  status: Status;
  sectors: Sector[];
  warnings: string[];
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>;
}

// Main indicators for the KEY INDICATORS section (shown prominently)
export const MAIN_INDICATORS = [
  'SPY', 'QQQ', 'IWM', 'DIA',  // Core indices
  'VIX',                        // Volatility
  'HYG', 'TLT',                 // Credit/Bonds
  'GLD', 'UUP',                 // Commodities/FX
] as const;

// Indicator categories for VIEW MORE panel
export const INDICATOR_CATEGORIES = {
  CORE: ['SPY', 'QQQ', 'IWM', 'DIA', 'RSP'],
  VOL_TAIL: ['VIX', 'VXX', 'TEDRATE'],
  CREDIT_LIQUIDITY: ['HYG', 'LQD', 'HYG_LQD', 'TLT', 'SHY', 'BAMLH0A0HYM2'],
  USD_FX: ['UUP'],
  RATES_YIELD: ['TNX', 'DGS2', 'DGS5', 'DGS1', 'YIELD_SPREAD', 'T10YIE'],
  COMMODITIES: ['GLD', 'SLV', 'USO'],
  BREADTH: ['RSP_SPY'],
} as const;

// Sector ETFs
export const SECTOR_ETFS = ['XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC'] as const;

// Sector names mapping
export const SECTOR_NAMES: Record<string, string> = {
  XLK: 'Technology',
  XLF: 'Financials',
  XLI: 'Industrials',
  XLE: 'Energy',
  XLV: 'Healthcare',
  XLP: 'Cons. Staples',
  XLU: 'Utilities',
  XLRE: 'Real Estate',
  XLY: 'Cons. Disc.',
  XLC: 'Communication',
};

// Friendly names for indicators
export const INDICATOR_NAMES: Record<string, string> = {
  SPY: 'S&P 500',
  QQQ: 'Nasdaq 100',
  IWM: 'Russell 2000',
  DIA: 'Dow Jones',
  RSP: 'Equal Weight S&P',
  VIX: 'VIX',
  VXX: 'VIX Short-Term',
  TEDRATE: 'TED Spread',
  HYG: 'High Yield',
  LQD: 'Inv. Grade Corp',
  HYG_LQD: 'HY/IG Ratio',
  TLT: '20Y+ Treasury',
  SHY: '1-3Y Treasury',
  UUP: 'US Dollar',
  TNX: '10Y Yield',
  DGS2: '2Y Yield',
  DGS5: '5Y Yield',
  DGS1: '1Y Yield',
  YIELD_SPREAD: '10Y-2Y Spread',
  T10YIE: 'Inflation Expect.',
  BAMLH0A0HYM2: 'HY OAS Spread',
  GLD: 'Gold',
  SLV: 'Silver',
  USO: 'Oil',
  RSP_SPY: 'Breadth Ratio',
};
