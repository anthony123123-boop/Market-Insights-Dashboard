/**
 * Format price based on asset type
 */
export function formatPrice(price: number | undefined, isFX: boolean = false): string {
  if (price === undefined || price === null || isNaN(price)) return 'N/A';
  return isFX ? price.toFixed(4) : price.toFixed(2);
}

/**
 * Format change value
 */
export function formatChange(change: number | undefined, isFX: boolean = false): string {
  if (change === undefined || change === null || isNaN(change)) return 'N/A';
  const sign = change >= 0 ? '+' : '';
  return sign + (isFX ? change.toFixed(4) : change.toFixed(2));
}

/**
 * Format percentage change
 */
export function formatChangePct(pct: number | undefined): string {
  if (pct === undefined || pct === null || isNaN(pct)) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}

/**
 * Get color class based on change
 */
export function getChangeColorClass(change: number | undefined): string {
  if (change === undefined || change === null || isNaN(change)) return 'text-gray-400';
  if (change > 0) return 'text-green-400';
  if (change < 0) return 'text-red-400';
  return 'text-gray-400';
}

/**
 * Get score color (0-100)
 */
export function getScoreColor(score: number): {
  text: string;
  border: string;
  bg: string;
  glow: string;
  hex: string;
} {
  if (score <= 25) {
    return {
      text: 'text-red-400',
      border: 'border-red-400/50',
      bg: 'bg-red-400',
      glow: 'glow-red',
      hex: '#f87171',
    };
  }
  if (score <= 45) {
    return {
      text: 'text-orange-400',
      border: 'border-orange-400/50',
      bg: 'bg-orange-400',
      glow: 'glow-orange',
      hex: '#fb923c',
    };
  }
  if (score <= 60) {
    return {
      text: 'text-yellow-400',
      border: 'border-yellow-400/50',
      bg: 'bg-yellow-400',
      glow: 'glow-yellow',
      hex: '#facc15',
    };
  }
  if (score <= 80) {
    return {
      text: 'text-green-400',
      border: 'border-green-400/50',
      bg: 'bg-green-400',
      glow: 'glow-green',
      hex: '#4ade80',
    };
  }
  return {
    text: 'text-emerald-400',
    border: 'border-emerald-400/50',
    bg: 'bg-emerald-400',
    glow: 'glow-green',
    hex: '#34d399',
  };
}

/**
 * Get bar color for sector chart based on score
 */
export function getSectorBarColor(score: number): string {
  if (score <= 20) return '#ef4444'; // red-500
  if (score <= 35) return '#f97316'; // orange-500
  if (score <= 50) return '#eab308'; // yellow-500
  if (score <= 70) return '#84cc16'; // lime-500
  return '#22c55e'; // green-500
}

/**
 * Determine if ticker is FX for formatting
 */
export function isFXTicker(ticker: string): boolean {
  const fxTickers = ['EURUSD', 'DXY', 'FXY', 'USDJPY', 'GBPUSD'];
  return fxTickers.includes(ticker.toUpperCase()) || ticker.includes('=X');
}

/**
 * Determine if ticker is a yield/rate for formatting
 */
export function isYieldTicker(ticker: string): boolean {
  const yieldTickers = ['TNX', 'IRX', 'FVX', 'TYX', 'DGS2', 'DGS1', 'YIELD_10Y_2Y'];
  return yieldTickers.includes(ticker.toUpperCase());
}

/**
 * Format price for small pills (ticker-aware)
 * - FX: 4 decimals
 * - Yields: 2 decimals (percentage)
 * - ETFs/equities: 2 decimals with $ prefix
 */
export function formatPillPrice(price: number | undefined, ticker: string): string {
  if (price === undefined || price === null || isNaN(price)) return '—';

  if (isFXTicker(ticker)) {
    return price.toFixed(4);
  }

  if (isYieldTicker(ticker)) {
    return price.toFixed(2) + '%';
  }

  // Default: ETF/equity with dollar sign
  return '$' + price.toFixed(2);
}

/**
 * Get display name for ticker
 */
export function getDisplayName(ticker: string): string {
  const names: Record<string, string> = {
    SPY: 'S&P 500',
    QQQ: 'Nasdaq 100',
    IWM: 'Russell 2000',
    RSP: 'Equal Weight S&P',
    VIX: 'VIX',
    VVIX: 'VVIX',
    VIX9D: 'VIX 9-Day',
    VIX3M: 'VIX 3-Month',
    VIX_VVIX_RATIO: 'VIX/VVIX',
    SKEW: 'SKEW',
    MOVE: 'MOVE Index',
    HYG: 'High Yield Corp',
    LQD: 'Inv Grade Corp',
    HYG_LQD_RATIO: 'HYG/LQD',
    TLT: '20+ Year Treasury',
    SHY: '1-3 Year Treasury',
    DXY: 'US Dollar Index',
    UUP: 'USD Bull ETF',
    FXY: 'Japanese Yen',
    EURUSD: 'EUR/USD',
    TNX: '10-Year Yield',
    IRX: '13-Week T-Bill',
    FVX: '5-Year Yield',
    YIELD_10Y_2Y: '10Y-2Y Spread',
    GLD: 'Gold',
    SLV: 'Silver',
    USO: 'Oil',
    DBA: 'Agriculture',
    XLK: 'Technology',
    XLF: 'Financials',
    XLI: 'Industrials',
    XLE: 'Energy',
    XLV: 'Healthcare',
    XLP: 'Consumer Staples',
    XLU: 'Utilities',
    XLRE: 'Real Estate',
    XLY: 'Consumer Disc.',
    XLC: 'Communication',
    RSP_SPY_RATIO: 'Breadth (RSP/SPY)',
    IWM_SPY_RATIO: 'Small Cap Rel.',
  };
  return names[ticker] || ticker;
}
