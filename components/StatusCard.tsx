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
 * Combined Risk Status + Analysis Details card
 * Shows risk label, plan summary, and analysis bullets in one card
 */
export function StatusCard({ status, scores }: StatusCardProps) {
  const avgScore = Math.round((scores.short + scores.medium + scores.long) / 3);
  const colors = getScoreColor(avgScore);

  return (
    <FrostedCard className={`h-full flex flex-col ${colors.glow}`}>
      {/* Risk Status Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span className={`text-2xl font-bold ${colors.text}`}>{status.label}</span>
        <Tooltip
          content={
            <div className="space-y-1 text-sm">
              <div>Overall market stance based on multiple indicators</div>
            </div>
          }
        />
      </div>

      {/* Plan summary */}
      <p className="text-sm text-gray-300 mb-3 flex-shrink-0">{status.plan}</p>

      {/* Divider */}
      <div className="border-t border-white/10 my-2 flex-shrink-0" />

      {/* Analysis Details */}
      <div className="flex-grow overflow-hidden flex flex-col min-h-0">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex-shrink-0">
          Analysis Details
        </h4>
        <ul className="space-y-2 overflow-y-auto flex-grow">
          {status.bullets.slice(0, 6).map((bullet, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-gray-300">
              <span className={`mt-0.5 flex-shrink-0 ${colors.text}`}>•</span>
              <span className="line-clamp-2">{bullet}</span>
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
