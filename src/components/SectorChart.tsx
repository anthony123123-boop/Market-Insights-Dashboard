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
    ? [...sectors].sort((a, b) => b.score - a.score)
    : sectors;


  return (
    <FrostedCard className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
            Sector Attraction
          </h3>
          <InfoTooltip content={SECTOR_TOOLTIP} />
        </div>
        <span className="text-xs text-gray-500">0-100</span>
      </div>

      {/* Bar chart container - TALLER */}
      <div className="flex-1 flex items-end gap-2 min-h-[220px] pb-3">
        {displaySectors.map((sector) => {
          const score = typeof sector.score === 'number' && !isNaN(sector.score) ? sector.score : 50;

          // Calculate bar height - scale between 15% and 100% based on score
          // Score 0 = 15%, Score 100 = 100%
          const barHeightPercent = 15 + (score / 100) * 85;
          const barColor = getSectorBarColor(score);

          return (
            <div
              key={sector.ticker}
              className="flex-1 flex flex-col items-center min-w-0 h-full"
            >
              {/* Score label */}
              <span
                className="text-xs font-bold mb-1.5 transition-colors"
                style={{ color: barColor }}
              >
                {Math.round(score)}
              </span>

              {/* Bar container - takes remaining height */}
              <div className="flex-1 w-full flex flex-col justify-end px-0.5">
                <div
                  className="w-full rounded-t transition-all duration-700 ease-out"
                  style={{
                    height: `${barHeightPercent}%`,
                    background: `linear-gradient(to top, ${barColor}ee, ${barColor}88)`,
                    boxShadow: `0 0 15px ${barColor}60, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    minHeight: '20px',
                  }}
                />
              </div>

              {/* Ticker label */}
              <span className="text-[10px] text-gray-400 mt-2 font-medium">
                {sector.ticker}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e60' }} />
          <span className="text-[10px] text-gray-400">Bullish (70+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308', boxShadow: '0 0 8px #eab30860' }} />
          <span className="text-[10px] text-gray-400">Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef444460' }} />
          <span className="text-[10px] text-gray-400">Bearish (&lt;30)</span>
        </div>
      </div>
    </FrostedCard>
  );
}

export default SectorChart;
