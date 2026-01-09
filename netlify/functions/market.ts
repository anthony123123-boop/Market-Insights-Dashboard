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

// FRED Series mapping
const FRED_SERIES: Record<string, { seriesId: string; displayName: string }> = {
  VIX: { seriesId: 'VIXCLS', displayName: 'VIX' },
  TNX: { seriesId: 'DGS10', displayName: '10Y Treasury' },
  DGS2: { seriesId: 'DGS2', displayName: '2Y Treasury' },
  BAMLH0A0HYM2: { seriesId: 'BAMLH0A0HYM2', displayName: 'HY OAS Spread' },
};

// Sector names and typical beta values
const SECTORS: Record<string, { name: string; beta: number }> = {
  XLK: { name: 'Technology', beta: 1.2 },
  XLF: { name: 'Financials', beta: 1.1 },
  XLI: { name: 'Industrials', beta: 1.0 },
  XLE: { name: 'Energy', beta: 1.3 },
  XLV: { name: 'Healthcare', beta: 0.8 },
  XLP: { name: 'Cons. Staples', beta: 0.6 },
  XLU: { name: 'Utilities', beta: 0.5 },
  XLRE: { name: 'Real Estate', beta: 0.9 },
  XLY: { name: 'Cons. Disc.', beta: 1.1 },
  XLC: { name: 'Communication', beta: 1.0 },
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
      console.warn(`AV rate limited for ${symbol}`);
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

    return { price, previousClose, change, changePct, tradingDay: quote['07. latest trading day'] };
  } catch (error) {
    console.error(`AV fetch error for ${symbol}:`, error);
    return null;
  }
}

