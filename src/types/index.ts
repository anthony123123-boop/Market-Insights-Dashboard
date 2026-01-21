// Data source types
export type DataSource = 'FRED' | 'AV' | 'PROXY' | 'INTRADAY';
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
  score: number | null;
  changePct?: number;
  available?: boolean;
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
  scoringVersion: string;
  scoringWeights: {
    category: Record<string, number>;
    composite: {
      short: { base: number; trend: number };
      medium: { base: number };
      long: { base: number; credit: number; rates: number };
    };
  };
  dataStatus?: 'LIVE' | 'EOD (FRED)' | 'Delayed';
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
  'SPY', 'QQQ', 'IWM', 'GLD',              // Proxy-backed ETFs
  'VIX',                                    // Volatility
  'DGS10', 'YIELD_SPREAD',                  // Rates
  'DTWEXBGS', 'GOLD',                       // USD / Commodities
] as const;

// Indicator categories for VIEW MORE panel
export const INDICATOR_CATEGORIES = {
  CORE: ['SPY', 'QQQ', 'IWM', 'SP500', 'NASDAQCOM', 'DJIA', 'RU2000PR'],
  VOL_TAIL: ['VIX', 'TEDRATE'],
  CREDIT_LIQUIDITY: ['HYG', 'LQD', 'HYG_LQD_RATIO', 'BAMLH0A0HYM2', 'BAMLC0A0CM', 'TEDRATE'],
  USD_FX: ['UUP', 'DTWEXBGS'],
  RATES_YIELD: ['DGS10', 'DGS2', 'DGS5', 'DGS1', 'YIELD_SPREAD', 'T10YIE'],
  COMMODITIES: ['GLD', 'GOLD', 'OIL'],
  BREADTH: ['RSP_SPY_RATIO', 'IWM_SPY_RATIO', 'SMALL_LARGE'],
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
  GLD: 'Gold',
  SP500: 'S&P 500',
  NASDAQCOM: 'Nasdaq Composite',
  DJIA: 'Dow Jones',
  RU2000PR: 'Russell 2000',
  VIX: 'VIX',
  TEDRATE: 'TED Spread',
  DTWEXBGS: 'US Dollar Index',
  UUP: 'US Dollar',
  DGS10: '10Y Yield',
  DGS2: '2Y Yield',
  DGS5: '5Y Yield',
  DGS1: '1Y Yield',
  YIELD_SPREAD: '10Y-2Y Spread',
  T10YIE: 'Inflation Expect.',
  BAMLH0A0HYM2: 'HY OAS Spread',
  BAMLC0A0CM: 'IG OAS Spread',
  HYG: 'High Yield',
  LQD: 'Inv. Grade Corp',
  HYG_LQD_RATIO: 'HY/IG Ratio',
  GOLD: 'Gold',
  OIL: 'Oil',
  RSP_SPY_RATIO: 'RSP/SPY Ratio',
  IWM_SPY_RATIO: 'IWM/SPY Ratio',
  SMALL_LARGE: 'Small/Large Ratio',
};
