# Market Insights Dashboard

A real-time market analysis dashboard that provides short, medium, and long-term market outlook scores based on multiple indicators including volatility, credit conditions, and market breadth.

![Dashboard Preview](./public/wireframe.png)

## Features

- **Real-time Market Data**: Fetches live data from Yahoo Finance with Alpha Vantage fallback
- **Multi-timeframe Analysis**: Short-term (1-5 days), Medium-term (2-6 weeks), Long-term (3-12 months)
- **Sector Analysis**: Sector ETF attraction scores with visual bar chart
- **Comprehensive Indicators**: VIX, credit spreads, yield curves, FX, and more
- **Configurable Settings**: Adjust refresh intervals, weight presets, and display options
- **Dark Theme**: Beautiful frosted glass UI with score-based color coding
- **Mobile Responsive**: Works seamlessly on phone and desktop

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Data Validation**: Zod
- **Data Sources**: Yahoo Finance (primary), Alpha Vantage (fallback)

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Alpha Vantage API key (optional, for FX fallback)

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

Edit `.env.local` and add your Alpha Vantage API key (optional):

```
ALPHAVANTAGE_API_KEY=your_key_here
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
   - `ALPHAVANTAGE_API_KEY` (optional)
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
   - **Environment Variables**: Add `ALPHAVANTAGE_API_KEY` (optional)
6. Click "Create Web Service"

Alternatively, use the included `render.yaml` blueprint:

1. Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
2. Click "New Blueprint Instance"
3. Connect your repository
4. Render will auto-detect the `render.yaml` configuration

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

## Indicator Categories

| Category | Indicators |
|----------|-----------|
| Core | SPY, QQQ, IWM, RSP |
| Vol/Tail | VIX, VVIX, VIX9D, VIX3M, SKEW, MOVE |
| Credit | HYG, LQD, HYG/LQD ratio, TLT, SHY |
| USD/FX | DXY, UUP, FXY, EUR/USD |
| Rates | TNX (10Y), IRX (3M), FVX (5Y), 10Y-2Y spread |
| Commodities | GLD, SLV, USO, DBA |
| Sectors | XLK, XLF, XLI, XLE, XLV, XLP, XLU, XLRE, XLY, XLC |
| Breadth | RSP/SPY, IWM/SPY ratios |

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

- All price changes are computed client-side from price and previousClose
- Derived ratios (VIX/VVIX, HYG/LQD) compute proper previous values
- Timestamps are displayed in America/New_York timezone (ET)
- Cache state shown: LIVE (fresh) / CACHED (valid) / STALE (expired)

## Disclaimer

**Not financial advice.** This dashboard is for informational purposes only. Data is provided as-is from third-party sources. Always do your own research before making investment decisions.

## License

MIT
