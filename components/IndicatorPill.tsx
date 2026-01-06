'use client';

import { FrostedCard } from './FrostedCard';
import { Tooltip } from './Tooltip';
import type { Indicator } from '@/lib/types';
import {
  formatPrice,
  formatChange,
  formatChangePct,
  formatPillPrice,
  getChangeColorClass,
  isFXTicker,
  getDisplayName,
} from '@/lib/format';

interface IndicatorPillProps {
  ticker: string;
  indicator: Indicator;
  size?: 'sm' | 'md' | 'lg';
  showPrice?: boolean;
}

export function IndicatorPill({
  ticker,
  indicator,
  size = 'md',
  showPrice = true,
}: IndicatorPillProps) {
  const isFX = isFXTicker(ticker);
  const changeClass = getChangeColorClass(indicator.change);

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const nameSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };

  const priceSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const displayName = indicator.displayName || getDisplayName(ticker);

  return (
    <FrostedCard className={`${sizeClasses[size]} min-w-0`}>
      <div className="flex flex-col gap-1">
        {/* Header with ticker and tooltip */}
        <div className="flex items-center justify-between gap-2">
          <span className={`font-semibold text-gray-200 ${nameSizeClasses[size]}`}>
            {displayName}
          </span>
          <Tooltip
            content={
              <div className="space-y-1">
                <div>Symbol: {ticker}</div>
                <div>Session: {indicator.session}</div>
                <div>Source: {indicator.source}</div>
                {indicator.asOfET && <div>As of: {indicator.asOfET}</div>}
              </div>
            }
          />
        </div>

        {/* Price */}
        {showPrice && (
          <div className={`font-bold text-white ${priceSizeClasses[size]}`}>
            {formatPrice(indicator.price, isFX)}
          </div>
        )}

        {/* Change */}
        <div className={`flex items-center gap-2 ${changeClass}`}>
          <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>
            {formatChange(indicator.change, isFX)}
          </span>
          <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} opacity-80`}>
            ({formatChangePct(indicator.changePct)})
          </span>
        </div>
      </div>
    </FrostedCard>
  );
}

/**
 * Format source name for display
 */
function formatSource(source: string): string {
  const sourceMap: Record<string, string> = {
    STOOQ: 'Stooq',
    FRED: 'FRED',
    ALPHAVANTAGE: 'AV',
    YAHOO: 'Yahoo',
    DERIVED: 'Calc',
  };
  return sourceMap[source] || source;
}

/**
 * Small pill variant for VIEW MORE section
 * Shows: TICKER (Source) PRICE +/-X.XX%
 */
export function SmallIndicatorPill({
  ticker,
  indicator,
}: {
  ticker: string;
  indicator: Indicator;
}) {
  const changeClass = getChangeColorClass(indicator.change);
  const displayName = indicator.displayName || getDisplayName(ticker);
  const priceDisplay = formatPillPrice(indicator.price, ticker);
  const sourceName = formatSource(indicator.source);

  return (
    <div className="frosted-card px-3 py-2 flex items-center justify-between gap-3 min-w-[200px]">
      <span className="text-xs font-medium text-gray-300 truncate">
        {displayName}
        <span className="text-gray-500 ml-1">({sourceName})</span>
      </span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-semibold text-white">
          {priceDisplay}
        </span>
        <span className={`text-xs font-semibold ${changeClass}`}>
          {formatChangePct(indicator.changePct)}
        </span>
      </div>
    </div>
  );
}

export default IndicatorPill;
