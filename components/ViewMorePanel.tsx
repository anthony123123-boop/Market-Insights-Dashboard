'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SmallIndicatorPill } from './IndicatorPill';
import type { Indicator } from '@/lib/types';
import { INDICATOR_CATEGORIES } from '@/lib/types';

interface ViewMorePanelProps {
  indicators: Record<string, Indicator>;
  visibleCategories?: {
    core: boolean;
    volTail: boolean;
    creditLiquidity: boolean;
    usdFx: boolean;
    ratesYield: boolean;
    commodities: boolean;
    sectors: boolean;
    breadth: boolean;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  CORE: 'CORE',
  VOL_TAIL: 'VOL / TAIL',
  CREDIT_LIQUIDITY: 'CREDIT / LIQUIDITY',
  USD_FX: 'USD & FX',
  RATES_YIELD: 'RATES / YIELD CURVE',
  COMMODITIES: 'COMMODITIES',
  SECTORS: 'SECTORS',
  BREADTH: 'BREADTH',
};

export function ViewMorePanel({ indicators, visibleCategories }: ViewMorePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter indicators by category
  const categorizedIndicators: Record<string, Array<{ ticker: string; indicator: Indicator }>> = {};

  for (const [categoryKey, tickers] of Object.entries(INDICATOR_CATEGORIES)) {
    const categoryIndicators: Array<{ ticker: string; indicator: Indicator }> = [];

    for (const ticker of tickers) {
      const indicator = indicators[ticker];
      if (indicator && indicator.session !== 'NA') {
        categoryIndicators.push({ ticker, indicator });
      }
    }

    if (categoryIndicators.length > 0) {
      categorizedIndicators[categoryKey] = categoryIndicators;
    }
  }

  // Check visibility settings
  const isVisible = (categoryKey: string): boolean => {
    if (!visibleCategories) return true;

    const mapping: Record<string, keyof typeof visibleCategories> = {
      CORE: 'core',
      VOL_TAIL: 'volTail',
      CREDIT_LIQUIDITY: 'creditLiquidity',
      USD_FX: 'usdFx',
      RATES_YIELD: 'ratesYield',
      COMMODITIES: 'commodities',
      SECTORS: 'sectors',
      BREADTH: 'breadth',
    };

    const key = mapping[categoryKey];
    return key ? visibleCategories[key] : true;
  };

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white transition-colors border-t border-b border-white/10"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        <span className="text-sm font-medium">VIEW MORE</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 space-y-6">
          {Object.entries(categorizedIndicators).map(([categoryKey, items]) => {
            if (!isVisible(categoryKey)) return null;

            return (
              <div key={categoryKey}>
                {/* Category header */}
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[categoryKey] || categoryKey}
                </h4>

                {/* Pills grid */}
                <div className="flex flex-wrap gap-2">
                  {items.map(({ ticker, indicator }) => (
                    <SmallIndicatorPill
                      key={ticker}
                      ticker={ticker}
                      indicator={indicator}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ViewMorePanel;
