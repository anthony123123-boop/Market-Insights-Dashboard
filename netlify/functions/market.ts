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
  available?: boolean;
  proxy?: string;
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


// Cache
interface CacheEntry {
  data: MarketDataResponse;
  timestamp: number;
}

let serverCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// API URLs
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const OVERALL_FETCH_TIMEOUT_MS = 12000;

// FRED Series (macro data - no rate limits)
const FRED_SERIES: Record<string, { seriesId: string; displayName: string }> = {
  SP500: { seriesId: 'SP500', displayName: 'S&P 500' },
  NASDAQCOM: { seriesId: 'NASDAQCOM', displayName: 'Nasdaq Composite' },
  DJIA: { seriesId: 'DJIA', displayName: 'Dow Jones' },
  RU2000PR: { seriesId: 'RU2000PR', displayName: 'Russell 2000' },
  VIX: { seriesId: 'VIXCLS', displayName: 'VIX' },
  DGS10: { seriesId: 'DGS10', displayName: '10Y Treasury' },
  DGS2: { seriesId: 'DGS2', displayName: '2Y Treasury' },
  DGS5: { seriesId: 'DGS5', displayName: '5Y Treasury' },
  DGS1: { seriesId: 'DGS1', displayName: '1Y Treasury' },
  BAMLH0A0HYM2: { seriesId: 'BAMLH0A0HYM2', displayName: 'HY OAS Spread' },
  BAMLC0A0CM: { seriesId: 'BAMLC0A0CM', displayName: 'IG OAS Spread' },
  T10YIE: { seriesId: 'T10YIE', displayName: '10Y Breakeven Inflation' },
  TEDRATE: { seriesId: 'TEDRATE', displayName: 'TED Spread' },
  DTWEXBGS: { seriesId: 'DTWEXBGS', displayName: 'US Dollar Index' },
  GOLD: { seriesId: 'GOLDAMGBD228NLBM', displayName: 'Gold Spot' },
  OIL: { seriesId: 'DCOILWTICO', displayName: 'WTI Crude' },
};

const SECTOR_PROXY_RULES: Record<
  string,
  { name: string; source: string; mode: 'pct' | 'level'; min: number; max: number; invert?: boolean }
> = {
  XLK: { name: 'Technology', source: 'NASDAQCOM', mode: 'pct', min: -2, max: 2 },
  XLF: { name: 'Financials', source: 'DGS10', mode: 'pct', min: -1.5, max: 1.5 },
  XLI: { name: 'Industrials', source: 'SP500', mode: 'pct', min: -2, max: 2 },
  XLE: { name: 'Energy', source: 'OIL', mode: 'pct', min: -3, max: 3 },
  XLV: { name: 'Health Care', source: 'BAMLH0A0HYM2', mode: 'level', min: 250, max: 600, invert: true },
  XLP: { name: 'Cons. Staples', source: 'SP500', mode: 'pct', min: -1.5, max: 1.5 },
  XLU: { name: 'Utilities', source: 'DGS10', mode: 'level', min: 2, max: 5, invert: true },
  XLRE: { name: 'Real Estate', source: 'DGS10', mode: 'level', min: 2, max: 5, invert: true },
  XLY: { name: 'Cons. Disc.', source: 'SP500', mode: 'pct', min: -2, max: 2 },
  XLC: { name: 'Communication', source: 'NASDAQCOM', mode: 'pct', min: -2, max: 2 },
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

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = MAX_RETRIES): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init);
      if (response.ok) return response;
      if (response.status >= 500 && attempt < retries) {
        await wait(500 * Math.pow(2, attempt));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt >= retries) throw error;
      await wait(500 * Math.pow(2, attempt));
    }
  }
  return null;
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

    const response = await fetchWithRetry(url);
    if (!response || !response.ok) return null;

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

