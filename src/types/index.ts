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

// Indicator categories for UI grouping
export const INDICATOR_CATEGORIES = {
  CORE: ['SPY', 'QQQ', 'IWM', 'RSP'],
  VOL_TAIL: ['VIX', 'VVIX'],
  CREDIT_LIQUIDITY: ['HYG', 'LQD', 'HYG_LQD_RATIO', 'TLT', 'SHY'],
  USD_FX: ['DXY', 'UUP', 'EURUSD'],
  RATES_YIELD: ['TNX', 'IRX', 'FVX', 'YIELD_SPREAD'],
  COMMODITIES: ['GLD', 'SLV', 'USO', 'DBA'],
  SECTORS: ['XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC'],
  BREADTH: ['RSP_SPY_RATIO', 'IWM_SPY_RATIO'],
} as const;

// Main indicators for the top row (5 large pills)
export const MAIN_INDICATORS = ['SPY', 'QQQ', 'UUP', 'GLD', 'VIX'] as const;

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
