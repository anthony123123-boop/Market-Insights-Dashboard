import { FrostedCard } from './FrostedCard';
import { InfoTooltip } from './InfoTooltip';
import { getSectorBarColor } from '@/lib/colors';
import type { Sector } from '@/types';

interface SectorChartProps {
  sectors: Sector[];
  sortByScore?: boolean;
}

const SECTOR_TOOLTIP = `Sector Attraction scores (0-100) measure relative sector strength based on:
• Daily price momentum vs previous close
• Higher score = more attractive for swing/long-term positions
• Score of 50 = neutral, >70 = bullish, <30 = bearish
• Sectors with strongest momentum score highest`;

export function SectorChart({ sectors, sortByScore = false }: SectorChartProps) {
  // Sort sectors if requested
  const displaySectors = sortByScore
    ? [...sectors].sort((a, b) => b.score - a.score)
    : sectors;

  return (
    <FrostedCard className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
            Sector Attraction
          </h3>
          <InfoTooltip content={SECTOR_TOOLTIP} />
        </div>
        <span className="text-xs text-gray-500">0-100</span>
      </div>

      {/* Bar chart container with fixed height */}
      <div className="flex-1 flex items-end gap-1.5 min-h-[180px] pb-2">
        {displaySectors.map((sector) => {
          // Ensure score is valid, default to 50 if not
          const score = typeof sector.score === 'number' && !isNaN(sector.score) ? sector.score : 50;
          const barHeightPercent = Math.max(8, (score / 100) * 100);
          const barColor = getSectorBarColor(score);

          return (
            <div
              key={sector.ticker}
              className="flex-1 flex flex-col items-center min-w-0 h-full"
            >
              {/* Score label */}
              <span
                className="text-xs font-bold mb-1 transition-colors"
                style={{ color: barColor }}
              >
                {Math.round(score)}
              </span>

              {/* Bar container - takes remaining height */}
              <div className="flex-1 w-full flex flex-col justify-end">
                <div
                  className="w-full rounded-t-sm transition-all duration-700 ease-out"
                  style={{
                    height: `${barHeightPercent}%`,
                    background: `linear-gradient(to top, ${barColor}, ${barColor}dd)`,
                    boxShadow: `0 0 12px ${barColor}50, inset 0 1px 0 rgba(255,255,255,0.1)`,
                    minHeight: '8px',
                  }}
                />
              </div>

              {/* Ticker label */}
              <span className="text-[10px] text-gray-400 mt-1.5 font-medium">
                {sector.ticker}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-[10px] text-gray-500">Bullish (70+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#eab308' }} />
          <span className="text-[10px] text-gray-500">Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-[10px] text-gray-500">Bearish (&lt;30)</span>
        </div>
      </div>
    </FrostedCard>
  );
}

export default SectorChart;
