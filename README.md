# Market Insights Dashboard

A PC-first web dashboard that automatically pulls and analyzes market indicators, providing real-time market regime analysis and scoring.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Market+Insights+Dashboard)

## Features

- **Real-time Market Scores**: Short-term, Medium-term, and Long-term market health scores (0-100)
- **Market Regime Classification**: Automatic classification (RISK-ON, NEUTRAL, RISK-OFF, CHOPPY)
- **Sector Attraction Chart**: Visual comparison of 10 major sector ETFs
- **Comprehensive Indicators**: 30+ indicators from FRED and Alpha Vantage
- **Smart Caching**: Server-side and client-side caching for fast loads
- **Dark Theme**: Modern frosted-glass UI design

## Data Sources

This dashboard uses **only free APIs**:

1. **FRED** (Federal Reserve Economic Data) - Primary source for macro data
   - Equity indices, Treasury yields, credit spreads, macro indicators
   - 120 requests/minute rate limit

2. **Alpha Vantage** - Sector performance feed
   - Sector performance (single call)
   - Free tier rate limits (handled with caching)

## Quick Start

### Prerequisites

- Node.js 18+
- FRED API Key (free): [Get one here](https://fred.stlouisfed.org/docs/api/api_key.html)
- Alpha Vantage API Key (free): [Get one here](https://www.alphavantage.co/support/#api-key)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/UPDATED-MARKET-DASHBOARD.git
   cd UPDATED-MARKET-DASHBOARD
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Add your API keys to `.env`:
   ```
   FRED_API_KEY=your_fred_api_key_here
   ALPHAVANTAGE_API_KEY=your_alphavantage_api_key_here
   ```

5. Run the UI locally:
   ```bash
   npm run dev
   ```

6. (Optional) Run the full stack with Netlify Functions:
   ```bash
   npx netlify dev
   ```

7. Open http://localhost:8888 in your browser

### Production Build

```bash
npm run build
```

## Deploying to Netlify

### One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

### Manual Deploy

1. Push this repository to GitHub

2. Go to [Netlify](https://app.netlify.com) and create a new site

3. Connect your GitHub repository

4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

5. Add environment variables in Netlify:
   - `FRED_API_KEY` - Your FRED API key
   - `ALPHAVANTAGE_API_KEY` - Your Alpha Vantage API key

6. Deploy!

## Project Structure

```
├── index.html              # Main HTML entry
├── netlify.toml            # Netlify configuration
├── netlify/
│   └── functions/
│       └── market.ts       # API aggregator function
├── src/
│   ├── App.tsx             # Main React component
│   ├── main.tsx            # React entry point
│   ├── index.css           # Global styles (Tailwind)
│   ├── components/         # UI components
│   │   ├── FrostedCard.tsx
│   │   ├── ScoreGauge.tsx
│   │   ├── StatusCard.tsx
│   │   ├── SectorChart.tsx
│   │   ├── IndicatorPill.tsx
│   │   └── ViewMorePanel.tsx
│   ├── hooks/
│   │   └── useMarketData.ts  # Data fetching hook
│   ├── lib/                # Utility functions
│   │   ├── colors.ts
│   │   ├── format.ts
│   │   └── time.ts
│   └── types/
│       └── index.ts        # TypeScript types
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Scoring Algorithm

### Category Scores

The dashboard calculates scores for these categories:

| Category | Weight | Data Sources |
|----------|--------|--------------|
| Trend | 25% | S&P 500, Nasdaq, Dow, Russell 2000 momentum |
| Volatility/Tail Risk | 20% | VIX level |
| Credit/Liquidity | 20% | HY OAS, TED spread |
| Rates | 15% | 10Y yield, yield curve |
| USD/FX | 10% | Trade-weighted dollar index |
| Breadth | 10% | Small/large ratio |

### Time Horizon Scores

- **Short-term**: Weighted toward volatility and daily momentum
- **Medium-term**: Balanced blend of all categories
- **Long-term**: Weighted toward trend and credit conditions

### Regime Classification

| Regime | Condition |
|--------|-----------|
| RISK-ON | Average score ≥65 AND Short ≥55 |
| RISK-OFF | Average score ≤35 OR credit stressed |
| CHOPPY | Short vs Long differ by >20 |
| NEUTRAL | All other cases |

## Sector Attraction

Each sector score (0-100) is based on:
- Daily price change vs previous close
- Formula: `score = clamp(50 + changePct * 16.67, 0, 100)`
- Example: +1% change = score of ~67

## Caching Strategy

### Server-side (Netlify Function)
- In-memory cache: 1 hour TTL
- HTTP cache headers: `Cache-Control: public, max-age=3600, s-maxage=3600`
- Graceful fallback to stale cache on API errors

### Client-side (Browser)
- LocalStorage cache: 2 hour max age
- Instant load from cache, then refresh in background
- Fallback to cache when offline

## Rate Limit Protection

The dashboard is designed to minimize API calls:

1. **FRED First**: Uses FRED for all macro data (high rate limits)
2. **Single Alpha Vantage Call**: Sector performance uses one request per refresh
3. **Caching**: 1-hour cache prevents repeated calls

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Netlify Functions
- **Data**: FRED API, Alpha Vantage API

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FRED_API_KEY` | Yes | FRED API key for economic data |
| `ALPHAVANTAGE_API_KEY` | Yes | Alpha Vantage API key for sector performance |

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Disclaimer

This dashboard is for informational purposes only. Not financial advice. Market data may be delayed. Always do your own research before making investment decisions.
