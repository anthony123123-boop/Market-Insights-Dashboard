import { NextRequest, NextResponse } from 'next/server';
import { debugFetchSymbol, isAlphaVantageAvailable, AV_EQUITY_SYMBOLS } from '@/lib/data/alphavantage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Debug endpoint for Alpha Vantage API
 *
 * Usage:
 *   GET /api/debug/av?symbol=SPY
 *   GET /api/debug/av?symbol=QQQ,GLD,XLK
 *   GET /api/debug/av (tests all supported symbols)
 *
 * Returns detailed information about the Alpha Vantage response
 * including raw response, parsed values, and any error messages.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbolParam = searchParams.get('symbol');

  // Check if API key is configured
  if (!isAlphaVantageAvailable()) {
    return NextResponse.json({
      error: 'Alpha Vantage API key not configured',
      hint: 'Set ALPHAVANTAGE_API_KEY environment variable',
    }, { status: 503 });
  }

  // Determine which symbols to test
  let symbols: string[];
  if (symbolParam) {
    symbols = symbolParam.split(',').map(s => s.trim().toUpperCase());
  } else {
    // If no symbol specified, test first 5 symbols (to conserve API quota)
    symbols = AV_EQUITY_SYMBOLS.slice(0, 5);
  }

  // Fetch each symbol
  const results: Record<string, unknown> = {};
  let successCount = 0;
  let failureCount = 0;

  for (const symbol of symbols) {
    const result = await debugFetchSymbol(symbol);
    results[symbol] = result;

    if (result.parsed && result.parsed.price) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    apiKeyConfigured: true,
    symbolsTested: symbols,
    summary: {
      total: symbols.length,
      success: successCount,
      failure: failureCount,
    },
    results,
    documentation: {
      usage: [
        'GET /api/debug/av?symbol=SPY - Test single symbol',
        'GET /api/debug/av?symbol=SPY,QQQ,GLD - Test multiple symbols',
        'GET /api/debug/av - Test first 5 default symbols',
      ],
      responseFields: {
        httpStatus: 'HTTP response code from Alpha Vantage',
        symbol: 'Normalized symbol requested',
        rawResponse: 'Raw JSON from Alpha Vantage (API key redacted)',
        parsed: 'Extracted price/previousClose/tradingDay if successful',
        error: 'Error message from Alpha Vantage if present',
        note: 'Rate limit message if present',
        information: 'API information message if present',
        isRateLimited: 'true if rate limited',
        isError: 'true if there was an error',
      },
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
