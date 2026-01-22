import {
  FrostedCard,
  ScoreGauge,
  StatusCard,
  SectorChart,
  IndicatorPill,
  ViewMorePanel,
  LoadingState,
  ErrorState,
  InfoPanel,
} from '@/components';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useMarketData } from '@/hooks/useMarketData';
import { MAIN_INDICATORS, INDICATOR_NAMES } from '@/types';
import type { Indicator } from '@/types';

// Tooltip content for score gauges
const SCORE_TOOLTIPS = {
  short: `SHORT-TERM OUTLOOK (1-5 days)
Score based on:
• Daily price momentum (S&P 500, Nasdaq, Russell 2000)
• VIX volatility levels
• Small/large cap breadth proxy
Higher = more favorable for short-term swing trades`,

  medium: `MEDIUM-TERM OUTLOOK (1-4 weeks)
Score based on:
• Trend strength across indices
• Credit spreads and TED spread
• Yield curve and 10Y rate moves
• USD strength/weakness
Higher = more favorable for swing positions`,

  long: `LONG-TERM OUTLOOK (1-6 months)
Score based on:
• Macro trend direction
• Credit spreads and liquidity
• Yield curve shape
• Broad market breadth proxy
Higher = more favorable for long-term holds`,
};

const KEY_INDICATORS_TOOLTIP = `Key market indicators showing:
• Price and daily change
• Data from FRED and Alpha Vantage
• Updates hourly with server-side caching`;

function App() {
  const { data, loading, error, isStale, refetch } = useMarketData();

  if (loading) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!data) {
    return <ErrorState error="No data available" onRetry={refetch} />;
  }

  // Get main indicators with friendly names
  const getIndicatorWithName = (ticker: string): Indicator | null => {
    const ind = data.indicators[ticker];
    if (!ind || ind.price === undefined) return null;
    return {
      ...ind,
      displayName: INDICATOR_NAMES[ticker] || ind.displayName || ticker,
    };
  };

  // Build display indicators from MAIN_INDICATORS
  const displayIndicators: Indicator[] = MAIN_INDICATORS
    .map(ticker => getIndicatorWithName(ticker))
    .filter((ind): ind is Indicator => ind !== null);

  // If we don't have enough, try to get more from available data
  if (displayIndicators.length < 5) {
    const additionalTickers = Object.keys(data.indicators)
      .filter(t => !MAIN_INDICATORS.includes(t as typeof MAIN_INDICATORS[number]))
      .filter(t => !t.includes('_')); // Skip ratio indicators for main display

    for (const ticker of additionalTickers) {
      if (displayIndicators.length >= 9) break;
      const ind = getIndicatorWithName(ticker);
      if (ind) displayIndicators.push(ind);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-neutral-950/70 via-neutral-900/35 to-emerald-950/15 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              MARKET INSIGHTS DASHBOARD
            </h1>
            <div className="flex flex-col gap-2 text-sm text-gray-300">
              <div className="grid grid-cols-1 gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Last updated:</span>
                  <span className="text-gray-100">{data.updatedAtNY}</span>
                  {isStale && (
                    <span className="text-amber-400/80 text-[10px]">(cached)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Current time:</span>
                  <span className="text-gray-100">{data.currentTimeNY}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={refetch}
                  className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-300 transition hover:border-emerald-500/40 hover:text-white"
                  aria-label="Refresh data"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 12.98-4.95m1.02-2.55v5.25h-5.25" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12a7.5 7.5 0 0 1-12.98 4.95m-1.02 2.55v-5.25h5.25" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-300 transition hover:border-emerald-500/40 hover:text-white"
                  aria-label="Settings"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 3.3c.38-.8 1.78-.8 2.16 0l.2.43c.3.62 1 .95 1.67.78l.46-.11c.86-.2 1.6.67 1.24 1.47l-.19.43c-.27.63-.02 1.37.56 1.72l.4.24c.75.45.75 1.55 0 2l-.4.24c-.58.35-.83 1.09-.56 1.72l.19.43c.36.8-.38 1.67-1.24 1.47l-.46-.11c-.67-.17-1.37.16-1.67.78l-.2.43c-.38.8-1.78.8-2.16 0l-.2-.43c-.3-.62-1-.95-1.67-.78l-.46.11c-.86.2-1.6-.67-1.24-1.47l.19-.43c.27-.63.02-1.37-.56-1.72l-.4-.24c-.75-.45-.75-1.55 0-2l.4-.24c.58-.35.83-1.09.56-1.72l-.19-.43c-.36-.8.38-1.67 1.24-1.47l.46.11c.67.17 1.37-.16 1.67-.78l.2-.43z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {data.warnings.length > 0 && (
            <div className="mt-2 text-center">
              <span className="text-xs text-amber-500/70" title={data.warnings.join(', ')}>
                {data.warnings.length} data source(s) unavailable: {data.warnings.slice(0, 4).join(', ')}
                {data.warnings.length > 4 && '...'}
              </span>
            </div>
          )}
        </header>

        {/* Main Grid - 4 columns with regime spanning 2 rows */}
        <div className="grid grid-cols-4 gap-4 mb-6" style={{ gridTemplateRows: '180px auto' }}>
          {/* Short Term - Row 1, Col 1 */}
          <FrostedCard className="flex items-center justify-center py-1">
            <ScoreGauge
              score={data.scores.short}
              label="Short Term"
              tooltip={SCORE_TOOLTIPS.short}
            />
          </FrostedCard>

          {/* Medium Term - Row 1, Col 2 */}
          <FrostedCard className="flex items-center justify-center py-1">
            <ScoreGauge
              score={data.scores.medium}
              label="Medium Term"
              tooltip={SCORE_TOOLTIPS.medium}
            />
          </FrostedCard>

          {/* Long Term - Row 1, Col 3 */}
          <FrostedCard className="flex items-center justify-center py-1">
            <ScoreGauge
              score={data.scores.long}
              label="Long Term"
              tooltip={SCORE_TOOLTIPS.long}
            />
          </FrostedCard>

          {/* Status Card - Row 1-2, Col 4 (spans 2 rows) */}
          <div className="row-span-2">
            <StatusCard status={data.status} />
          </div>

          {/* Sector Chart - Row 2, Cols 1-3 */}
          <div className="col-span-3">
            <SectorChart sectors={data.sectors} />
          </div>
        </div>

        {/* Key Indicators - Full width, larger pods */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Key Indicators
            </h2>
            <InfoTooltip content={KEY_INDICATORS_TOOLTIP} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayIndicators.slice(0, 6).map((indicator) => (
              <IndicatorPill
                key={indicator.ticker}
                indicator={indicator}
                size="md"
                showSource
              />
            ))}
          </div>
        </section>

        {/* View More Panel */}
        <ViewMorePanel indicators={data.indicators} />

        <InfoPanel updatedAtNY={data.updatedAtNY} />

        {/* Footer */}
        <footer className="mt-6 pt-4 border-t border-white/5 text-center text-[10px] text-gray-600">
          <p>Data: FRED • Alpha Vantage • Market data delayed • Not financial advice</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
