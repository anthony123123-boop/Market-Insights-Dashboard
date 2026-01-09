import {
  FrostedCard,
  ScoreGauge,
  StatusCard,
  SectorChart,
  IndicatorPill,
  ViewMorePanel,
  LoadingState,
  ErrorState,
} from '@/components';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useMarketData } from '@/hooks/useMarketData';
import { MAIN_INDICATORS } from '@/types';
import type { Indicator } from '@/types';

// Tooltip content for score gauges
const SCORE_TOOLTIPS = {
  short: `SHORT-TERM OUTLOOK (1-5 days)
Score based on:
• Daily price momentum (SPY, QQQ, IWM)
• VIX volatility levels
• Intraday breadth signals
Higher = more favorable for short-term swing trades`,

  medium: `MEDIUM-TERM OUTLOOK (1-4 weeks)
Score based on:
• Trend strength across indices
• Credit market conditions (HYG, LQD)
• Interest rate environment
• USD strength/weakness
Higher = more favorable for swing positions`,

  long: `LONG-TERM OUTLOOK (1-6 months)
Score based on:
• Macro trend direction
• Credit spreads and liquidity
• Yield curve shape
• Broad market breadth
Higher = more favorable for long-term holds`,
};

const KEY_INDICATORS_TOOLTIP = `Key market indicators showing:
• Price and daily change
• Data from FRED (macro) and Alpha Vantage (ETFs)
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

  // Get main indicators - filter to only show ones with data
  const mainIndicators: Indicator[] = MAIN_INDICATORS
    .map((ticker) => data.indicators[ticker])
    .filter((ind): ind is Indicator => ind !== undefined && ind.price !== undefined);

  // Add more indicators if main ones are missing
  const additionalTickers = ['SPY', 'QQQ', 'IWM', 'TLT', 'HYG', 'GLD', 'VIX', 'UUP'];
  const displayIndicators = mainIndicators.length >= 5
    ? mainIndicators
    : additionalTickers
        .map(t => data.indicators[t])
        .filter((ind): ind is Indicator => ind !== undefined && ind.price !== undefined)
        .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/20 via-transparent to-purple-950/20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            MARKET INSIGHTS DASHBOARD
          </h1>
          <div className="flex flex-col items-center gap-0.5 text-xs">
            <div className="flex items-center gap-2 text-gray-500">
              <span>Last updated:</span>
              <span className="text-gray-400">{data.updatedAtNY}</span>
              {isStale && (
                <span className="text-amber-500/80 text-[10px]">(cached)</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span>Current time:</span>
              <span className="text-gray-400">{data.currentTimeNY}</span>
            </div>
          </div>
          {data.warnings.length > 0 && (
            <div className="mt-1.5 text-center">
              <span className="text-[10px] text-amber-500/60">
                {data.warnings.length} data source(s) unavailable
              </span>
            </div>
          )}
        </header>

        {/* Score Pills Row - 3 scores + regime in one row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Short Term */}
          <FrostedCard className="flex items-center justify-center py-4">
            <ScoreGauge
              score={data.scores.short}
              label="Short Term"
              size="md"
              tooltip={SCORE_TOOLTIPS.short}
            />
          </FrostedCard>

          {/* Medium Term */}
          <FrostedCard className="flex items-center justify-center py-4">
            <ScoreGauge
              score={data.scores.medium}
              label="Medium Term"
              size="md"
              tooltip={SCORE_TOOLTIPS.medium}
            />
          </FrostedCard>

          {/* Long Term */}
          <FrostedCard className="flex items-center justify-center py-4">
            <ScoreGauge
              score={data.scores.long}
              label="Long Term"
              size="md"
              tooltip={SCORE_TOOLTIPS.long}
            />
          </FrostedCard>

          {/* Status Card - same height as score pills in this row */}
          <StatusCard status={data.status} />
        </div>

        {/* Sector Chart - Full width, aligned with scores above */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Sector Chart spans 3 columns */}
          <div className="col-span-3">
            <SectorChart sectors={data.sectors} />
          </div>

          {/* Extended Regime Details */}
          <FrostedCard className="h-full flex flex-col">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
              Macro Conditions
            </div>
            <div className="flex-1 space-y-2 text-xs">
              {data.categoryScores['volTail']?.available && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Volatility</span>
                  <span className={data.categoryScores['volTail'].score > 60 ? 'text-green-400' : data.categoryScores['volTail'].score < 40 ? 'text-red-400' : 'text-yellow-400'}>
                    {Math.round(data.categoryScores['volTail'].score)}/100
                  </span>
                </div>
              )}
              {data.categoryScores['creditLiquidity']?.available && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Credit</span>
                  <span className={data.categoryScores['creditLiquidity'].score > 60 ? 'text-green-400' : data.categoryScores['creditLiquidity'].score < 40 ? 'text-red-400' : 'text-yellow-400'}>
                    {Math.round(data.categoryScores['creditLiquidity'].score)}/100
                  </span>
                </div>
              )}
              {data.categoryScores['rates']?.available && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Rates</span>
                  <span className={data.categoryScores['rates'].score > 60 ? 'text-green-400' : data.categoryScores['rates'].score < 40 ? 'text-red-400' : 'text-yellow-400'}>
                    {Math.round(data.categoryScores['rates'].score)}/100
                  </span>
                </div>
              )}
              {data.categoryScores['trend']?.available && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Trend</span>
                  <span className={data.categoryScores['trend'].score > 60 ? 'text-green-400' : data.categoryScores['trend'].score < 40 ? 'text-red-400' : 'text-yellow-400'}>
                    {Math.round(data.categoryScores['trend'].score)}/100
                  </span>
                </div>
              )}
              {data.categoryScores['breadth']?.available && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Breadth</span>
                  <span className={data.categoryScores['breadth'].score > 60 ? 'text-green-400' : data.categoryScores['breadth'].score < 40 ? 'text-red-400' : 'text-yellow-400'}>
                    {Math.round(data.categoryScores['breadth'].score)}/100
                  </span>
                </div>
              )}
            </div>
          </FrostedCard>
        </div>

        {/* Key Indicators */}
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Key Indicators
            </h2>
            <InfoTooltip content={KEY_INDICATORS_TOOLTIP} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {displayIndicators.map((indicator) => (
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

        {/* Footer */}
        <footer className="mt-6 pt-4 border-t border-white/5 text-center text-[10px] text-gray-600">
          <p>Data: FRED (Federal Reserve) & Alpha Vantage • Market data delayed • Not financial advice</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
