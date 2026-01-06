import { NextRequest, NextResponse } from 'next/server';
import { debugStooqSymbol, STOOQ_SYMBOLS } from '@/lib/data/stooq';
import { FRED_SERIES, isFredAvailable, fetchFredIndicator } from '@/lib/data/fred';
import { getTickerSource, TICKER_SOURCES, OPTIONAL_TICKERS, PRIORITY_TICKERS } from '@/lib/data/symbols';
import { getETTimestamp } from '@/lib/time';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint: Test symbol fetch from provider
 * GET /api/debug/provider?symbol=SPY
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.toUpperCase();

  if (!symbol) {
    // Return provider status overview
    return NextResponse.json({
      ok: true,
      timestamp: getETTimestamp(),
      usage: 'GET /api/debug/provider?symbol=SPY',
      providers: {
        STOOQ: {
          status: 'available',
          description: 'PRIMARY for US ETFs/equities (free, no API key)',
          supportedSymbols: Object.keys(STOOQ_SYMBOLS),
        },
        FRED: {
          status: isFredAvailable() ? 'available' : 'unavailable (no API key)',
          description: 'PRIMARY for VIX (VIXCLS) and Treasury yields',
          supportedSymbols: Object.keys(FRED_SERIES),
        },
        AV: {
          status: 'fallback only',
          description: 'AlphaVantage (25 req/day limit on free tier)',
        },
      },
      tickerCategories: {
        priority: [...PRIORITY_TICKERS],
        optional: [...OPTIONAL_TICKERS],
      },
      sourceMapping: TICKER_SOURCES,
    });
  }

  // Get the source for this symbol
  const source = getTickerSource(symbol);
  const isOptional = (OPTIONAL_TICKERS as readonly string[]).includes(symbol);
  const isPriority = (PRIORITY_TICKERS as readonly string[]).includes(symbol);

  let result: {
    ok: boolean;
    symbol: string;
    source: string;
    isOptional: boolean;
    isPriority: boolean;
    data?: unknown;
    error?: string;
    timestamp: string;
  };

  try {
    if (source === 'STOOQ') {
      const stooqResult = await debugStooqSymbol(symbol);
      result = {
        ok: stooqResult.success,
        symbol,
        source: 'STOOQ',
        isOptional,
        isPriority,
        data: stooqResult,
        timestamp: getETTimestamp(),
      };
    } else if (source === 'FRED') {
      const fredResult = await fetchFredIndicator(symbol);
      result = {
        ok: fredResult.capability.ok,
        symbol,
        source: 'FRED',
        isOptional,
        isPriority,
        data: {
          indicator: fredResult.indicator,
          capability: fredResult.capability,
          seriesId: FRED_SERIES[symbol]?.seriesId,
        },
        timestamp: getETTimestamp(),
      };
    } else if (source === 'AV') {
      // For AV, just return info without actually fetching (to preserve rate limit)
      result = {
        ok: false,
        symbol,
        source: 'AV (AlphaVantage)',
        isOptional,
        isPriority,
        data: {
          note: 'AlphaVantage fetch skipped to preserve 25 req/day limit',
          recommendation: 'Most symbols should use STOOQ or FRED instead',
        },
        timestamp: getETTimestamp(),
      };
    } else {
      result = {
        ok: false,
        symbol,
        source: source || 'UNKNOWN',
        isOptional,
        isPriority,
        error: `Unknown source for symbol ${symbol}`,
        timestamp: getETTimestamp(),
      };
    }
  } catch (error) {
    result = {
      ok: false,
      symbol,
      source,
      isOptional,
      isPriority,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: getETTimestamp(),
    };
  }

  return NextResponse.json(result);
}
