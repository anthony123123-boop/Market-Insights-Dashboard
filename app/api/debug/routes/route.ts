import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint: List all available API routes
 * GET /api/debug/routes
 */
export async function GET() {
  const routes = [
    {
      path: '/api/market',
      method: 'GET',
      description: 'Main market data endpoint - returns indicators, scores, and analysis',
      params: ['refreshInterval', 'weightPreset', 'shortMin', 'shortMax', 'mediumMin', 'mediumMax', 'longMin', 'longMax'],
    },
    {
      path: '/api/health',
      method: 'GET',
      description: 'System health check - returns cache stats and data source status',
    },
    {
      path: '/api/debug/routes',
      method: 'GET',
      description: 'This endpoint - lists all available routes',
    },
    {
      path: '/api/debug/provider',
      method: 'GET',
      description: 'Debug specific symbol fetch from provider',
      params: ['symbol'],
      example: '/api/debug/provider?symbol=SPY',
    },
  ];

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    routeCount: routes.length,
    routes,
  });
}
