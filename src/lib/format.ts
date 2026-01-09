/**
 * Formatting utilities for numbers and display
 */

/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number | undefined, decimals: number = 2): string {
  if (price === undefined || isNaN(price)) return 'N/A';
  return price.toFixed(decimals);
}

/**
 * Format percentage change
 */
export function formatPercent(pct: number | undefined): string {
  if (pct === undefined || isNaN(pct)) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Format absolute change
 */
export function formatChange(change: number | undefined, decimals: number = 2): string {
  if (change === undefined || isNaN(change)) return 'N/A';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(decimals)}`;
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return Math.round(score).toString();
}

/**
 * Get ticker display name
 */
export function getTickerDisplayName(ticker: string): string {
  const displayNames: Record<string, string> = {
    SPY: 'S&P 500 (SPY)',
    QQQ: 'NASDAQ (QQQ)',
    IWM: 'Russell 2000',
    RSP: 'S&P Equal Wt',
    VIX: 'VIX',
    VVIX: 'VVIX',
    DXY: 'US Dollar',
    UUP: 'USD (UUP)',
    GLD: 'Gold (GLD)',
    SLV: 'Silver (SLV)',
    USO: 'Oil (USO)',
    DBA: 'Agriculture',
    HYG: 'High Yield',
    LQD: 'Inv Grade',
    TLT: '20Y Treasury',
    SHY: 'Short Treasury',
    TNX: '10Y Yield',
    IRX: '3M Yield',
    FVX: '5Y Yield',
    EURUSD: 'EUR/USD',
    YIELD_SPREAD: '10Y-2Y Spread',
    HYG_LQD_RATIO: 'HYG/LQD',
    RSP_SPY_RATIO: 'RSP/SPY',
    IWM_SPY_RATIO: 'IWM/SPY',
  };

  return displayNames[ticker] ?? ticker;
}

/**
 * Get source label for display
 */
export function getSourceLabel(source: string): string {
  switch (source) {
    case 'FRED':
      return 'FRED';
    case 'AV':
      return 'Alpha Vantage';
    case 'PROXY':
      return 'Calculated';
    default:
      return source;
  }
}
