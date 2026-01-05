import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Debug endpoint that lists all available API routes
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    routes: [
      {
        path: '/api/market',
        method: 'GET',
        description: 'Main market data endpoint - returns indicators, scores, sectors',
      },
      {
        path: '/api/health',
        method: 'GET',
        description: 'Health check endpoint',
      },
      {
        path: '/api/debug/routes',
        method: 'GET',
        description: 'This endpoint - lists all routes',
      },
      {
        path: '/api/debug/av',
        method: 'GET',
        params: ['symbol (optional, e.g., SPY or SPY,QQQ)'],
        description: 'Debug Alpha Vantage - tests symbol fetch and returns raw response',
      },
      {
        path: '/api/debug/stooq',
        method: 'GET',
        params: ['symbol (optional, e.g., VIX or VIX,VVIX)'],
        description: 'Debug Stooq - tests VIX fetch and returns raw CSV',
      },
    ],
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
