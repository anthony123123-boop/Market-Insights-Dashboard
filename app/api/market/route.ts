import { NextRequest, NextResponse } from 'next/server';
import { fetchAllMarketData } from '@/lib/data';
import { calculateScores, generateStatus, calculateSectorScores } from '@/lib/analysis';
import { MarketDataResponseSchema, type MarketDataResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse settings from query params
    const refreshInterval = parseInt(searchParams.get('refreshInterval') || '15', 10);
    const weightPreset = (searchParams.get('weightPreset') || 'balanced') as 'balanced' | 'risk-off-sensitive' | 'trend-following';

    // Parse timeframes
    const timeframes = {
      short: {
        min: parseInt(searchParams.get('shortMin') || '1', 10),
        max: parseInt(searchParams.get('shortMax') || '5', 10),
      },
      medium: {
        min: parseInt(searchParams.get('mediumMin') || '10', 10),
        max: parseInt(searchParams.get('mediumMax') || '30', 10),
      },
      long: {
        min: parseInt(searchParams.get('longMin') || '60', 10),
        max: parseInt(searchParams.get('longMax') || '252', 10),
      },
    };

    // Fetch all market data
    const {
      indicators,
      capabilities,
      warnings,
      cacheState,
      cacheAgeSeconds,
      pulledAtET,
      lastUpdatedET,
      dataAsOfET,
    } = await fetchAllMarketData({
      refreshInterval,
      timeframes,
      weightPreset,
    });

    // Calculate scores
    const { scores, categoryScores, missingCategories } = calculateScores(indicators, weightPreset);

    // Generate status
    const status = generateStatus(scores, categoryScores, indicators, missingCategories);

    // Calculate sector scores
    // DEBUG: Log sector ETF indicators before scoring
    const sectorTickers = ['XLK', 'XLF', 'XLI', 'XLE', 'XLV', 'XLP', 'XLU', 'XLRE', 'XLY', 'XLC'];
    console.log('[API:DEBUG] Sector ETF indicators:');
    for (const t of sectorTickers) {
      const ind = indicators[t];
      console.log(`  ${t}: price=${ind?.price}, previousClose=${ind?.previousClose}, changePct=${ind?.changePct}`);
    }
    const sectors = calculateSectorScores(indicators);
    console.log('[API:DEBUG] Computed sector scores:', sectors.map(s => `${s.ticker}:${s.score}`).join(', '));

    // Build response
    const response: MarketDataResponse = {
      pulledAtET,
      lastUpdatedET,
      dataAsOfET,
      cache: {
        state: cacheState,
        ageSeconds: cacheAgeSeconds,
      },
      capabilities,
      indicators,
      scores,
      status,
      sectors,
      warnings,
    };

    // Validate response
    const validated = MarketDataResponseSchema.safeParse(response);

    if (!validated.success) {
      console.error('Response validation failed:', validated.error);
      // Still return the response but add a warning
      response.warnings.push({
        code: 'VALIDATION_WARNING',
        message: 'Response schema validation had issues',
      });
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Market API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch market data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
