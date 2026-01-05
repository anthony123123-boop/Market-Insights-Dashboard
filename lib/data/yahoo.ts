import yahooFinance from 'yahoo-finance2';
import { cache, CACHE_TTL } from './cache';
import { SYMBOL_CANDIDATES, PROXY_MAPPINGS } from './symbols';
import type { Capability, Indicator, SessionType, DataSource } from '../types';
import { getETTimestamp } from '../time';

// Suppress Yahoo Finance logs
yahooFinance.suppressNotices(['yahooSurvey']);

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  preMarketPrice?: number;
  postMarketPrice?: number;
  previousClose?: number;
  regularMarketTime?: Date;
}

interface QuoteResult {
  price: number | undefined;
  previousClose: number | undefined;
  change: number | undefined;
  changePct: number | undefined;
  session: SessionType;
  asOfET: string | undefined;
  resolvedSymbol: string;
}

/**
 * Try to fetch a quote from Yahoo Finance
 */
async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const quote = await yahooFinance.quote(symbol);
    if (quote && (quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice)) {
      return quote as YahooQuote;
    }
    return null;
  } catch (error) {
    console.warn(`Yahoo quote failed for ${symbol}:`, error);
    return null;
  }
}

/**
 * Determine session type from quote
 */
function getSessionFromQuote(quote: YahooQuote): SessionType {
  if (quote.regularMarketPrice) return 'REGULAR';
  if (quote.postMarketPrice) return 'POST';
  if (quote.preMarketPrice) return 'PRE';
  if (quote.previousClose) return 'CLOSE';
  return 'NA';
}

/**
 * Get the best price from quote based on session priority
 */
function getBestPrice(quote: YahooQuote): number | undefined {
  return (
    quote.regularMarketPrice ??
    quote.postMarketPrice ??
    quote.preMarketPrice ??
    quote.previousClose ??
    undefined
  );
}

/**
 * Get previous close from quote
 */
function getPreviousClose(quote: YahooQuote): number | undefined {
  return (
    quote.regularMarketPreviousClose ??
    quote.previousClose ??
    undefined
  );
}

/**
 * Compute change values (always recompute, never use provider values)
 */
function computeChange(
  price: number | undefined,
  previousClose: number | undefined
): { change: number | undefined; changePct: number | undefined } {
  if (price === undefined || previousClose === undefined || previousClose === 0) {
    return { change: undefined, changePct: undefined };
  }

  const change = price - previousClose;
  const changePct = (change / previousClose) * 100;

  return { change, changePct };
}

/**
 * Resolve a logical ticker to a working Yahoo symbol
 */
async function resolveSymbol(
  logicalTicker: string
): Promise<{ symbol: string; quote: YahooQuote; isProxy: boolean } | null> {
  const candidates = SYMBOL_CANDIDATES[logicalTicker] || [logicalTicker];

  // Try each candidate
  for (const symbol of candidates) {
    const cacheKey = `yahoo:quote:${symbol}`;

    try {
      const result = await cache.singleFlight(
        cacheKey,
        () => fetchYahooQuote(symbol),
        { ttlMs: CACHE_TTL.QUOTES }
      );

      if (result.data) {
        return { symbol, quote: result.data, isProxy: false };
      }
    } catch (error) {
      console.warn(`Failed to fetch ${symbol}:`, error);
    }
  }

  // Try proxy if available
  const proxyInfo = PROXY_MAPPINGS[logicalTicker];
  if (proxyInfo) {
    const proxySymbol = proxyInfo.proxy;
    const cacheKey = `yahoo:quote:${proxySymbol}`;

    try {
      const result = await cache.singleFlight(
        cacheKey,
        () => fetchYahooQuote(proxySymbol),
        { ttlMs: CACHE_TTL.QUOTES }
      );

      if (result.data) {
        return { symbol: proxySymbol, quote: result.data, isProxy: true };
      }
    } catch (error) {
      console.warn(`Failed to fetch proxy ${proxySymbol}:`, error);
    }
  }

  return null;
}

/**
 * Fetch indicator data for a logical ticker
 */
export async function fetchIndicator(logicalTicker: string): Promise<{
  indicator: Indicator;
  capability: Capability;
}> {
  const resolved = await resolveSymbol(logicalTicker);

  if (!resolved) {
    return {
      indicator: {
        displayName: logicalTicker,
        session: 'NA',
        source: 'YAHOO',
      },
      capability: {
        ok: false,
        triedSymbols: SYMBOL_CANDIDATES[logicalTicker] || [logicalTicker],
        reason: 'Could not resolve symbol',
      },
    };
  }

  const { symbol, quote, isProxy } = resolved;
  const price = getBestPrice(quote);
  const previousClose = getPreviousClose(quote);
  const { change, changePct } = computeChange(price, previousClose);
  const session = getSessionFromQuote(quote);

  const proxyInfo = isProxy ? PROXY_MAPPINGS[logicalTicker] : null;
  const displayName = proxyInfo?.label || logicalTicker;

  return {
    indicator: {
      displayName,
      price,
      previousClose,
      change,
      changePct,
      session,
      asOfET: quote.regularMarketTime ? getETTimestamp() : undefined,
      source: 'YAHOO' as DataSource,
    },
    capability: {
      ok: price !== undefined,
      resolvedSymbol: symbol,
      triedSymbols: SYMBOL_CANDIDATES[logicalTicker] || [logicalTicker],
      isProxy,
      sourceUsed: 'YAHOO' as DataSource,
    },
  };
}

/**
 * Fetch multiple indicators in parallel
 */
export async function fetchIndicators(tickers: string[]): Promise<{
  indicators: Record<string, Indicator>;
  capabilities: Record<string, Capability>;
}> {
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      const result = await fetchIndicator(ticker);
      return { ticker, ...result };
    })
  );

  const indicators: Record<string, Indicator> = {};
  const capabilities: Record<string, Capability> = {};

  for (const { ticker, indicator, capability } of results) {
    indicators[ticker] = indicator;
    capabilities[ticker] = capability;
  }

  return { indicators, capabilities };
}

/**
 * Fetch historical data for analysis
 */
export async function fetchHistorical(
  symbol: string,
  period1: Date,
  period2: Date = new Date()
): Promise<Array<{ date: Date; close: number; volume: number }>> {
  const cacheKey = `yahoo:history:${symbol}:${period1.toISOString()}:${period2.toISOString()}`;

  try {
    const result = await cache.singleFlight(
      cacheKey,
      async () => {
        const candidates = SYMBOL_CANDIDATES[symbol] || [symbol];

        for (const candidate of candidates) {
          try {
            const history = await yahooFinance.historical(candidate, {
              period1,
              period2,
              interval: '1d',
            });

            if (history && history.length > 0) {
              return history.map((item) => ({
                date: item.date,
                close: item.close ?? item.adjClose ?? 0,
                volume: item.volume ?? 0,
              }));
            }
          } catch (e) {
            console.warn(`Historical fetch failed for ${candidate}:`, e);
          }
        }

        return [];
      },
      { ttlMs: CACHE_TTL.HISTORICAL }
    );

    return result.data;
  } catch (error) {
    console.error(`Failed to fetch historical data for ${symbol}:`, error);
    return [];
  }
}
