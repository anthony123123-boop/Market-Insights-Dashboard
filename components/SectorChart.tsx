'use client';

import { FrostedCard } from './FrostedCard';
import { Tooltip } from './Tooltip';
import type { Sector } from '@/lib/types';
import { getSectorBarColor } from '@/lib/format';

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
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          SECTOR ATTRACTION
          <Tooltip
            content={
              <div className="space-y-2 text-sm">
                <div>Sector scores based on:</div>
                <ul className="list-disc list-inside text-xs text-gray-300">
                  <li>Relative strength vs S&P 500</li>
                  <li>Daily momentum</li>
                  <li>Trend quality</li>
                </ul>
                <div className="text-xs text-gray-400 mt-2">
                  Higher score = more attractive
                </div>
              </div>
            }
          />
        </h3>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-2 flex-grow min-h-[180px]">
        {displaySectors.map((sector) => {
          const barHeight = (sector.score / maxScore) * 100;
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
              <span className="text-xs text-gray-500 truncate w-full text-center hidden sm:block">
                {sector.name || sector.ticker}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/10 flex-shrink-0">
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