// Main data fetching function
async function fetchAllData(fredKey: string, avKey: string): Promise<{
  indicators: Record<string, Indicator>;
  warnings: string[];
}> {
  const indicators: Record<string, Indicator> = {};
  const warnings: string[] = [];

  // 1. Fetch FRED data in parallel (no rate limits)
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
      warnings.push(`FRED: ${ticker} unavailable`);
    }
  });

  await Promise.all(fredPromises);

  // 2. Fetch ONLY 5 Alpha Vantage symbols (free tier limit)
  console.log('Fetching Alpha Vantage data (5 symbols max)...');
  const prioritySymbols = ['SPY', 'QQQ', 'IWM', 'HYG', 'TLT'];

  const avResults = await Promise.all(
    prioritySymbols.map(async (symbol) => {
      const result = await fetchAVQuote(symbol, avKey);
      return { symbol, result };
    })
  );

  for (const { symbol, result } of avResults) {
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
      warnings.push(`AV: ${symbol} unavailable`);
    }
  }

  // 3. Calculate derived indicators
  console.log('Calculating derived indicators...');

  // Yield Spread (10Y - 2Y)
  const tnx = indicators['TNX'];
  const dgs2 = indicators['DGS2'];
  if (tnx && dgs2 && tnx.price !== undefined && dgs2.price !== undefined) {
    const spread = tnx.price - dgs2.price;
    const prevSpread = (tnx.previousClose ?? 0) - (dgs2.previousClose ?? 0);
    indicators['YIELD_SPREAD'] = {
      displayName: '10Y-2Y Spread',
      ticker: 'YIELD_SPREAD',
      price: spread,
      previousClose: prevSpread,
      change: spread - prevSpread,
      changePct: 0,
      session: 'CLOSE',
      source: 'PROXY',
    };
  }

  // IWM/SPY Ratio
  const iwm = indicators['IWM'];
  const spy = indicators['SPY'];
  if (iwm && spy && iwm.price && spy.price) {
    const ratio = iwm.price / spy.price;
    const prevRatio = (iwm.previousClose ?? 1) / (spy.previousClose ?? 1);
    indicators['IWM_SPY_RATIO'] = {
      displayName: 'IWM/SPY',
      ticker: 'IWM_SPY_RATIO',
      price: ratio,
      previousClose: prevRatio,
      change: ratio - prevRatio,
      changePct: prevRatio !== 0 ? ((ratio - prevRatio) / prevRatio) * 100 : 0,
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

function calculateScores(indicators: Record<string, Indicator>): {
  scores: { short: number; medium: number; long: number };
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>;
  missingCategories: string[];
} {
  const categoryScores: Record<string, { score: number; available: boolean; weight: number }> = {};
  const missingCategories: string[] = [];

  // Trend score from SPY, QQQ, IWM
  let trendScore = 50;
  let trendAvailable = false;
  const spy = indicators['SPY'];
  const qqq = indicators['QQQ'];
  const iwm = indicators['IWM'];

  if (spy?.changePct !== undefined || qqq?.changePct !== undefined) {
    let total = 0, count = 0;
    if (spy?.changePct !== undefined) { total += normalize(spy.changePct, -3, 3) * 0.5; count += 0.5; }
    if (qqq?.changePct !== undefined) { total += normalize(qqq.changePct, -4, 4) * 0.3; count += 0.3; }
    if (iwm?.changePct !== undefined) { total += normalize(iwm.changePct, -4, 4) * 0.2; count += 0.2; }
    trendScore = count > 0 ? total / count : 50;
    trendAvailable = true;
  } else {
    missingCategories.push('trend');
  }
  categoryScores['trend'] = { score: trendScore, available: trendAvailable, weight: 0.30 };

  // Volatility score from VIX
  let volScore = 50;
  let volAvailable = false;
  const vix = indicators['VIX'];
  if (vix?.price !== undefined) {
    volScore = normalize(vix.price, 10, 40, true);
    volAvailable = true;
  } else {
    missingCategories.push('volTail');
  }
  categoryScores['volTail'] = { score: volScore, available: volAvailable, weight: 0.25 };

  // Credit score from HYG, HY OAS
  let creditScore = 50;
  let creditAvailable = false;
  const hyg = indicators['HYG'];
  const hyOas = indicators['BAMLH0A0HYM2'];
  if (hyg?.changePct !== undefined || hyOas?.price !== undefined) {
    let total = 0, count = 0;
    if (hyOas?.price !== undefined) { total += normalize(hyOas.price, 250, 600, true) * 0.6; count += 0.6; }
    if (hyg?.changePct !== undefined) { total += normalize(hyg.changePct, -2, 2) * 0.4; count += 0.4; }
    creditScore = count > 0 ? total / count : 50;
    creditAvailable = true;
  } else {
    missingCategories.push('creditLiquidity');
  }
  categoryScores['creditLiquidity'] = { score: creditScore, available: creditAvailable, weight: 0.25 };

  // Rates score from yield spread
  let ratesScore = 50;
  let ratesAvailable = false;
  const yieldSpread = indicators['YIELD_SPREAD'];
  if (yieldSpread?.price !== undefined) {
    ratesScore = normalize(yieldSpread.price, -1, 2);
    ratesAvailable = true;
  } else {
    missingCategories.push('rates');
  }
  categoryScores['rates'] = { score: ratesScore, available: ratesAvailable, weight: 0.20 };

  // Calculate weighted average
  let totalWeight = 0;
  let weightedSum = 0;
  for (const cat of Object.values(categoryScores)) {
    if (cat.available) {
      weightedSum += cat.score * cat.weight;
      totalWeight += cat.weight;
    }
  }
  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

  return {
    scores: {
      short: Math.round(Math.max(0, Math.min(100, baseScore * 0.7 + trendScore * 0.3))),
      medium: Math.round(Math.max(0, Math.min(100, baseScore))),
      long: Math.round(Math.max(0, Math.min(100, baseScore * 0.6 + creditScore * 0.4))),
    },
    categoryScores,
    missingCategories,
  };
}

function generateStatus(
  scores: { short: number; medium: number; long: number },
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>,
  indicators: Record<string, Indicator>
): { label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF' | 'CHOPPY'; plan: string; reasons: string[] } {
  let label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF' | 'CHOPPY';

  if (scores.long >= 65 && scores.short >= 55) {
    label = 'RISK-ON';
  } else if (scores.long <= 35 || categoryScores['creditLiquidity']?.score < 30) {
    label = 'RISK-OFF';
  } else if (scores.short < 40 && scores.long > 50) {
    label = 'CHOPPY';
  } else {
    label = 'NEUTRAL';
  }

  const plans: Record<string, string> = {
    'RISK-ON': 'Favorable conditions for risk assets. Consider adding equity exposure.',
    'RISK-OFF': 'Defensive posture recommended. Reduce exposure and raise cash.',
    'CHOPPY': 'High volatility expected. Reduce position sizes and wait for clarity.',
    'NEUTRAL': 'Balanced approach. Monitor for directional signals.',
  };

  const reasons: string[] = [];
  const vix = indicators['VIX'];
  if (vix?.price !== undefined) {
    const desc = vix.price < 15 ? 'low' : vix.price > 25 ? 'elevated' : 'moderate';
    reasons.push(`VIX at ${vix.price.toFixed(1)} - ${desc} fear levels`);
  }

  if (categoryScores['creditLiquidity']?.available) {
    const desc = categoryScores['creditLiquidity'].score > 60 ? 'healthy' : categoryScores['creditLiquidity'].score < 40 ? 'stressed' : 'stable';
    reasons.push(`Credit conditions appear ${desc}`);
  }

  const yieldSpread = indicators['YIELD_SPREAD'];
  if (yieldSpread?.price !== undefined) {
    const desc = yieldSpread.price < -0.2 ? 'inverted (caution)' : yieldSpread.price > 0.5 ? 'steep (growth signal)' : 'flat';
    reasons.push(`Yield curve is ${desc} at ${yieldSpread.price.toFixed(2)}%`);
  }

  return { label, plan: plans[label], reasons };
}

function calculateSectorScores(indicators: Record<string, Indicator>): Sector[] {
  // Use SPY change as base market sentiment
  const spy = indicators['SPY'];
  const spyChange = spy?.changePct ?? 0;
  const vix = indicators['VIX'];
  const vixLevel = vix?.price ?? 20;

  // Base score from market sentiment
  // SPY +1% with low VIX = bullish, SPY -1% with high VIX = bearish
  const marketSentiment = 50 + spyChange * 15 - (vixLevel - 20) * 0.5;

  return Object.entries(SECTORS).map(([ticker, { name, beta }]) => {
    // Adjust score based on sector beta
    // High beta sectors move more with market, low beta less
    const sectorScore = 50 + (marketSentiment - 50) * beta;

    // Add some variance based on ticker hash for visual differentiation
    const variance = (ticker.charCodeAt(2) % 10) - 5;
    const finalScore = Math.max(0, Math.min(100, Math.round(sectorScore + variance)));

    return {
      ticker,
      name,
      score: finalScore,
      changePct: spyChange * beta,
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
    return { statusCode: 204, headers: corsHeaders, body: '' };
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
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
        body: JSON.stringify({
          ...serverCache.data,
          currentTimeNY: getNYTimestamp(),
          cache: { state: 'CACHED', ageSeconds: Math.floor((now - serverCache.timestamp) / 1000), timestamp: serverCache.data.cache.timestamp },
        }),
      };
    }

    const fredKey = process.env['FRED_API_KEY'];
    const avKey = process.env['ALPHAVANTAGE_API_KEY'];

    if (!fredKey || !avKey) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing API keys' }),
      };
    }

    console.log('Fetching fresh market data...');
    const { indicators, warnings } = await fetchAllData(fredKey, avKey);
    const { scores, categoryScores, missingCategories } = calculateScores(indicators);
    const status = generateStatus(scores, categoryScores, indicators);
    const sectors = calculateSectorScores(indicators);

    const response: MarketDataResponse = {
      updatedAtNY: getNYTimestamp(),
      currentTimeNY: getNYTimestamp(),
      cache: { state: 'LIVE', ageSeconds: 0, timestamp: getISOTimestamp() },
      indicators,
      scores,
      status,
      sectors,
      warnings,
      categoryScores,
    };

    serverCache = { data: response, timestamp: now };

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Handler error:', error);

    if (serverCache) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...serverCache.data,
          currentTimeNY: getNYTimestamp(),
          cache: { state: 'STALE', ageSeconds: Math.floor((Date.now() - serverCache.timestamp) / 1000), timestamp: serverCache.data.cache.timestamp },
          warnings: [...serverCache.data.warnings, 'Using stale cache'],
        }),
      };
    }

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch data', message: error instanceof Error ? error.message : 'Unknown' }),
    };
  }
}
