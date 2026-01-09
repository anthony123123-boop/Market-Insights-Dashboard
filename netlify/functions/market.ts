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
  source: 'FRED' | 'AV' | 'FINNHUB' | 'PROXY';
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
    '05. price': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
  Note?: string;
  Information?: string;
}

interface FinnhubQuoteResponse {
  c: number;  // Current price
  pc: number; // Previous close
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High
  l: number;  // Low
  o: number;  // Open
  t: number;  // Timestamp
}

// Cache
interface CacheEntry {
  data: MarketDataResponse;
  timestamp: number;
}

let serverCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// API URLs
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const AV_BASE_URL = 'https://www.alphavantage.co/query';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1/quote';

// FRED Series (macro data - no rate limits)
const FRED_SERIES: Record<string, { seriesId: string; displayName: string }> = {
  VIX: { seriesId: 'VIXCLS', displayName: 'VIX' },
  TNX: { seriesId: 'DGS10', displayName: '10Y Treasury' },
  DGS2: { seriesId: 'DGS2', displayName: '2Y Treasury' },
  DGS5: { seriesId: 'DGS5', displayName: '5Y Treasury' },
  DGS1: { seriesId: 'DGS1', displayName: '1Y Treasury' },
  BAMLH0A0HYM2: { seriesId: 'BAMLH0A0HYM2', displayName: 'HY OAS Spread' },
  T10YIE: { seriesId: 'T10YIE', displayName: '10Y Breakeven Inflation' },
  TEDRATE: { seriesId: 'TEDRATE', displayName: 'TED Spread' },
};

