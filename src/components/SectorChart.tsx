
import { FrostedCard } from './FrostedCard';
import { getSectorBarColor } from '@/lib/colors';
import type { Sector } from '@/types';

interface SectorChartProps {
  sectors: Sector[];
  sortByScore?: boolean;
}

export function SectorChart({ sectors, sortByScore = false }: SectorChartProps) {
  // Sort sectors if requested
  const displaySectors = sortByScore
    ? [...sectors].sort((a, b) => b.score - a.score)
    : sectors;

  const maxScore = 100;

  return (
    <FrostedCard className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          SECTOR ATTRACTION
        </h3>
        <span className="text-xs text-gray-400">Score 0-100</span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-1 flex-grow min-h-[200px]">
        {displaySectors.map((sector) => {
          const barHeight = Math.max(5, (sector.score / maxScore) * 100);
          const barColor = getSectorBarColor(sector.score);

          return (
            <div
              key={sector.ticker}
              className="flex flex-col items-center flex-1 min-w-0"
            >
              {/* Score label */}
              <span className="text-xs font-semibold text-white mb-1">
                {sector.score}
              </span>

              {/* Bar */}
              <div className="w-full flex-1 flex flex-col justify-end">
                <div
                  className="w-full rounded-t transition-all duration-500 ease-out"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 0 10px ${barColor}40`,
                    minHeight: '4px',
                  }}
                />
              </div>

              {/* Ticker label */}
              <span className="text-xs text-gray-400 mt-2 truncate w-full text-center">
                {sector.ticker}
              </span>
              <span className="text-xs text-gray-500 truncate w-full text-center hidden lg:block">
                {sector.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-xs text-gray-400">High (70+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }} />
          <span className="text-xs text-gray-400">Mid (35-70)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-xs text-gray-400">Low (&lt;35)</span>
        </div>
      </div>
    </FrostedCard>
  );
}

export default SectorChart;
