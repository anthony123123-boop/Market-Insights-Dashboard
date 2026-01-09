// Types
interface Indicator {
  displayName: string;
  ticker: string;
  price?: number;
  previousClose?: number;
  change?: number;
  changePct?: number;
  session: string;
  asOfET?: string;
  source: 'FRED' | 'AV' | 'PROXY';
  isProxy?: boolean;
  proxyNote?: string;
}

interface Sector {
  ticker: string;
  name: string;
  score: number;
  changePct?: number;
}

interface MarketDataResponse {
  updatedAtNY: string;
  currentTimeNY: string;
  cache: {
    state: 'LIVE' | 'CACHED' | 'STALE';
    ageSeconds: number;
    timestamp: string;
  };
  indicators: Record<string, Indicator>;
  scores: {
    short: number;
    medium: number;
    long: number;
  };
  status: {
    label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF' | 'CHOPPY';
    plan: string;
    reasons: string[];
  };
  sectors: Sector[];
  warnings: string[];
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>;
}

interface FREDResponse {
  observations?: Array<{ date: string; value: string }>;
}

interface AVQuoteResponse {
  'Global Quote'?: {
    '01. symbol': string;
    '05. price': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
  Note?: string;
  Information?: string;
  'Error Message'?: string;
}

// In-memory cache for server-side caching
interface CacheEntry {
  data: MarketDataResponse;
  timestamp: number;
}

let serverCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// API Configuration
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const AV_BASE_URL = 'https://www.alphavantage.co/query';

// FRED Series mapping - FRED-first for macro data
const FRED_SERIES: Record<string, { seriesId: string; displayName: string }> = {
  VIX: { seriesId: 'VIXCLS', displayName: 'VIX' },
  TNX: { seriesId: 'DGS10', displayName: '10Y Treasury' },
  IRX: { seriesId: 'DGS3MO', displayName: '3M T-Bill' },
  FVX: { seriesId: 'DGS5', displayName: '5Y Treasury' },
  DGS2: { seriesId: 'DGS2', displayName: '2Y Treasury' },
  DGS1: { seriesId: 'DGS1', displayName: '1Y Treasury' },
  BAMLH0A0HYM2: { seriesId: 'BAMLH0A0HYM2', displayName: 'HY OAS' },
};

// Sector names
const SECTOR_NAMES: Record<string, string> = {
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

// Utility Functions
function getNYTimestamp(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function getISOTimestamp(): string {
  return new Date().toISOString();
}

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// FRED API Functions
async function fetchFredSeries(seriesId: string, apiKey: string): Promise<{
  price: number;
  previousClose: number;
  date: string;
} | null> {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&sort_order=desc&limit=10`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`FRED request failed for ${seriesId}: ${response.status}`);
      return null;
    }

    const data = await response.json() as FREDResponse;
    if (!data.observations || data.observations.length < 2) {
      console.warn(`FRED insufficient data for ${seriesId}`);
      return null;
    }

    const validObs = data.observations.filter((obs) => obs.value !== '.');
    if (validObs.length < 2) {
      console.warn(`FRED insufficient valid data for ${seriesId}`);
      return null;
    }

    const latest = validObs[0]!;
    const previous = validObs[1]!;

    const price = parseFloat(latest.value);
    const previousClose = parseFloat(previous.value);

    if (isNaN(price) || isNaN(previousClose)) {
      return null;
    }

    return { price, previousClose, date: latest.date };
  } catch (error) {
    console.error(`FRED fetch error for ${seriesId}:`, error);
    return null;
  }
}

// Alpha Vantage API Functions
async function fetchAVQuote(symbol: string, apiKey: string): Promise<{
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  tradingDay: string;
} | null> {
  try {
    const url = `${AV_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`AV request failed for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json() as AVQuoteResponse;

    if (data.Note || data.Information) {
      console.warn(`AV rate limited for ${symbol}:`, data.Note || data.Information);
      return null;
    }

    if (data['Error Message']) {
      console.warn(`AV error for ${symbol}:`, data['Error Message']);
      return null;
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      console.warn(`AV no quote data for ${symbol}`);
      return null;
    }

    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const change = parseFloat(quote['09. change']);
    const changePctStr = quote['10. change percent']?.replace('%', '') || '0';
    const changePct = parseFloat(changePctStr);

    return {
      price,
      previousClose,
      change,
      changePct,
      tradingDay: quote['07. latest trading day'],
    };
  } catch (error) {
    console.error(`AV fetch error for ${symbol}:`, error);
    return null;
  }
}

// Fetch AV symbols in parallel (no delays - rely on caching)
async function fetchAVSymbols(
  symbols: string[],
  apiKey: string,
  indicators: Record<string, Indicator>,
  warnings: string[]
): Promise<void> {
  // Fetch ALL symbols in parallel
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const result = await fetchAVQuote(symbol, apiKey);
      return { symbol, result };
    })
  );

  // Process results
  for (const { symbol, result } of results) {
    if (result) {
      indicators[symbol] = {
        displayName: symbol,
        ticker: symbol,
        price: result.price,
        previousClose: result.previousClose,
        change: result.change,
        changePct: result.changePct,
        session: 'CLOSE',
        asOfET: getNYTimestamp(),
        source: 'AV',
      };
    } else {
      warnings.push(`Alpha Vantage data unavailable for ${symbol}`);
    }
  }
}

// Optimized fetch - prioritize essential data, limit AV calls
async function fetchAllData(fredKey: string, avKey: string): Promise<{
  indicators: Record<string, Indicator>;
  warnings: string[];
}> {
  const indicators: Record<string, Indicator> = {};
  const warnings: string[] = [];

  // 1. Fetch ALL FRED data in parallel (no rate limits)
  console.log('Fetching FRED data...');
  const fredPromises = Object.entries(FRED_SERIES).map(async ([ticker, config]) => {
    const result = await fetchFredSeries(config.seriesId, fredKey);
    if (result) {
      const change = result.price - result.previousClose;
      const changePct = result.previousClose !== 0 ? (change / result.previousClose) * 100 : 0;

      indicators[ticker] = {
        displayName: config.displayName,
        ticker,
        price: result.price,
        previousClose: result.previousClose,
        change,
        changePct,
        session: 'CLOSE',
        asOfET: getNYTimestamp(),
        source: 'FRED',
      };
    } else {
      warnings.push(`FRED data unavailable for ${ticker}`);
    }
  });

  await Promise.all(fredPromises);

  // 2. Fetch Alpha Vantage data - ALL IN PARALLEL
  // With 1-hour caching, we only hit the API once per hour
  // Free tier = 5 calls/min BUT we cache for 1 hour so this is fine
  console.log('Fetching Alpha Vantage data...');

  // ALL symbols we need - core indices + all sectors
  const allSymbols = [
    // Core indices (for scoring)
    'SPY', 'QQQ', 'IWM', 'HYG', 'TLT',
    // All sectors (for sector chart)
    'XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC',
  ];

  await fetchAVSymbols(allSymbols, avKey, indicators, warnings);

  // 3. Calculate derived indicators (PROXY)
  console.log('Calculating derived indicators...');

  // HYG/LQD Ratio - use HYG and TLT since we have them
  const hyg = indicators['HYG'];
  const tlt = indicators['TLT'];
  if (hyg && tlt && hyg.price && tlt.price) {
    const ratio = hyg.price / tlt.price;
    const prevRatio = (hyg.previousClose ?? 0) / (tlt.previousClose ?? 1);
    const change = ratio - prevRatio;
    const changePct = prevRatio !== 0 ? (change / prevRatio) * 100 : 0;

    indicators['HYG_TLT_RATIO'] = {
      displayName: 'HYG/TLT Ratio',
      ticker: 'HYG_TLT_RATIO',
      price: ratio,
      previousClose: prevRatio,
      change,
      changePct,
      session: 'CLOSE',
      source: 'PROXY',
    };
  }

  // Yield Spread (10Y - 2Y) using FRED data
  const tnx = indicators['TNX'];
  const dgs2 = indicators['DGS2'];
  if (tnx && dgs2 && tnx.price !== undefined && dgs2.price !== undefined) {
    const spread = tnx.price - dgs2.price;
    const prevSpread = (tnx.previousClose ?? 0) - (dgs2.previousClose ?? 0);
    const change = spread - prevSpread;

    indicators['YIELD_SPREAD'] = {
      displayName: '10Y-2Y Spread',
      ticker: 'YIELD_SPREAD',
      price: spread,
      previousClose: prevSpread,
      change,
      changePct: Math.abs(prevSpread) > 0.01 ? (change / Math.abs(prevSpread)) * 100 : 0,
      session: 'CLOSE',
      source: 'PROXY',
    };
  }

  // IWM/SPY Ratio (small cap relative)
  const iwm = indicators['IWM'];
  const spy = indicators['SPY'];
  if (iwm && spy && iwm.price && spy.price) {
    const ratio = iwm.price / spy.price;
    const prevRatio = (iwm.previousClose ?? 0) / (spy.previousClose ?? 1);
    const change = ratio - prevRatio;
    const changePct = prevRatio !== 0 ? (change / prevRatio) * 100 : 0;

    indicators['IWM_SPY_RATIO'] = {
      displayName: 'IWM/SPY Ratio',
      ticker: 'IWM_SPY_RATIO',
      price: ratio,
      previousClose: prevRatio,
      change,
      changePct,
      session: 'CLOSE',
      source: 'PROXY',
    };
  }

  return { indicators, warnings };
}

// Scoring Functions
function normalize(value: number, min: number, max: number, invert: boolean = false): number {
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = ((clamped - min) / (max - min)) * 100;
  return invert ? 100 - normalized : normalized;
}

function calculateTrendScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  let totalScore = 0;
  let count = 0;

  const spyInd = indicators['SPY'];
  const qqqInd = indicators['QQQ'];
  const iwmInd = indicators['IWM'];

  if (spyInd?.changePct !== undefined) {
    totalScore += normalize(spyInd.changePct, -3, 3) * 0.4;
    count += 0.4;
  }

  if (qqqInd?.changePct !== undefined) {
    totalScore += normalize(qqqInd.changePct, -4, 4) * 0.35;
    count += 0.35;
  }

  if (iwmInd?.changePct !== undefined) {
    totalScore += normalize(iwmInd.changePct, -4, 4) * 0.25;
    count += 0.25;
  }

  if (count === 0) return { score: 50, available: false };
  return { score: totalScore / count, available: true };
}

function calculateVolTailScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  const vixInd = indicators['VIX'];

  if (vixInd?.price !== undefined) {
    const score = normalize(vixInd.price, 10, 40, true);
    return { score, available: true };
  }

  return { score: 50, available: false };
}

function calculateCreditScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  let totalScore = 0;
  let count = 0;

  const hygInd = indicators['HYG'];
  const hygTltRatio = indicators['HYG_TLT_RATIO'];
  const tltInd = indicators['TLT'];
  const hyOas = indicators['BAMLH0A0HYM2'];

  if (hyOas?.price !== undefined) {
    totalScore += normalize(hyOas.price, 200, 800, true) * 0.4;
    count += 0.4;
  }

  if (hygInd?.changePct !== undefined) {
    totalScore += normalize(hygInd.changePct, -2, 2) * 0.3;
    count += 0.3;
  }

  if (hygTltRatio?.changePct !== undefined) {
    totalScore += normalize(hygTltRatio.changePct, -1, 1) * 0.15;
    count += 0.15;
  }

  if (tltInd?.changePct !== undefined) {
    totalScore += normalize(tltInd.changePct, -2, 2, true) * 0.15;
    count += 0.15;
  }

  if (count === 0) return { score: 50, available: false };
  return { score: totalScore / count, available: true };
}

function calculateRatesScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  let totalScore = 0;
  let count = 0;

  const tnxInd = indicators['TNX'];
  const yieldSpread = indicators['YIELD_SPREAD'];

  if (tnxInd?.price !== undefined) {
    const optimalScore = 100 - Math.abs(tnxInd.price - 3.5) * 20;
    totalScore += Math.max(0, Math.min(100, optimalScore)) * 0.5;
    count += 0.5;
  }

  if (yieldSpread?.price !== undefined) {
    totalScore += normalize(yieldSpread.price, -1, 2) * 0.5;
    count += 0.5;
  }

  if (count === 0) return { score: 50, available: false };
  return { score: totalScore / count, available: true };
}

function calculateBreadthScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  let totalScore = 0;
  let count = 0;

  const iwmSpyRatio = indicators['IWM_SPY_RATIO'];

  if (iwmSpyRatio?.changePct !== undefined) {
    totalScore += normalize(iwmSpyRatio.changePct, -1.5, 1.5);
    count += 1;
  }

  if (count === 0) return { score: 50, available: false };
  return { score: totalScore / count, available: true };
}

function calculateScores(indicators: Record<string, Indicator>): {
  scores: { short: number; medium: number; long: number };
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>;
  missingCategories: string[];
} {
  const weights = {
    trend: 0.30,
    volTail: 0.25,
    creditLiquidity: 0.20,
    rates: 0.15,
    breadth: 0.10,
  };

  const trend = calculateTrendScore(indicators);
  const volTail = calculateVolTailScore(indicators);
  const creditLiquidity = calculateCreditScore(indicators);
  const rates = calculateRatesScore(indicators);
  const breadth = calculateBreadthScore(indicators);

  const categoryScores: Record<string, { score: number; available: boolean; weight: number }> = {
    trend: { ...trend, weight: weights.trend },
    volTail: { ...volTail, weight: weights.volTail },
    creditLiquidity: { ...creditLiquidity, weight: weights.creditLiquidity },
    rates: { ...rates, weight: weights.rates },
    breadth: { ...breadth, weight: weights.breadth },
  };

  let totalWeight = 0;
  let weightedSum = 0;
  const missingCategories: string[] = [];

  for (const [name, category] of Object.entries(categoryScores)) {
    if (category.available) {
      weightedSum += category.score * category.weight;
      totalWeight += category.weight;
    } else {
      missingCategories.push(name);
    }
  }

  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

  const shortTermScore = Math.round(
    baseScore * 0.6 +
    (trend.available ? trend.score * 0.3 : baseScore * 0.3) +
    (volTail.available ? volTail.score * 0.1 : baseScore * 0.1)
  );

  const mediumTermScore = Math.round(baseScore);

  const longTermScore = Math.round(
    baseScore * 0.5 +
    (trend.available ? trend.score * 0.25 : baseScore * 0.25) +
    (creditLiquidity.available ? creditLiquidity.score * 0.25 : baseScore * 0.25)
  );

  return {
    scores: {
      short: Math.max(0, Math.min(100, shortTermScore)),
      medium: Math.max(0, Math.min(100, mediumTermScore)),
      long: Math.max(0, Math.min(100, longTermScore)),
    },
    categoryScores,
    missingCategories,
  };
}

function generateStatus(
  scores: { short: number; medium: number; long: number },
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>,
  indicators: Record<string, Indicator>,
  missingCategories: string[]
): { label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF' | 'CHOPPY'; plan: string; reasons: string[] } {
  let label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF' | 'CHOPPY';

  if (scores.long >= 70 && scores.short >= 60) {
    label = 'RISK-ON';
  } else if (scores.long <= 40 || (categoryScores['creditLiquidity']?.available && categoryScores['creditLiquidity'].score < 30)) {
    label = 'RISK-OFF';
  } else if (scores.short < 40 && scores.long > 50) {
    label = 'CHOPPY';
  } else {
    label = 'NEUTRAL';
  }

  let plan: string;
  switch (label) {
    case 'RISK-ON':
      plan = 'Favorable conditions for risk assets. Consider adding equity exposure.';
      break;
    case 'RISK-OFF':
      plan = 'Reduce exposure and raise cash. Focus on defensive positions.';
      break;
    case 'CHOPPY':
      plan = 'High volatility with unclear direction. Reduce position sizes and wait for clarity.';
      break;
    default:
      plan = 'Balanced approach recommended. Monitor for directional signals.';
  }

  const reasons: string[] = [];

  if (categoryScores['volTail']?.available) {
    const vixInd = indicators['VIX'];
    if (vixInd?.price !== undefined) {
      const volDesc = vixInd.price < 15 ? 'low' : vixInd.price > 25 ? 'elevated' : 'moderate';
      reasons.push(`VIX at ${vixInd.price.toFixed(1)} - ${volDesc} fear levels`);
    }
  }

  if (categoryScores['creditLiquidity']?.available) {
    const creditDesc = categoryScores['creditLiquidity'].score > 60 ? 'healthy' : categoryScores['creditLiquidity'].score < 40 ? 'stressed' : 'stable';
    reasons.push(`Credit conditions appear ${creditDesc}`);
  }

  const yieldSpread = indicators['YIELD_SPREAD'];
  if (yieldSpread?.price !== undefined) {
    const curveDesc = yieldSpread.price < -0.2 ? 'inverted (recessionary signal)' : yieldSpread.price > 0.5 ? 'steep (growth signal)' : 'flat';
    reasons.push(`Yield curve is ${curveDesc} at ${yieldSpread.price.toFixed(2)}%`);
  }

  if (missingCategories.length > 0) {
    reasons.push(`Note: Some data unavailable (${missingCategories.join(', ')})`);
  }

  return { label, plan, reasons: reasons.slice(0, 5) };
}

function calculateSectorScores(indicators: Record<string, Indicator>): Sector[] {
  const sectorTickers = ['XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC'];

  return sectorTickers.map(ticker => {
    const sector = indicators[ticker];
    const name = SECTOR_NAMES[ticker] || ticker;

    if (!sector || sector.price === undefined || sector.previousClose === undefined) {
      return { ticker, name, score: 50 };
    }

    // Calculate score based on daily change
    // +3% = score 100, -3% = score 0, 0% = score 50
    const changePct = sector.changePct ?? 0;
    const score = Math.round(Math.max(0, Math.min(100, 50 + changePct * 16.67)));

    return {
      ticker,
      name,
      score,
      changePct: sector.changePct,
    };
  });
}

// Main handler
export async function handler(event: { httpMethod: string }): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const now = Date.now();
    if (serverCache && (now - serverCache.timestamp) < CACHE_TTL_MS) {
      console.log('Returning cached data');
      const cachedData: MarketDataResponse = {
        ...serverCache.data,
        currentTimeNY: getNYTimestamp(),
        cache: {
          state: 'CACHED',
          ageSeconds: Math.floor((now - serverCache.timestamp) / 1000),
          timestamp: serverCache.data.cache.timestamp,
        },
      };

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
        body: JSON.stringify(cachedData),
      };
    }

    const fredKey = process.env['FRED_API_KEY'];
    const avKey = process.env['ALPHAVANTAGE_API_KEY'];

    if (!fredKey || !avKey) {
      console.error('Missing API keys');
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Server configuration error: Missing API keys',
          warnings: [
            !fredKey ? 'FRED_API_KEY not configured' : null,
            !avKey ? 'ALPHAVANTAGE_API_KEY not configured' : null,
          ].filter(Boolean),
        }),
      };
    }

    console.log('Fetching fresh market data...');

    const { indicators, warnings } = await fetchAllData(fredKey, avKey);
    const { scores, categoryScores, missingCategories } = calculateScores(indicators);
    const status = generateStatus(scores, categoryScores, indicators, missingCategories);
    const sectors = calculateSectorScores(indicators);

    const timestamp = getISOTimestamp();
    const response: MarketDataResponse = {
      updatedAtNY: getNYTimestamp(),
      currentTimeNY: getNYTimestamp(),
      cache: {
        state: 'LIVE',
        ageSeconds: 0,
        timestamp,
      },
      indicators,
      scores,
      status,
      sectors,
      warnings,
      categoryScores,
    };

    serverCache = {
      data: response,
      timestamp: now,
    };

    console.log('Returning fresh data');

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Handler error:', error);

    if (serverCache) {
      console.log('Returning stale cache due to error');
      const staleData: MarketDataResponse = {
        ...serverCache.data,
        currentTimeNY: getNYTimestamp(),
        cache: {
          state: 'STALE',
          ageSeconds: Math.floor((Date.now() - serverCache.timestamp) / 1000),
          timestamp: serverCache.data.cache.timestamp,
        },
        warnings: [...serverCache.data.warnings, 'Using stale data due to fetch error'],
      };

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(staleData),
      };
    }

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch market data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
