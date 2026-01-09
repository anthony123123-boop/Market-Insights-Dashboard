import { useState } from 'react';
import { FrostedCard } from './FrostedCard';
import { CompactIndicatorPill } from './IndicatorPill';
import { INDICATOR_CATEGORIES, INDICATOR_NAMES } from '@/types';
import type { Indicator } from '@/types';

interface ViewMorePanelProps {
  indicators: Record<string, Indicator>;
}

const CATEGORY_LABELS: Record<string, string> = {
  VOL_TAIL: 'Volatility / Tail Risk',
  CREDIT_LIQUIDITY: 'Credit / Liquidity',
  USD_FX: 'USD / FX',
  RATES_YIELD: 'Rates / Yield Curve',
  COMMODITIES: 'Commodities',
  BREADTH: 'Market Breadth',
};

// Order of categories to display
const CATEGORY_ORDER = [
  'VOL_TAIL',
  'CREDIT_LIQUIDITY',
  'USD_FX',
  'RATES_YIELD',
  'COMMODITIES',
  'BREADTH',
];

export function ViewMorePanel({ indicators }: ViewMorePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get indicators for each category with friendly display names
  const getCategoryIndicators = (categoryKey: string): Indicator[] => {
    const tickers = INDICATOR_CATEGORIES[categoryKey as keyof typeof INDICATOR_CATEGORIES] ?? [];
    return tickers
      .map((ticker) => {
        const ind = indicators[ticker];
        if (!ind) return undefined;
        // Apply friendly display name from INDICATOR_NAMES
        return {
          ...ind,
          displayName: INDICATOR_NAMES[ticker] || ind.displayName || ticker,
        };
      })
      .filter((ind): ind is Indicator => ind !== undefined);
  };

  return (
    <FrostedCard className="mt-4">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors"
      >
        <span className="font-semibold text-white">
          VIEW MORE INDICATORS
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORY_ORDER.map((categoryKey) => {
            const categoryIndicators = getCategoryIndicators(categoryKey);
            if (categoryIndicators.length === 0) return null;

            return (
              <div key={categoryKey} className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {CATEGORY_LABELS[categoryKey] ?? categoryKey}
                </h4>
                <div className="space-y-1">
                  {categoryIndicators.map((indicator) => (
                    <CompactIndicatorPill
                      key={indicator.ticker}
                      indicator={indicator}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </FrostedCard>
  );
}

export default ViewMorePanel;
