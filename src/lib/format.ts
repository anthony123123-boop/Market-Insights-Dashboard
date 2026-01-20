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
    SP500: 'S&P 500',
    NASDAQCOM: 'Nasdaq Composite',
    DJIA: 'Dow Jones',
    RU2000PR: 'Russell 2000',
    VIX: 'VIX',
    DTWEXBGS: 'US Dollar Index',
    GOLD: 'Gold',
    OIL: 'Oil',
    DGS10: '10Y Yield',
    DGS2: '2Y Yield',
    DGS5: '5Y Yield',
    DGS1: '1Y Yield',
    YIELD_SPREAD: '10Y-2Y Spread',
    T10YIE: 'Inflation Expect.',
    BAMLH0A0HYM2: 'HY OAS Spread',
    TEDRATE: 'TED Spread',
    SMALL_LARGE: 'Small/Large Ratio',
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
