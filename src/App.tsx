
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
import { useMarketData } from '@/hooks/useMarketData';
import { MAIN_INDICATORS } from '@/types';
import type { Indicator } from '@/types';

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

  // Get main indicators
  const mainIndicators: Indicator[] = MAIN_INDICATORS
    .map((ticker) => data.indicators[ticker])
    .filter((ind): ind is Indicator => ind !== undefined);

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            MARKET INSIGHTS DASHBOARD
          </h1>
          <div className="flex flex-col items-center gap-1 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <span>Last updated:</span>
              <span className="text-gray-300">{data.updatedAtNY}</span>
              {isStale && (
                <span className="text-yellow-500 text-xs">(cached)</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span>Current time:</span>
              <span className="text-gray-300">{data.currentTimeNY}</span>
            </div>
          </div>
          {data.warnings.length > 0 && (
            <div className="mt-2 text-center">
              <span className="text-xs text-yellow-500/70">
                {data.warnings.length} data warning(s)
              </span>
            </div>
          )}
        </header>

        {/* Score Pills Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Short Term */}
          <FrostedCard className="flex items-center justify-center py-6">
            <ScoreGauge
              score={data.scores.short}
              label="Short Term"
              size="md"
            />
          </FrostedCard>

          {/* Medium Term */}
          <FrostedCard className="flex items-center justify-center py-6">
            <ScoreGauge
              score={data.scores.medium}
              label="Medium Term"
              size="md"
            />
          </FrostedCard>

          {/* Long Term */}
          <FrostedCard className="flex items-center justify-center py-6">
            <ScoreGauge
              score={data.scores.long}
              label="Long Term"
              size="md"
            />
          </FrostedCard>

          {/* Status Card */}
          <StatusCard status={data.status} />
        </div>

        {/* Sector Chart and Status Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <SectorChart sectors={data.sectors} />
          </div>
          <div className="lg:col-span-1">
            <FrostedCard className="h-full">
              <h3 className="text-lg font-semibold text-white mb-4">
                CATEGORY BREAKDOWN
              </h3>
              <div className="space-y-3">
                {Object.entries(data.categoryScores).map(([name, { score, available }]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 capitalize">
                      {name.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: available ? `${score}%` : '0%',
                            backgroundColor: available
                              ? score > 60 ? '#22c55e' : score < 40 ? '#ef4444' : '#eab308'
                              : '#6b7280',
                          }}
                        />
                      </div>
                      <span className={`text-sm font-medium w-8 text-right ${
                        !available ? 'text-gray-500' :
                        score > 60 ? 'text-green-400' :
                        score < 40 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {available ? Math.round(score) : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </FrostedCard>
          </div>
        </div>

        {/* Main Indicators */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">KEY INDICATORS</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {mainIndicators.map((indicator) => (
              <IndicatorPill
                key={indicator.ticker}
                indicator={indicator}
                size="lg"
                showSource
              />
            ))}
          </div>
        </section>

        {/* View More Panel */}
        <ViewMorePanel indicators={data.indicators} />

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-gray-500">
          <p>
            Data sources: FRED (Federal Reserve Economic Data) & Alpha Vantage
          </p>
          <p className="mt-1">
            Market data is delayed. Not financial advice.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
