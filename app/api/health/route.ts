import { NextResponse } from 'next/server';
import { cache } from '@/lib/data';
import type { HealthResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = cache.getStats();

    // Check if we have cached market data
    const marketCacheKey = stats.keys.find((k) => k.startsWith('market:all'));
    const marketCache = marketCacheKey ? cache.get(marketCacheKey) : null;

    const cacheAgeMs = marketCache?.ageSeconds ? marketCache.ageSeconds * 1000 : 0;
    const stale = marketCache?.state === 'STALE';

    // Find unresolved symbols
    const unresolved: string[] = [];

    const response: HealthResponse = {
      ok: true,
      lastFetchMs: Date.now(),
      cacheAgeMs,
      unresolved,
      stale,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        ok: false,
        lastFetchMs: 0,
        cacheAgeMs: 0,
        unresolved: [],
        stale: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
