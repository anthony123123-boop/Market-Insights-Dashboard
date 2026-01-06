'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FrostedCard } from './FrostedCard';
import { Tooltip } from './Tooltip';
import type { Status, Scores } from '@/lib/types';
import { getScoreColor } from '@/lib/format';

interface StatusCardProps {
  status: Status;
  scores: Scores;
  onExpandChange?: (expanded: boolean) => void;
}

export function StatusCard({ status, scores, onExpandChange }: StatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const avgScore = Math.round((scores.short + scores.medium + scores.long) / 3);
  const colors = getScoreColor(avgScore);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);
  };

  return (
    <FrostedCard className={`h-full ${colors.glow}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-2xl font-bold ${colors.text}`}>{status.label}</span>
          <Tooltip
            content={
              <div className="space-y-1 text-sm">
                <div>Overall market stance based on multiple indicators</div>
                <div className="mt-2 text-xs text-gray-400">
                  Click to expand for detailed analysis
                </div>
              </div>
            }
          />
        </div>

        {/* Plan summary */}
        <p className="text-sm text-gray-300 mb-4 flex-grow">{status.plan}</p>

        {/* Expand/Collapse button */}
        <button
          onClick={handleToggle}
          className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-2 border-t border-white/10"
        >
          {isExpanded ? (
            <>
              <span>Hide Details</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Show Details</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </FrostedCard>
  );
}

/**
 * Expanded details panel (shown separately)
 */
export function StatusDetailsPanel({
  status,
  isVisible,
}: {
  status: Status;
  isVisible: boolean;
}) {
  if (!isVisible) {
    return (
      <div className="frosted-card p-4 h-full flex items-center justify-center text-gray-500 text-sm">
        Click &ldquo;Show Details&rdquo; on the status card to see analysis
      </div>
    );
  }

  return (
    <FrostedCard className="h-full flex flex-col overflow-hidden">
      <h3 className="text-lg font-semibold text-white mb-4 flex-shrink-0">Analysis Details</h3>
      <ul className="space-y-3 overflow-y-auto flex-grow">
        {status.bullets.map((bullet, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-gray-300">
            <span className="text-green-400 mt-1 flex-shrink-0">•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </FrostedCard>
  );
}

export default StatusCard;