// Sector names
const SECTOR_INFO: Record<string, string> = {
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

// Utility
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

// FRED API
async function fetchFredSeries(seriesId: string, apiKey: string): Promise<{
  price: number;
  previousClose: number;
} | null> {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&sort_order=desc&limit=10`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as FREDResponse;
    const validObs = data.observations?.filter((obs) => obs.value !== '.') ?? [];
    if (validObs.length < 2) return null;

    const price = parseFloat(validObs[0]!.value);
    const previousClose = parseFloat(validObs[1]!.value);
    if (isNaN(price) || isNaN(previousClose)) return null;

    return { price, previousClose };
  } catch {
    return null;
  }
}

// Alpha Vantage API (5 calls/min free tier - use for core indices)
async function fetchAVQuote(symbol: string, apiKey: string): Promise<{
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
} | null> {
  try {
    const url = `${AV_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as AVQuoteResponse;
    if (data.Note || data.Information) return null;

    const quote = data['Global Quote'];
    if (!quote?.['05. price']) return null;

    return {
      price: parseFloat(quote['05. price']),
      previousClose: parseFloat(quote['08. previous close']),
      change: parseFloat(quote['09. change']),
      changePct: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
    };
  } catch {
    return null;
  }
}

// Finnhub API (60 calls/min free tier - use for sectors and additional tickers)
async function fetchFinnhubQuote(symbol: string, apiKey: string): Promise<{
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
} | null> {
  try {
    const url = `${FINNHUB_BASE_URL}?symbol=${symbol}&token=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as FinnhubQuoteResponse;
    if (!data.c || data.c === 0) return null;

    return {
      price: data.c,
      previousClose: data.pc,
      change: data.d,
      changePct: data.dp,
    };
  } catch {
    return null;
  }
}

// Main data fetch
async function fetchAllData(fredKey: string, avKey: string, finnhubKey: string): Promise<{
  indicators: Record<string, Indicator>;
  warnings: string[];
}> {
  const indicators: Record<string, Indicator> = {};
  const warnings: string[] = [];
  const timestamp = getNYTimestamp();

  // 1. Fetch FRED data (parallel - no rate limits)
  console.log('Fetching FRED data...');
  await Promise.all(
    Object.entries(FRED_SERIES).map(async ([ticker, config]) => {
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
          asOfET: timestamp,
          source: 'FRED',
        };
      } else {
        warnings.push(`FRED: ${ticker}`);
      }
    })
  );

  // 2. Fetch Alpha Vantage - core indices only (5 calls max)
  console.log('Fetching Alpha Vantage data...');
  const avSymbols = ['SPY', 'QQQ', 'IWM', 'HYG', 'TLT'];
  await Promise.all(
    avSymbols.map(async (symbol) => {
      const result = await fetchAVQuote(symbol, avKey);
      if (result) {
        indicators[symbol] = {
          displayName: symbol,
          ticker: symbol,
          price: result.price,
          previousClose: result.previousClose,
          change: result.change,
          changePct: result.changePct,
          session: 'CLOSE',
          asOfET: timestamp,
          source: 'AV',
        };
      } else {
        warnings.push(`AV: ${symbol}`);
      }
    })
  );

  // 3. Fetch Finnhub - sectors and additional tickers (60 calls/min)
  console.log('Fetching Finnhub data...');
  const finnhubSymbols = [
    // Sector ETFs
    'XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC',
    // Additional useful tickers
    'GLD', 'SLV', 'UUP', 'USO', 'LQD', 'SHY', 'RSP', 'DIA', 'VXX',
  ];

  await Promise.all(
    finnhubSymbols.map(async (symbol) => {
      const result = await fetchFinnhubQuote(symbol, finnhubKey);
      if (result) {
        indicators[symbol] = {
          displayName: SECTOR_INFO[symbol] || symbol,
          ticker: symbol,
          price: result.price,
          previousClose: result.previousClose,
          change: result.change,
          changePct: result.changePct,
          session: 'CLOSE',
          asOfET: timestamp,
          source: 'FINNHUB',
        };
      } else {
        warnings.push(`Finnhub: ${symbol}`);
      }
    })
  );

  // 4. Calculate derived indicators
  console.log('Calculating derived indicators...');

  // Yield Spread (10Y - 2Y)
  const tnx = indicators['TNX'];
  const dgs2 = indicators['DGS2'];
  if (tnx?.price !== undefined && dgs2?.price !== undefined) {
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

  // RSP/SPY Ratio (equal weight vs cap weight - breadth indicator)
  const rsp = indicators['RSP'];
  const spy = indicators['SPY'];
  if (rsp?.price && spy?.price) {
    const ratio = rsp.price / spy.price;
    const prevRatio = (rsp.previousClose ?? 1) / (spy.previousClose ?? 1);
    indicators['RSP_SPY'] = {
      displayName: 'RSP/SPY',
      ticker: 'RSP_SPY',
      price: ratio,
      previousClose: prevRatio,
      change: ratio - prevRatio,
      changePct: prevRatio !== 0 ? ((ratio - prevRatio) / prevRatio) * 100 : 0,
      session: 'CLOSE',
      source: 'PROXY',
    };
  }

  // HYG/LQD Ratio (credit risk appetite)
  const hyg = indicators['HYG'];
  const lqd = indicators['LQD'];
  if (hyg?.price && lqd?.price) {
    const ratio = hyg.price / lqd.price;
    const prevRatio = (hyg.previousClose ?? 1) / (lqd.previousClose ?? 1);
    indicators['HYG_LQD'] = {
      displayName: 'HYG/LQD',
      ticker: 'HYG_LQD',
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

// Scoring
function normalize(value: number, min: number, max: number, invert = false): number {
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = ((clamped - min) / (max - min)) * 100;
  return invert ? 100 - normalized : normalized;
}

function calculateScores(indicators: Record<string, Indicator>): {
  scores: { short: number; medium: number; long: number };
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>;
} {
  const categoryScores: Record<string, { score: number; available: boolean; weight: number }> = {};

  // Trend (SPY, QQQ, IWM, DIA)
  let trendScore = 50, trendAvailable = false;
  const trendTickers = ['SPY', 'QQQ', 'IWM', 'DIA'];
  const trendWeights = [0.4, 0.3, 0.15, 0.15];
  let trendTotal = 0, trendWeight = 0;
  trendTickers.forEach((t, i) => {
    const ind = indicators[t];
    if (ind?.changePct !== undefined) {
      trendTotal += normalize(ind.changePct, -3, 3) * trendWeights[i]!;
      trendWeight += trendWeights[i]!;
      trendAvailable = true;
    }
  });
  if (trendWeight > 0) trendScore = trendTotal / trendWeight;
  categoryScores['trend'] = { score: trendScore, available: trendAvailable, weight: 0.25 };

  // Volatility (VIX)
  let volScore = 50, volAvailable = false;
  const vix = indicators['VIX'];
  if (vix?.price !== undefined) {
    volScore = normalize(vix.price, 12, 35, true);
    volAvailable = true;
  }
  categoryScores['volTail'] = { score: volScore, available: volAvailable, weight: 0.20 };

  // Credit (HYG, LQD, HY OAS)
  let creditScore = 50, creditAvailable = false;
  const hyg = indicators['HYG'];
  const hyOas = indicators['BAMLH0A0HYM2'];
  const hygLqd = indicators['HYG_LQD'];
  let creditTotal = 0, creditWeight = 0;
  if (hyOas?.price !== undefined) {
    creditTotal += normalize(hyOas.price, 250, 550, true) * 0.5;
    creditWeight += 0.5;
    creditAvailable = true;
  }
  if (hyg?.changePct !== undefined) {
    creditTotal += normalize(hyg.changePct, -1.5, 1.5) * 0.3;
    creditWeight += 0.3;
    creditAvailable = true;
  }
  if (hygLqd?.changePct !== undefined) {
    creditTotal += normalize(hygLqd.changePct, -0.5, 0.5) * 0.2;
    creditWeight += 0.2;
  }
  if (creditWeight > 0) creditScore = creditTotal / creditWeight;
  categoryScores['creditLiquidity'] = { score: creditScore, available: creditAvailable, weight: 0.20 };

  // Rates (yield spread, TLT)
  let ratesScore = 50, ratesAvailable = false;
  const yieldSpread = indicators['YIELD_SPREAD'];
  const tlt = indicators['TLT'];
  let ratesTotal = 0, ratesWeight = 0;
  if (yieldSpread?.price !== undefined) {
    ratesTotal += normalize(yieldSpread.price, -0.5, 1.5) * 0.6;
    ratesWeight += 0.6;
    ratesAvailable = true;
  }
  if (tlt?.changePct !== undefined) {
    ratesTotal += normalize(tlt.changePct, -1.5, 1.5, true) * 0.4;
    ratesWeight += 0.4;
    ratesAvailable = true;
  }
  if (ratesWeight > 0) ratesScore = ratesTotal / ratesWeight;
  categoryScores['rates'] = { score: ratesScore, available: ratesAvailable, weight: 0.15 };

  // Breadth (RSP/SPY ratio)
  let breadthScore = 50, breadthAvailable = false;
  const rspSpy = indicators['RSP_SPY'];
  if (rspSpy?.changePct !== undefined) {
    breadthScore = normalize(rspSpy.changePct, -1, 1);
    breadthAvailable = true;
  }
  categoryScores['breadth'] = { score: breadthScore, available: breadthAvailable, weight: 0.10 };

  // USD (UUP - inverse for risk assets)
  let usdScore = 50, usdAvailable = false;
  const uup = indicators['UUP'];
  if (uup?.changePct !== undefined) {
    usdScore = normalize(uup.changePct, -1, 1, true);
    usdAvailable = true;
  }
  categoryScores['usdFx'] = { score: usdScore, available: usdAvailable, weight: 0.10 };

  // Calculate weighted average
  let totalWeight = 0, weightedSum = 0;
  for (const cat of Object.values(categoryScores)) {
    if (cat.available) {
      weightedSum += cat.score * cat.weight;
      totalWeight += cat.weight;
    }
  }
  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

  return {
    scores: {
      short: Math.round(Math.max(0, Math.min(100, baseScore * 0.6 + trendScore * 0.4))),
      medium: Math.round(Math.max(0, Math.min(100, baseScore))),
      long: Math.round(Math.max(0, Math.min(100, baseScore * 0.5 + creditScore * 0.3 + ratesScore * 0.2))),
    },
    categoryScores,
  };
}

function generateStatus(
  scores: { short: number; medium: number; long: number },
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>,
  indicators: Record<string, Indicator>
): { label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF' | 'CHOPPY'; plan: string; reasons: string[] } {
  let label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF' | 'CHOPPY';

  const avgScore = (scores.short + scores.medium + scores.long) / 3;
  if (avgScore >= 65 && scores.short >= 55) {
    label = 'RISK-ON';
  } else if (avgScore <= 35 || categoryScores['creditLiquidity']?.score < 30) {
    label = 'RISK-OFF';
  } else if (Math.abs(scores.short - scores.long) > 20) {
    label = 'CHOPPY';
  } else {
    label = 'NEUTRAL';
  }

  const plans: Record<string, string> = {
    'RISK-ON': 'Favorable conditions for risk assets. Consider adding equity exposure.',
    'RISK-OFF': 'Defensive posture recommended. Reduce risk and raise cash.',
    'CHOPPY': 'Mixed signals. Reduce size and wait for clarity.',
    'NEUTRAL': 'Balanced approach. Monitor for directional signals.',
  };

  const reasons: string[] = [];

  // VIX analysis - ALWAYS show
  const vix = indicators['VIX'];
  if (vix?.price !== undefined) {
    const desc = vix.price < 15 ? 'low' : vix.price > 25 ? 'elevated' : 'moderate';
    reasons.push(`VIX at ${vix.price.toFixed(1)} - ${desc} fear levels`);
  }

  // Credit conditions - ALWAYS show
  if (categoryScores['creditLiquidity']?.available) {
    const desc = categoryScores['creditLiquidity'].score > 60 ? 'healthy' : categoryScores['creditLiquidity'].score < 40 ? 'stressed' : 'stable';
    reasons.push(`Credit conditions appear ${desc}`);
  }

  // Yield curve - ALWAYS show
  const yieldSpread = indicators['YIELD_SPREAD'];
  if (yieldSpread?.price !== undefined) {
    const desc = yieldSpread.price < 0 ? 'inverted (caution)' : yieldSpread.price > 0.5 ? 'steep (growth signal)' : 'flat';
    reasons.push(`Yield curve is ${desc} at ${yieldSpread.price.toFixed(2)}%`);
  }

  // Market breadth - ALWAYS show
  if (categoryScores['breadth']?.available) {
    const desc = categoryScores['breadth'].score > 60 ? 'broad participation' : categoryScores['breadth'].score < 40 ? 'narrow leadership' : 'moderate';
    reasons.push(`Market breadth shows ${desc}`);
  }

  // Index momentum (SPY, QQQ) - ALWAYS show
  const spy = indicators['SPY'];
  const qqq = indicators['QQQ'];
  if (spy?.changePct !== undefined || qqq?.changePct !== undefined) {
    const spyChg = spy?.changePct ?? 0;
    const qqqChg = qqq?.changePct ?? 0;
    const avgChg = (spyChg + qqqChg) / 2;
    const direction = avgChg > 0 ? 'positive' : avgChg < 0 ? 'negative' : 'flat';
    reasons.push(`Major indices showing ${direction} momentum (${avgChg > 0 ? '+' : ''}${avgChg.toFixed(2)}%)`);
  }

  // USD strength - ALWAYS show
  const uup = indicators['UUP'];
  if (uup?.changePct !== undefined) {
    const desc = uup.changePct > 0.1 ? 'strengthening (headwind)' : uup.changePct < -0.1 ? 'weakening (tailwind)' : 'stable';
    reasons.push(`US Dollar ${desc}`);
  }

  // Treasuries (TLT) - flight to safety indicator
  const tlt = indicators['TLT'];
  if (tlt?.changePct !== undefined) {
    const desc = tlt.changePct > 0.3 ? 'bid (safety flows)' : tlt.changePct < -0.3 ? 'sold (risk appetite)' : 'stable';
    reasons.push(`Long-term Treasuries ${desc}`);
  }

  // Small caps relative strength - ALWAYS show
  const iwm = indicators['IWM'];
  if (iwm?.changePct !== undefined && spy?.changePct !== undefined) {
    const relStrength = iwm.changePct - spy.changePct;
    const desc = relStrength > 0.15 ? 'outperforming (risk-on)' : relStrength < -0.15 ? 'underperforming (risk-off)' : 'tracking';
    reasons.push(`Small caps ${desc} large caps`);
  }

  // High yield credit - ALWAYS show
  const hyg = indicators['HYG'];
  if (hyg?.changePct !== undefined) {
    const desc = hyg.changePct > 0.1 ? 'strong (risk appetite)' : hyg.changePct < -0.1 ? 'weak (credit stress)' : 'steady';
    reasons.push(`High yield bonds ${desc}`);
  }

  // Gold - ALWAYS show
  const gld = indicators['GLD'];
  if (gld?.changePct !== undefined) {
    const desc = gld.changePct > 0.2 ? 'rising (safe haven bid)' : gld.changePct < -0.2 ? 'falling (risk appetite)' : 'stable';
    reasons.push(`Gold ${desc}`);
  }

  // Tech leadership (QQQ vs SPY) - ALWAYS show
  if (qqq?.changePct !== undefined && spy?.changePct !== undefined) {
    const techLead = qqq.changePct - spy.changePct;
    const desc = techLead > 0.1 ? 'leading (growth favored)' : techLead < -0.1 ? 'lagging (value rotation)' : 'in line';
    reasons.push(`Tech sector ${desc}`);
  }

  // HY OAS Spread - ALWAYS show
  const hyOas = indicators['BAMLH0A0HYM2'];
  if (hyOas?.price !== undefined) {
    const desc = hyOas.price < 350 ? 'tight (risk-on)' : hyOas.price > 500 ? 'wide (stress signal)' : 'normal';
    reasons.push(`Credit spreads ${desc} at ${hyOas.price.toFixed(0)}bps`);
  }

  // Sector leadership summary
  const sectorScores = calculateSectorScores(indicators);
  const topSector = sectorScores.reduce((a, b) => a.score > b.score ? a : b);
  const bottomSector = sectorScores.reduce((a, b) => a.score < b.score ? a : b);
  if (topSector.score !== bottomSector.score) {
    reasons.push(`Sector leader: ${topSector.name} (${topSector.score}), laggard: ${bottomSector.name} (${bottomSector.score})`);
  }

  // Overall score summary
  const avgScore = Math.round((scores.short + scores.medium + scores.long) / 3);
  reasons.push(`Composite score: ${avgScore}/100`);

  return { label, plan: plans[label], reasons };
}

function calculateSectorScores(indicators: Record<string, Indicator>): Sector[] {
  const sectorTickers = ['XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC'];

  return sectorTickers.map(ticker => {
    const sector = indicators[ticker];
    const name = SECTOR_INFO[ticker] || ticker;

    if (!sector?.changePct) {
      return { ticker, name, score: 50 };
    }

    // Score based on daily change: +3% = 100, -3% = 0, 0% = 50
    const score = Math.round(Math.max(0, Math.min(100, 50 + sector.changePct * 16.67)));

    return { ticker, name, score, changePct: sector.changePct };
  });
}

// Main handler
export async function handler(event: { httpMethod: string }): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const corsHeaders = {
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
    const finnhubKey = process.env['FINNHUB_API_KEY'];

    if (!fredKey || !avKey) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required API keys (FRED, ALPHAVANTAGE)' }),
      };
    }

    // Finnhub is optional but recommended
    if (!finnhubKey) {
      console.warn('FINNHUB_API_KEY not set - sector data will be limited');
    }

    console.log('Fetching fresh market data...');
    const { indicators, warnings } = await fetchAllData(fredKey, avKey, finnhubKey || '');
    const { scores, categoryScores } = calculateScores(indicators);
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
      body: JSON.stringify({ error: 'Failed to fetch data' }),
    };
  }
}