// Main data fetch
async function fetchAllData(fredKey: string): Promise<{
  indicators: Record<string, Indicator>;
  warnings: string[];
  sectors: Sector[];
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

  const sectors = buildSectorScores(indicators, warnings);

  // 4. Calculate derived indicators
  console.log('Calculating derived indicators...');
  addProxyIndicators(indicators);

  // Yield Spread (10Y - 2Y)
  const dgs10 = indicators['DGS10'];
  const dgs2 = indicators['DGS2'];
  if (dgs10?.price !== undefined && dgs2?.price !== undefined) {
    const spread = dgs10.price - dgs2.price;
    const prevSpread = (dgs10.previousClose ?? 0) - (dgs2.previousClose ?? 0);
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

  // Small/Large Ratio (breadth proxy)
  const russell = indicators['RU2000PR'];
  const sp500 = indicators['SP500'];
  if (russell?.price && sp500?.price) {
    const ratio = russell.price / sp500.price;
    const prevRatio = (russell.previousClose ?? 1) / (sp500.previousClose ?? 1);
    indicators['SMALL_LARGE'] = {
      displayName: 'Small/Large Ratio',
      ticker: 'SMALL_LARGE',
      price: ratio,
      previousClose: prevRatio,
      change: ratio - prevRatio,
      changePct: prevRatio !== 0 ? ((ratio - prevRatio) / prevRatio) * 100 : 0,
      session: 'CLOSE',
      source: 'PROXY',
    };
  }

  const spy = indicators['SPY'];
  const rsp = indicators['RSP'];
  if (spy?.price && rsp?.price) {
    const ratio = rsp.price / spy.price;
    const prevRatio = (rsp.previousClose ?? 1) / (spy.previousClose ?? 1);
    indicators['RSP_SPY_RATIO'] = {
      displayName: 'RSP/SPY Ratio',
      ticker: 'RSP_SPY_RATIO',
      price: ratio,
      previousClose: prevRatio,
      change: ratio - prevRatio,
      changePct: prevRatio !== 0 ? ((ratio - prevRatio) / prevRatio) * 100 : 0,
      session: 'CLOSE',
      source: 'PROXY',
      isProxy: true,
      proxyNote: 'Proxy ratio using SP500-based RSP proxy.',
    };
  }

  const iwm = indicators['IWM'];
  if (spy?.price && iwm?.price) {
    const ratio = iwm.price / spy.price;
    const prevRatio = (iwm.previousClose ?? 1) / (spy.previousClose ?? 1);
    indicators['IWM_SPY_RATIO'] = {
      displayName: 'IWM/SPY Ratio',
      ticker: 'IWM_SPY_RATIO',
      price: ratio,
      previousClose: prevRatio,
      change: ratio - prevRatio,
      changePct: prevRatio !== 0 ? ((ratio - prevRatio) / prevRatio) * 100 : 0,
      session: 'CLOSE',
      source: 'PROXY',
      isProxy: true,
      proxyNote: 'Proxy ratio using Russell 2000 and SP500 indices.',
    };
  }

  const hyg = indicators['HYG'];
  const lqd = indicators['LQD'];
  if (hyg?.price && lqd?.price) {
    const ratio = hyg.price / lqd.price;
    const prevRatio = (hyg.previousClose ?? 1) / (lqd.previousClose ?? 1);
    indicators['HYG_LQD_RATIO'] = {
      displayName: 'HYG/LQD Ratio',
      ticker: 'HYG_LQD_RATIO',
      price: ratio,
      previousClose: prevRatio,
      change: ratio - prevRatio,
      changePct: prevRatio !== 0 ? ((ratio - prevRatio) / prevRatio) * 100 : 0,
      session: 'CLOSE',
      source: 'PROXY',
      isProxy: true,
      proxyNote: 'Proxy ratio using HY vs IG OAS spreads.',
    };
  }

  return { indicators, warnings, sectors };
}

function addProxyIndicator(
  indicators: Record<string, Indicator>,
  sourceKey: string,
  proxyTicker: string,
  displayName: string,
  proxyNote: string
): void {
  if (indicators[proxyTicker]) return;
  const source = indicators[sourceKey];
  if (!source || source.price === undefined || source.previousClose === undefined) return;
  indicators[proxyTicker] = {
    displayName,
    ticker: proxyTicker,
    price: source.price,
    previousClose: source.previousClose,
    change: source.change,
    changePct: source.changePct,
    session: source.session,
    asOfET: source.asOfET,
    source: 'PROXY',
    isProxy: true,
    proxyNote,
  };
}

function addProxyIndicators(indicators: Record<string, Indicator>): void {
  addProxyIndicator(
    indicators,
    'SP500',
    'SPY',
    'S&P 500 (Proxy)',
    'Proxy for SPY using FRED S&P 500 index.'
  );
  addProxyIndicator(
    indicators,
    'NASDAQCOM',
    'QQQ',
    'Nasdaq 100 (Proxy)',
    'Proxy for QQQ using FRED Nasdaq Composite.'
  );
  addProxyIndicator(
    indicators,
    'RU2000PR',
    'IWM',
    'Russell 2000 (Proxy)',
    'Proxy for IWM using FRED Russell 2000 index.'
  );
  addProxyIndicator(
    indicators,
    'SP500',
    'RSP',
    'Equal Weight S&P (Proxy)',
    'Proxy for RSP using FRED S&P 500 index.'
  );
  addProxyIndicator(
    indicators,
    'GOLD',
    'GLD',
    'Gold (Proxy)',
    'Proxy for GLD using FRED gold spot price.'
  );
  addProxyIndicator(
    indicators,
    'DTWEXBGS',
    'UUP',
    'US Dollar (Proxy)',
    'Proxy for UUP using trade-weighted dollar index.'
  );
  addProxyIndicator(
    indicators,
    'BAMLH0A0HYM2',
    'HYG',
    'High Yield (Proxy)',
    'Proxy for HYG using HY OAS spread.'
  );
  addProxyIndicator(
    indicators,
    'BAMLC0A0CM',
    'LQD',
    'Inv. Grade (Proxy)',
    'Proxy for LQD using IG OAS spread.'
  );
}

async function safeFetchAllData(
  fredKey: string
): Promise<{ indicators: Record<string, Indicator>; warnings: string[]; sectors: Sector[] }> {
  const timeoutWarnings: string[] = [];
  const timeoutFallback = new Promise<{ indicators: Record<string, Indicator>; warnings: string[]; sectors: Sector[] }>((resolve) => {
    setTimeout(() => {
      timeoutWarnings.push('Data fetch timed out');
      resolve({
        indicators: {},
        warnings: timeoutWarnings,
        sectors: buildSectorScores(null, timeoutWarnings),
      });
    }, OVERALL_FETCH_TIMEOUT_MS);
  });

  try {
    return await Promise.race([fetchAllData(fredKey), timeoutFallback]);
  } catch {
    const warnings = ['Data fetch failed'];
    return {
      indicators: {},
      warnings,
      sectors: buildSectorScores(null, warnings),
    };
  }
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

  // Trend (SP500, NASDAQ, DJIA, Russell 2000)
  let trendScore = 50, trendAvailable = false;
  const trendTickers = ['SP500', 'NASDAQCOM', 'DJIA', 'RU2000PR'];
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

  // Credit (HY OAS, TED spread)
  let creditScore = 50, creditAvailable = false;
  const hyOas = indicators['BAMLH0A0HYM2'];
  const ted = indicators['TEDRATE'];
  let creditTotal = 0, creditWeight = 0;
  if (hyOas?.price !== undefined) {
    creditTotal += normalize(hyOas.price, 250, 550, true) * 0.5;
    creditWeight += 0.5;
    creditAvailable = true;
  }
  if (ted?.price !== undefined) {
    creditTotal += normalize(ted.price, 0.1, 0.6, true) * 0.5;
    creditWeight += 0.5;
    creditAvailable = true;
  }
  if (creditWeight > 0) creditScore = creditTotal / creditWeight;
  categoryScores['creditLiquidity'] = { score: creditScore, available: creditAvailable, weight: 0.20 };

  // Rates (yield spread, 10Y move)
  let ratesScore = 50, ratesAvailable = false;
  const yieldSpread = indicators['YIELD_SPREAD'];
  const dgs10 = indicators['DGS10'];
  let ratesTotal = 0, ratesWeight = 0;
  if (yieldSpread?.price !== undefined) {
    ratesTotal += normalize(yieldSpread.price, -0.5, 1.5) * 0.6;
    ratesWeight += 0.6;
    ratesAvailable = true;
  }
  if (dgs10?.changePct !== undefined) {
    ratesTotal += normalize(dgs10.changePct, -1.5, 1.5, true) * 0.4;
    ratesWeight += 0.4;
    ratesAvailable = true;
  }
  if (ratesWeight > 0) ratesScore = ratesTotal / ratesWeight;
  categoryScores['rates'] = { score: ratesScore, available: ratesAvailable, weight: 0.15 };

  // Breadth (small/large ratio)
  let breadthScore = 50, breadthAvailable = false;
  const smallLarge = indicators['SMALL_LARGE'];
  if (smallLarge?.changePct !== undefined) {
    breadthScore = normalize(smallLarge.changePct, -1, 1);
    breadthAvailable = true;
  }
  categoryScores['breadth'] = { score: breadthScore, available: breadthAvailable, weight: 0.10 };

  // USD (trade-weighted index, inverse for risk assets)
  let usdScore = 50, usdAvailable = false;
  const usd = indicators['DTWEXBGS'];
  if (usd?.changePct !== undefined) {
    usdScore = normalize(usd.changePct, -0.7, 0.7, true);
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

  const reasons = buildDriverReasons(categoryScores, indicators);

  return { label, plan: plans[label], reasons };
}

function buildDriverReasons(
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>,
  indicators: Record<string, Indicator>
): string[] {
  const drivers: Array<{ key: string; score: number; text: string }> = [];

  const vix = indicators['VIX'];
  if (vix?.price !== undefined) {
    const desc = vix.price < 15 ? 'low' : vix.price > 25 ? 'elevated' : 'moderate';
    drivers.push({ key: 'volTail', score: categoryScores['volTail']?.score ?? 50, text: `VIX at ${vix.price.toFixed(1)} (${desc})` });
  }

  const credit = categoryScores['creditLiquidity'];
  if (credit?.available) {
    const desc = credit.score > 60 ? 'healthy' : credit.score < 40 ? 'stressed' : 'stable';
    drivers.push({ key: 'creditLiquidity', score: credit.score, text: `Credit conditions ${desc}` });
  }

  const hyOas = indicators['BAMLH0A0HYM2'];
  if (hyOas?.price !== undefined) {
    const desc = hyOas.price < 350 ? 'tight' : hyOas.price > 500 ? 'wide' : 'normal';
    drivers.push({ key: 'hyOas', score: credit?.score ?? 50, text: `HY spreads ${desc} (${hyOas.price.toFixed(0)}bps)` });
  }

  const ted = indicators['TEDRATE'];
  if (ted?.price !== undefined) {
    const desc = ted.price < 0.2 ? 'calm' : ted.price > 0.4 ? 'elevated' : 'steady';
    drivers.push({ key: 'ted', score: credit?.score ?? 50, text: `TED spread ${desc} (${ted.price.toFixed(2)}%)` });
  }

  const yieldSpread = indicators['YIELD_SPREAD'];
  if (yieldSpread?.price !== undefined) {
    const desc = yieldSpread.price < 0 ? 'inverted' : yieldSpread.price > 0.5 ? 'steep' : 'flat';
    drivers.push({ key: 'rates', score: categoryScores['rates']?.score ?? 50, text: `Yield curve ${desc} (${yieldSpread.price.toFixed(2)}%)` });
  }

  const breadth = categoryScores['breadth'];
  if (breadth?.available) {
    const desc = breadth.score > 60 ? 'broad participation' : breadth.score < 40 ? 'narrow leadership' : 'balanced';
    drivers.push({ key: 'breadth', score: breadth.score, text: `Breadth shows ${desc}` });
  }

  const sp500 = indicators['SP500'];
  if (sp500?.changePct !== undefined) {
    drivers.push({ key: 'sp500', score: categoryScores['trend']?.score ?? 50, text: `S&P 500 ${sp500.changePct > 0 ? '+' : ''}${sp500.changePct.toFixed(2)}%` });
  }

  const nasdaq = indicators['NASDAQCOM'];
  if (nasdaq?.changePct !== undefined) {
    drivers.push({ key: 'nasdaq', score: categoryScores['trend']?.score ?? 50, text: `Nasdaq ${nasdaq.changePct > 0 ? '+' : ''}${nasdaq.changePct.toFixed(2)}%` });
  }

  const usd = indicators['DTWEXBGS'];
  if (usd?.changePct !== undefined) {
    const desc = usd.changePct > 0.1 ? 'strengthening' : usd.changePct < -0.1 ? 'weakening' : 'steady';
    drivers.push({ key: 'usdFx', score: categoryScores['usdFx']?.score ?? 50, text: `US Dollar ${desc}` });
  }

  const gold = indicators['GOLD'];
  if (gold?.changePct !== undefined) {
    const desc = gold.changePct > 0.2 ? 'rising' : gold.changePct < -0.2 ? 'falling' : 'stable';
    drivers.push({ key: 'gold', score: Math.abs(gold.changePct), text: `Gold ${desc}` });
  }

  const oil = indicators['OIL'];
  if (oil?.changePct !== undefined) {
    drivers.push({ key: 'oil', score: Math.abs(oil.changePct), text: `Oil ${oil.changePct > 0 ? '+' : ''}${oil.changePct.toFixed(2)}%` });
  }

  const infl = indicators['T10YIE'];
  if (infl?.price !== undefined) {
    const desc = infl.price > 2.7 ? 'rising' : infl.price < 2 ? 'cooling' : 'stable';
    drivers.push({ key: 'infl', score: 50, text: `Inflation expectations ${desc}` });
  }

  const tenYear = indicators['DGS10'];
  if (tenYear?.price !== undefined) {
    drivers.push({ key: 'dgs10', score: 50, text: `10Y yield at ${tenYear.price.toFixed(2)}%` });
  }

  const rspSpy = indicators['RSP_SPY_RATIO'];
  if (rspSpy?.changePct !== undefined) {
    drivers.push({ key: 'rspSpy', score: categoryScores['breadth']?.score ?? 50, text: `Breadth (RSP/SPY) ${rspSpy.changePct > 0 ? '+' : ''}${rspSpy.changePct.toFixed(2)}%` });
  }

  const iwmSpy = indicators['IWM_SPY_RATIO'];
  if (iwmSpy?.changePct !== undefined) {
    drivers.push({ key: 'iwmSpy', score: categoryScores['breadth']?.score ?? 50, text: `Small caps vs large ${iwmSpy.changePct > 0 ? '+' : ''}${iwmSpy.changePct.toFixed(2)}%` });
  }

  const hygLqd = indicators['HYG_LQD_RATIO'];
  if (hygLqd?.changePct !== undefined) {
    drivers.push({ key: 'hygLqd', score: credit?.score ?? 50, text: `Credit risk ${hygLqd.changePct > 0 ? '+' : ''}${hygLqd.changePct.toFixed(2)}%` });
  }

  return drivers
    .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
    .slice(0, 10)
    .map(driver => driver.text);
}

function buildSectorScores(indicators: Record<string, Indicator>, warnings: string[]): Sector[] {
  const sectors = Object.entries(SECTOR_PROXY_RULES).map(([ticker, rule]) => {
    const indicator = indicators[rule.source];
    if (!indicator || indicator.price === undefined) {
      return { ticker, name: rule.name, score: 50, available: false, proxy: rule.source };
    }

    const scoreBase = rule.mode === 'pct'
      ? normalize(indicator.changePct ?? 0, rule.min, rule.max, rule.invert)
      : normalize(indicator.price, rule.min, rule.max, rule.invert);

    return {
      ticker,
      name: rule.name,
      score: Math.round(scoreBase),
      changePct: indicator.changePct,
      available: true,
      proxy: rule.source,
    };
  });

  const missingCount = sectors.filter((sector) => sector.available === false).length;
  if (missingCount > 0) {
    warnings.push(`Sector proxies unavailable: ${missingCount}/${sectors.length}`);
  }

  return sectors;
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300' },
        body: JSON.stringify({
          ...serverCache.data,
          currentTimeNY: getNYTimestamp(),
          cache: { state: 'CACHED', ageSeconds: Math.floor((now - serverCache.timestamp) / 1000), timestamp: serverCache.data.cache.timestamp },
        }),
      };
    }

    const fredKey = process.env['FRED_API_KEY'];
    if (!fredKey) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required API key (FRED)' }),
      };
    }

    console.log('Fetching fresh market data...');
    const { indicators, warnings, sectors } = await safeFetchAllData(fredKey);
    if (Object.keys(indicators).length === 0 && serverCache) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...serverCache.data,
          currentTimeNY: getNYTimestamp(),
          cache: {
            state: 'STALE',
            ageSeconds: Math.floor((Date.now() - serverCache.timestamp) / 1000),
            timestamp: serverCache.data.cache.timestamp,
          },
          warnings: [...serverCache.data.warnings, ...warnings, 'Using stale cache'],
        }),
      };
    }
    const { scores, categoryScores } = calculateScores(indicators);
    const status = generateStatus(scores, categoryScores, indicators);

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
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300' },
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
