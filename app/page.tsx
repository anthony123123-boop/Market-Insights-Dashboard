'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import {
  FrostedCard,
  ScoreGauge,
  IndicatorPill,
  StatusCard,
  SectorChart,
  ViewMorePanel,
  SettingsSidebar,
  Tooltip,
} from '@/components';
import type { MarketDataResponse, DashboardSettings } from '@/lib/types';
import { MAIN_INDICATORS } from '@/lib/types';
import { getScoreColor } from '@/lib/format';

const DEFAULT_SETTINGS: DashboardSettings = {
  density: 'comfortable',
  refreshInterval: 15,
  timeframes: {
    short: { min: 1, max: 5 },
    medium: { min: 10, max: 30 },
    long: { min: 60, max: 252 },
  },
  weightPreset: 'balanced',
  viewMoreCategories: {
    core: true,
    volTail: true,
    creditLiquidity: true,
    usdFx: true,
    ratesYield: true,
    commodities: true,
    sectors: true,
    breadth: true,
  },
};

export default function Dashboard() {
  const [data, setData] = useState<MarketDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        refreshInterval: settings.refreshInterval.toString(),
        weightPreset: settings.weightPreset,
        shortMin: settings.timeframes.short.min.toString(),
        shortMax: settings.timeframes.short.max.toString(),
        mediumMin: settings.timeframes.medium.min.toString(),
        mediumMax: settings.timeframes.medium.max.toString(),
        longMin: settings.timeframes.long.min.toString(),
        longMax: settings.timeframes.long.max.toString(),
      });

      const response = await fetch(`/api/market?${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();

    const intervalMs = settings.refreshInterval * 60 * 1000;
    const interval = setInterval(fetchData, intervalMs);

    return () => clearInterval(interval);
  }, [fetchData, settings.refreshInterval]);

  // DEBUG: Log sector scores when data changes (remove after verifying)
  useEffect(() => {
    if (data?.sectors) {
      console.log('SECTOR SCORES FROM API:', data.sectors);
    }
  }, [data?.sectors]);

  // Density classes
  const densityClasses = settings.density === 'compact' ? 'gap-3 p-3' : 'gap-4 p-4';
  const cardPadding = settings.density === 'compact' ? 'p-3' : 'p-4';

  return (
    <div className={`min-h-screen ${densityClasses}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              MARKET INSIGHTS DASHBOARD
            </h1>

            {/* Timestamps */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {data && (
                <>
                  <span className="px-3 py-1 text-xs bg-white/10 rounded-full text-gray-300">
                    Last Updated: {data.lastUpdatedET}
                  </span>
                  <span className="px-3 py-1 text-xs bg-white/10 rounded-full text-gray-300">
                    Pulled: {data.pulledAtET}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      data.cache.state === 'LIVE'
                        ? 'bg-green-500/20 text-green-400'
                        : data.cache.state === 'CACHED'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {data.cache.state} ({data.cache.ageSeconds}s)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && !data && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-gray-400">Loading market data...</span>
            </div>
          </div>
        )}

        {/* Dashboard content */}
        {data && (
          <>
            {/* Main Grid: Gauges + Sector Chart on left, Tall Sidebar on right */}
            {/* Desktop: 4 columns - 3 for content, 1 for sidebar spanning 2 rows */}
            {/* Mobile: single column stack */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              {/* LEFT CONTENT AREA (3 columns on desktop) */}
              <div className="lg:col-span-3 space-y-4">
                {/* Score Gauges Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Short Term */}
                  <FrostedCard className={`${cardPadding} ${getScoreColor(data.scores.short).glow}`}>
                    <div className="flex flex-col items-center">
                      <ScoreGauge
                        score={data.scores.short}
                        label="Short Term"
                        size={settings.density === 'compact' ? 'sm' : 'md'}
                      />
                      <Tooltip
                        content="Short-term outlook (1-5 trading days) based on momentum, volatility, and recent price action."
                        position="bottom"
                      />
                    </div>
                  </FrostedCard>

                  {/* Medium Term */}
                  <FrostedCard className={`${cardPadding} ${getScoreColor(data.scores.medium).glow}`}>
                    <div className="flex flex-col items-center">
                      <ScoreGauge
                        score={data.scores.medium}
                        label="Medium Term"
                        size={settings.density === 'compact' ? 'sm' : 'md'}
                      />
                      <Tooltip
                        content="Medium-term outlook (2-6 weeks) based on trend strength, credit conditions, and market breadth."
                        position="bottom"
                      />
                    </div>
                  </FrostedCard>

                  {/* Long Term */}
                  <FrostedCard className={`${cardPadding} ${getScoreColor(data.scores.long).glow}`}>
                    <div className="flex flex-col items-center">
                      <ScoreGauge
                        score={data.scores.long}
                        label="Long Term"
                        size={settings.density === 'compact' ? 'sm' : 'md'}
                      />
                      <Tooltip
                        content="Long-term outlook (3-12 months) based on trend quality, macro conditions, and structural factors."
                        position="bottom"
                      />
                    </div>
                  </FrostedCard>
                </div>

                {/* Sector Chart Row */}
                <div className="min-h-[280px]">
                  <SectorChart sectors={data.sectors} />
                </div>
              </div>

              {/* RIGHT SIDEBAR (1 column, spans both rows on desktop) */}
              {/* On mobile, this appears after the gauges and before indicators */}
              <div className="lg:col-span-1 lg:row-span-1 min-h-[400px] lg:min-h-0 order-first lg:order-none">
                <StatusCard status={data.status} scores={data.scores} />
              </div>
            </div>

            {/* Indicators Section */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">INDICATORS</h2>

              {/* Main 5 Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {MAIN_INDICATORS.map((ticker) => {
                  const indicator = data.indicators[ticker];
                  if (!indicator) return null;

                  return (
                    <IndicatorPill
                      key={ticker}
                      ticker={ticker}
                      indicator={indicator}
                      size={settings.density === 'compact' ? 'sm' : 'md'}
                    />
                  );
                })}
              </div>

              {/* View More */}
              <ViewMorePanel
                indicators={data.indicators}
                visibleCategories={settings.viewMoreCategories}
              />
            </section>

            {/* Warnings */}
            {data.warnings.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">Warnings</h3>
                <ul className="text-xs text-yellow-300 space-y-1">
                  {data.warnings.map((warning, i) => (
                    <li key={i}>
                      [{warning.code}] {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <footer className="text-center text-xs text-gray-500 pt-6 border-t border-white/10">
              <p>Not financial advice. Data provided for informational purposes only.</p>
            </footer>
          </>
        )}
      </div>

      {/* Settings Sidebar */}
      <SettingsSidebar
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}
