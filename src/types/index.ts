// Data source types
export type DataSource = 'FRED' | 'AV' | 'PROXY';
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
  'SP500', 'NASDAQCOM', 'DJIA', 'RU2000PR', // Core indices
  'VIX',                                   // Volatility
  'DGS10', 'YIELD_SPREAD',                 // Rates
  'DTWEXBGS', 'GOLD',                      // USD / Commodities
] as const;

// Indicator categories for VIEW MORE panel
export const INDICATOR_CATEGORIES = {
  CORE: ['SP500', 'NASDAQCOM', 'DJIA', 'RU2000PR'],
  VOL_TAIL: ['VIX', 'TEDRATE'],
  CREDIT_LIQUIDITY: ['BAMLH0A0HYM2', 'TEDRATE'],
  USD_FX: ['DTWEXBGS'],
  RATES_YIELD: ['DGS10', 'DGS2', 'DGS5', 'DGS1', 'YIELD_SPREAD', 'T10YIE'],
  COMMODITIES: ['GOLD', 'OIL'],
  BREADTH: ['SMALL_LARGE'],
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
  SP500: 'S&P 500',
  NASDAQCOM: 'Nasdaq Composite',
  DJIA: 'Dow Jones',
  RU2000PR: 'Russell 2000',
  VIX: 'VIX',
  TEDRATE: 'TED Spread',
  DTWEXBGS: 'US Dollar Index',
  DGS10: '10Y Yield',
  DGS2: '2Y Yield',
  DGS5: '5Y Yield',
  DGS1: '1Y Yield',
  YIELD_SPREAD: '10Y-2Y Spread',
  T10YIE: 'Inflation Expect.',
  BAMLH0A0HYM2: 'HY OAS Spread',
  GOLD: 'Gold',
  OIL: 'Oil',
  SMALL_LARGE: 'Small/Large Ratio',
};
