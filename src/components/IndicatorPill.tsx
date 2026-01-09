
import { FrostedCard } from './FrostedCard';
import { formatPrice, formatPercent, formatChange, getTickerDisplayName, getSourceLabel } from '@/lib/format';
import { getPercentageColorClass } from '@/lib/colors';
import type { Indicator } from '@/types';

interface IndicatorPillProps {
  indicator: Indicator;
  size?: 'sm' | 'md' | 'lg';
  showSource?: boolean;
}

export function IndicatorPill({ indicator, size = 'md', showSource = false }: IndicatorPillProps) {
  const pctClass = getPercentageColorClass(indicator.changePct ?? 0);

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const titleSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const priceSize = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const changeSize = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const displayName = getTickerDisplayName(indicator.ticker);

  return (
    <FrostedCard className={`${sizeClasses[size]} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className={`font-semibold text-white ${titleSize[size]}`}>
          {displayName}
        </span>
        {showSource && (
          <span className="text-xs text-gray-500">
            {getSourceLabel(indicator.source)}
          </span>
        )}
      </div>

      {/* Price */}
      <div className={`font-bold text-white ${priceSize[size]}`}>
        {indicator.price !== undefined ? formatPrice(indicator.price) : 'N/A'}
      </div>

      {/* Change */}
      <div className={`flex items-center gap-2 ${changeSize[size]} mt-1`}>
        {indicator.change !== undefined && (
          <span className={pctClass}>
            {formatChange(indicator.change)}
          </span>
        )}
        {indicator.changePct !== undefined && (
          <span className={pctClass}>
            ({formatPercent(indicator.changePct)})
          </span>
        )}
      </div>

      {/* Proxy note */}
      {indicator.isProxy && indicator.proxyNote && (
        <div className="text-xs text-gray-500 mt-1">
          {indicator.proxyNote}
        </div>
      )}
    </FrostedCard>
  );
}

// Compact pill for "View More" section
interface CompactPillProps {
  indicator: Indicator;
}

export function CompactIndicatorPill({ indicator }: CompactPillProps) {
  const pctClass = getPercentageColorClass(indicator.changePct ?? 0);
  const displayName = getTickerDisplayName(indicator.ticker);

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <span className="text-sm text-gray-300">{displayName}</span>
      <span className={`text-sm font-medium ${pctClass}`}>
        {indicator.changePct !== undefined ? formatPercent(indicator.changePct) : 'N/A'}
      </span>
    </div>
  );
}

export default IndicatorPill;
