import { NextRequest, NextResponse } from 'next/server';
import { debugStooqSymbol, getStooqTickers } from '@/lib/data/stooq';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Debug endpoint for Stooq data source
 *
 * Usage:
 *   GET /api/debug/stooq?symbol=VIX
 *   GET /api/debug/stooq?symbol=VIX,VVIX,SKEW
 *   GET /api/debug/stooq (tests all supported symbols)
 *
 * Returns detailed information about the Stooq response
 * including raw CSV, parsed values, and symbol alternatives tried.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbolParam = searchParams.get('symbol');

  // Determine which symbols to test
  let symbols: string[];
  if (symbolParam) {
    symbols = symbolParam.split(',').map(s => s.trim().toUpperCase());
  } else {
    symbols = getStooqTickers();
  }

  // Fetch each symbol
  const results: Record<string, unknown> = {};
  let successCount = 0;
  let failureCount = 0;

  for (const symbol of symbols) {
    const result = await debugStooqSymbol(symbol);
    results[symbol] = result;

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    symbolsTested: symbols,
    summary: {
      total: symbols.length,
      success: successCount,
      failure: failureCount,
    },
    note: 'Stooq is a free service and may not always return data for VIX indices. If all symbols fail, VIX-related indicators will be marked as unavailable.',
    results,
    documentation: {
      usage: [
        'GET /api/debug/stooq?symbol=VIX - Test single symbol',
        'GET /api/debug/stooq?symbol=VIX,VVIX - Test multiple symbols',
        'GET /api/debug/stooq - Test all supported symbols',
      ],
      supportedSymbols: getStooqTickers(),
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
