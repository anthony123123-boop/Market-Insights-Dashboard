import { FrostedCard } from './FrostedCard';
import { InfoTooltip } from './InfoTooltip';
import { getSectorBarColor } from '@/lib/colors';
import type { Sector } from '@/types';

interface SectorChartProps {
  sectors: Sector[];
  sortByScore?: boolean;
}

const SECTOR_TOOLTIP = `Sector Attraction scores (0-100):
• Based on daily price momentum
• Score 50 = neutral (0% change)
• Score 70+ = bullish (green)
• Score <30 = bearish (red)
• Higher bars = stronger momentum`;

export function SectorChart({ sectors, sortByScore = false }: SectorChartProps) {
  // Sort sectors if requested
  const displaySectors = sortByScore
    ? [...sectors].sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))
    : sectors;

  // Max bar height in pixels
  const MAX_BAR_HEIGHT = 140;

  return (
    <FrostedCard className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Sector Attraction
          </h3>
          <InfoTooltip content={SECTOR_TOOLTIP} />
        </div>
        <span className="text-xs text-slate-500">0-100</span>
      </div>

      {/* Bar chart container - fixed height for consistent scaling */}
      <div className="flex items-end gap-2 pb-3" style={{ height: `${MAX_BAR_HEIGHT + 50}px` }}>
        {displaySectors.map((sector) => {
          const hasData = sector.available !== false;
          const score = typeof sector.score === 'number' && !isNaN(sector.score) ? sector.score : 50;

          // EXTREME height variance - piecewise function for dramatic differences
          // 0-40: tiny bars (5-15% of max)
          // 40-55: small bars (15-35% of max)
          // 55-70: medium-large bars (35-70% of max)
          // 70-85: large bars (70-90% of max)
          // 85-100: very large bars (90-100% of max)
          let heightPercent: number;
          if (score < 40) {
            heightPercent = 5 + (score / 40) * 10; // 5-15%
          } else if (score < 55) {
            heightPercent = 15 + ((score - 40) / 15) * 20; // 15-35%
          } else if (score < 70) {
            heightPercent = 35 + ((score - 55) / 15) * 35; // 35-70%
          } else if (score < 85) {
            heightPercent = 70 + ((score - 70) / 15) * 20; // 70-90%
          } else {
            heightPercent = 90 + ((score - 85) / 15) * 10; // 90-100%
          }
          const barHeightPx = hasData ? Math.max(8, Math.round((heightPercent / 100) * MAX_BAR_HEIGHT)) : 10;
          const barColor = hasData ? getSectorBarColor(score) : '#475569';

          return (
            <div
              key={sector.ticker}
              className="flex-1 flex flex-col items-center justify-end min-w-0"
            >
              {/* Score label */}
              <span
                className="text-xs font-bold mb-1.5 transition-colors"
                style={{ color: barColor }}
              >
                {hasData ? Math.round(score) : 'N/A'}
              </span>

              {/* Bar with explicit pixel height */}
              <div
                className="w-full rounded-t transition-all duration-700 ease-out"
                style={{
                  height: `${barHeightPx}px`,
                  background: `linear-gradient(to top, ${barColor}ee, ${barColor}88)`,
                  boxShadow: `0 0 15px ${barColor}60, inset 0 1px 0 rgba(255,255,255,0.2)`,
                }}
              />

              {/* Ticker label */}
              <span className="text-[10px] text-slate-400 mt-2 font-medium">
                {sector.ticker}
              </span>
              {!hasData && (
                <span className="text-[9px] text-slate-500 mt-1">N/A</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2fd173', boxShadow: '0 0 8px #2fd17370' }} />
          <span className="text-[10px] text-slate-400">Bullish (70+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#c7a468', boxShadow: '0 0 8px #c7a46860' }} />
          <span className="text-[10px] text-slate-400">Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#d06a6a', boxShadow: '0 0 8px #d06a6a60' }} />
          <span className="text-[10px] text-slate-400">Bearish (&lt;30)</span>
        </div>
      </div>
    </FrostedCard>
  );
}

export default SectorChart;
