import { z } from 'zod';

// Cache state enum
export type CacheState = 'LIVE' | 'CACHED' | 'STALE';

// Session type
export type SessionType = 'REGULAR' | 'PRE' | 'POST' | 'CLOSE' | 'NA';

// Data source
export type DataSource = 'AV' | 'STOOQ' | 'FRED' | 'PROXY';

// Capability for each ticker
export const CapabilitySchema = z.object({
  ok: z.boolean(),
  resolvedSymbol: z.string().optional(),
  triedSymbols: z.array(z.string()).optional(),
  reason: z.string().optional(),
  isProxy: z.boolean().optional(),
  sourceUsed: z.enum(['AV', 'STOOQ', 'FRED', 'PROXY']).optional(),
});

export type Capability = z.infer<typeof CapabilitySchema>;

// Indicator data
export const IndicatorSchema = z.object({
  displayName: z.string(),
  price: z.number().optional(),
  previousClose: z.number().optional(),
  change: z.number().optional(),
  changePct: z.number().optional(),
  session: z.enum(['REGULAR', 'PRE', 'POST', 'CLOSE', 'NA']),
  asOfET: z.string().optional(),
  source: z.enum(['AV', 'STOOQ', 'FRED', 'PROXY']),
});

export type Indicator = z.infer<typeof IndicatorSchema>;

// Sector data
export const SectorSchema = z.object({
  ticker: z.string(),
  score: z.number(),
  name: z.string().optional(),
});

export type Sector = z.infer<typeof SectorSchema>;

// Scores
export const ScoresSchema = z.object({
  short: z.number(),
  medium: z.number(),
  long: z.number(),
});

export type Scores = z.infer<typeof ScoresSchema>;

// Status
export const StatusSchema = z.object({
  label: z.string(),
  plan: z.string(),
  bullets: z.array(z.string()),
});

export type Status = z.infer<typeof StatusSchema>;

// Cache info
export const CacheInfoSchema = z.object({
  state: z.enum(['LIVE', 'CACHED', 'STALE']),
  ageSeconds: z.number(),
});

export type CacheInfo = z.infer<typeof CacheInfoSchema>;

// Warning
export const WarningSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type Warning = z.infer<typeof WarningSchema>;

// Full API response
export const MarketDataResponseSchema = z.object({
  pulledAtET: z.string(),
  lastUpdatedET: z.string(),
  dataAsOfET: z.string(),
  cache: CacheInfoSchema,
  capabilities: z.record(z.string(), CapabilitySchema),
  indicators: z.record(z.string(), IndicatorSchema),
  scores: ScoresSchema,
  status: StatusSchema,
  sectors: z.array(SectorSchema),
  warnings: z.array(WarningSchema),
});

export type MarketDataResponse = z.infer<typeof MarketDataResponseSchema>;

// Health response
export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  lastFetchMs: z.number(),
  cacheAgeMs: z.number(),
  unresolved: z.array(z.string()),
  stale: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Settings
export interface DashboardSettings {
  density: 'comfortable' | 'compact';
  refreshInterval: 10 | 12 | 15 | 20 | 30;
  timeframes: {
    short: { min: number; max: number };
    medium: { min: number; max: number };
    long: { min: number; max: number };
  };
  weightPreset: 'balanced' | 'risk-off-sensitive' | 'trend-following';
  viewMoreCategories: {
    core: boolean;
    volTail: boolean;
    creditLiquidity: boolean;
    usdFx: boolean;
    ratesYield: boolean;
    commodities: boolean;
    sectors: boolean;
    breadth: boolean;
  };
}

// Category groupings for indicators
export const INDICATOR_CATEGORIES = {
  CORE: ['SPY', 'QQQ', 'IWM', 'RSP'],
  VOL_TAIL: ['VIX', 'VVIX', 'VIX9D', 'VIX3M', 'VIX_VVIX_RATIO', 'SKEW', 'MOVE'],
  CREDIT_LIQUIDITY: ['HYG', 'LQD', 'HYG_LQD_RATIO', 'TLT', 'SHY'],
  USD_FX: ['DXY', 'UUP', 'FXY', 'EURUSD'],
  RATES_YIELD: ['TNX', 'IRX', 'FVX', 'YIELD_10Y_2Y'],
  COMMODITIES: ['GLD', 'SLV', 'USO', 'DBA'],
  SECTORS: ['XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC'],
  BREADTH: ['RSP_SPY_RATIO', 'IWM_SPY_RATIO'],
} as const;

// Main indicators (top 5)
export const MAIN_INDICATORS = ['SPY', 'QQQ', 'DXY', 'GLD', 'VIX_VVIX_RATIO'] as const;

// Sector ETFs for the chart
export const SECTOR_ETFS = ['XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC'] as const;
