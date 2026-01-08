'use client';

import { FrostedCard } from './FrostedCard';
import { Tooltip } from './Tooltip';
import type { Status, Scores } from '@/lib/types';
import { getScoreColor } from '@/lib/format';

interface StatusCardProps {
  status: Status;
  scores: Scores;
}

/**
 * Tall sidebar card showing Risk Status + Analysis Details
 * Designed to span from gauges row down to sector chart row
 */
export function StatusCard({ status, scores }: StatusCardProps) {
  const avgScore = Math.round((scores.short + scores.medium + scores.long) / 3);
  const colors = getScoreColor(avgScore);

  return (
    <FrostedCard className={`h-full flex flex-col ${colors.glow}`}>
      {/* Risk Status Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <span className={`text-2xl font-bold ${colors.text}`}>{status.label}</span>
        <Tooltip
          content={
            <div className="space-y-1 text-sm">
              <div>Overall market stance based on multiple indicators</div>
              <div className="text-xs text-gray-400 mt-1">
                Avg Score: {avgScore}/100
              </div>
            </div>
          }
        />
      </div>

      {/* Plan summary */}
      <p className="text-sm text-gray-300 mb-4 flex-shrink-0 leading-relaxed">
        {status.plan}
      </p>

      {/* Divider */}
      <div className="border-t border-white/10 my-3 flex-shrink-0" />

      {/* Analysis Details - scrollable if too many bullets */}
      <div className="flex-grow overflow-hidden flex flex-col min-h-0">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex-shrink-0">
          Analysis Details
        </h4>
        <ul className="space-y-3 overflow-y-auto flex-grow pr-1">
          {status.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <span className={`mt-1 flex-shrink-0 ${colors.text}`}>•</span>
              <span className="leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </FrostedCard>
  );
}

/**
 * @deprecated Use StatusCard instead - it now includes analysis details
 */
export function StatusDetailsPanel({
  status,
  isVisible,
}: {
  status: Status;
  isVisible: boolean;
}) {
  // Keep for backwards compatibility but now just renders nothing
  // The StatusCard component handles all content
  return null;
}

export default StatusCard;
