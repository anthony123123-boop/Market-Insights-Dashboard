# Market Insights Dashboard

A **swing/long-term** market analysis dashboard that provides short, medium, and long-term market outlook scores based on multiple indicators including volatility, credit conditions, and market breadth.

![Dashboard Preview](./public/wireframe.png)

## Features

- **Hourly Refresh (60-minute cache)**: Optimized for swing/long-term analysis, not day trading
- **Multi-timeframe Analysis**: Short-term (1-5 days), Medium-term (2-6 weeks), Long-term (3-12 months)
- **Sector Analysis**: Sector ETF attraction scores with visual bar chart
- **Comprehensive Indicators**: VIX, credit spreads, yield curves, FX, and more
- **Robust Caching**: Last-known-good fallback ensures stability when providers fail
- **Dark Theme**: Beautiful frosted glass UI with score-based color coding
- **Mobile Responsive**: Works seamlessly on phone and desktop
- **Source Attribution**: Each indicator shows its data source

## Why Hourly Refresh?

This dashboard is designed for **swing traders and long-term investors**, not day traders:

1. **Stability over speed**: A 60-minute cache ensures the dashboard shows consistent data even when providers have temporary issues
2. **Last-known-good fallback**: If a provider fails, the dashboard shows the last successful data instead of N/A
3. **Rate limit friendly**: Hourly refresh stays well within free tier limits of all data providers
4. **Meaningful for swing trading**: Hourly data is sufficient for decisions on 1-day to 12-month timeframes

For day trading or real-time data, consider a paid data provider with lower latency.

## Data Sources

| Source | Data | API Key | Rate Limit |
|--------|------|---------|------------|
| **Stooq** | ETFs, US Equities (PRIMARY) | Not required | No limit |
| **FRED** | VIX (VIXCLS), Treasury Yields (PRIMARY) | Required | 120/minute |
| **Alpha Vantage** | FX pairs (FALLBACK only) | Optional | 25/day (free) |

All sources are:
- Free tier available
- Netlify/Vercel/serverless compatible
- Rate-limit resistant via 60-minute caching
- Have last-known-good fallback on failure

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Data Validation**: Zod

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- API Keys:
  - Alpha Vantage (free): https://www.alphavantage.co/support/#api-key
  - FRED (free): https://fred.stlouisfed.org/docs/api/api_key.html

## Local Development

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd market-insights-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

```
ALPHAVANTAGE_API_KEY=your_alpha_vantage_key
FRED_API_KEY=your_fred_key
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. QA Layout Verification

Visit [http://localhost:3000/qa/layout](http://localhost:3000/qa/layout) to compare the dashboard against the wireframe overlay.

## Running Tests

### Unit Tests

```bash
npm test
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run tests
npm run test:e2e
```

### All Tests

```bash
npm run test:all
```

## Building for Production

```bash
npm run build
npm start
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your repository
4. Add environment variables:
   - `ALPHAVANTAGE_API_KEY` (required)
   - `FRED_API_KEY` (required for yields)
5. Click "Deploy"
6. Your dashboard will be live at `your-project.vercel.app`

### Deploy to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign in
3. Click "New" → "Web Service"
4. Connect your repository
5. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add `ALPHAVANTAGE_API_KEY` and `FRED_API_KEY`
6. Click "Create Web Service"

### Deploy to Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and sign in
3. Click "Add new site" → "Import an existing project"
4. Connect your repository
5. Configure:
   - **Build Command**: `npm run build`
   - **Publish directory**: `.next`
6. Add environment variables in Site settings → Environment variables
7. Deploy!

## API Endpoints

### GET /api/market

Returns market data, scores, and analysis.

Query Parameters:
- `refreshInterval` (number): Cache TTL in minutes (10/12/15/20/30)
- `weightPreset` (string): Scoring weight preset (balanced/risk-off-sensitive/trend-following)
- `shortMin`, `shortMax` (number): Short-term timeframe bounds
- `mediumMin`, `mediumMax` (number): Medium-term timeframe bounds
- `longMin`, `longMax` (number): Long-term timeframe bounds

### GET /api/health

Returns system health status and cache information.

## Indicator Categories & Sources

| Category | Indicators | Source |
|----------|-----------|--------|
| Core | SPY, QQQ, IWM, RSP | Stooq |
| Volatility | VIX | FRED (VIXCLS) |
| Vol/Tail (optional) | VVIX, VIX9D, VIX3M, SKEW, MOVE | Stooq (may be unavailable) |
| Credit | HYG, LQD, HYG/LQD ratio, TLT, SHY | Stooq |
| USD/FX | DXY (UUP proxy), UUP, FXY | Stooq |
| Rates | TNX (10Y), IRX (3M), FVX (5Y), DGS2 (2Y), 10Y-2Y spread | FRED |
| Commodities | GLD, SLV, USO, DBA | Stooq |
| Sectors | XLK, XLF, XLI, XLE, XLV, XLP, XLU, XLRE, XLY, XLC | Stooq |
| Breadth | RSP/SPY, IWM/SPY ratios | Derived |

**Note**: VVIX, VIX9D, VIX3M, SKEW, and MOVE are optional indicators. If they're unavailable, the dashboard still provides meaningful scores using the core indicators.

## Scoring System

### Score Ranges

| Range | Status |
|-------|--------|
| 0-25 | RISK-OFF |
| 26-45 | DEFENSIVE |
| 46-60 | NEUTRAL |
| 61-80 | RISK-ON |
| 81-100 | STRONGLY BULLISH |

### Weight Presets

- **Balanced**: Equal weight across all categories
- **Risk-Off Sensitive**: Emphasizes volatility and credit conditions
- **Trend-Following**: Emphasizes momentum and trend indicators

## Configuration

Settings are accessible via the gear icon in the top-right corner:

- **Density**: Comfortable (spacious) or Compact (condensed)
- **Refresh Interval**: 10/12/15/20/30 minutes
- **Weight Preset**: Scoring methodology
- **Timeframes**: Customize day ranges for each horizon
- **View More Categories**: Toggle which indicator categories display

## Data Accuracy

- All price changes are computed from price and previousClose (never trust provider change values)
- Derived ratios (VIX/VVIX, HYG/LQD) compute proper previous values for accurate change calculation
- Timestamps are displayed in America/New_York timezone (ET)
- Cache state shown: LIVE (fresh) / CACHED (valid) / STALE (expired)
- Source attribution shown for each indicator (e.g., "SPY (AV)", "VIX (Stooq)")

## Rate Limiting & Caching

- **60-minute TTL cache**: Optimized for swing/long-term analysis
- **Last-known-good fallback**: On fetch failure, uses previous successful data
- **Single-flight deduplication**: Concurrent requests share same fetch
- **Graceful degradation**: Optional indicators (VVIX, MOVE, etc.) don't break scoring if unavailable
- **Stale data flag**: API response indicates when data is from cache after a failed refresh

## Disclaimer

**Not financial advice.** This dashboard is for informational purposes only. Data is provided as-is from third-party sources. Always do your own research before making investment decisions.

## License

MIT
