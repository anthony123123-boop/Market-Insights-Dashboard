import { useState } from 'react';
import { FrostedCard } from './FrostedCard';

interface InfoPanelProps {
  updatedAtNY: string;
}

const INDICATOR_CATALOG = [
  {
    title: 'Core Equities',
    items: [
      { symbol: 'SPY (Proxy)', source: 'Calculated (FRED)', note: 'Uses FRED S&P 500 index as a proxy for SPY price momentum.' },
      { symbol: 'QQQ (Proxy)', source: 'Calculated (FRED)', note: 'Uses FRED Nasdaq Composite for large-cap tech trend guidance.' },
      { symbol: 'IWM (Proxy)', source: 'Calculated (FRED)', note: 'Uses FRED Russell 2000 price index for small-cap momentum.' },
      { symbol: 'SP500', source: 'FRED', note: 'S&P 500 index; primary gauge for US large-cap equity trend.' },
      { symbol: 'NASDAQCOM', source: 'FRED', note: 'Nasdaq Composite; captures growth/tech bias.' },
      { symbol: 'DJIA', source: 'FRED', note: 'Dow Jones Industrial Average for blue-chip trend context.' },
      { symbol: 'RU2000PR', source: 'FRED', note: 'Russell 2000 price index for small-cap risk appetite.' },
    ],
  },
  {
    title: 'Volatility / Tail Risk',
    items: [
      { symbol: 'VIX', source: 'FRED', note: 'Implied volatility; higher values signal risk aversion.' },
    ],
  },
  {
    title: 'Credit / Liquidity',
    items: [
      { symbol: 'BAMLH0A0HYM2', source: 'FRED', note: 'High-yield OAS spread; widening implies credit stress.' },
      { symbol: 'BAMLC0A0CM', source: 'FRED', note: 'Investment-grade OAS spread; stress gauge for credit markets.' },
      { symbol: 'HYG (Proxy)', source: 'Calculated (FRED)', note: 'Uses HY OAS spread as a proxy for high-yield ETF conditions.' },
      { symbol: 'LQD (Proxy)', source: 'Calculated (FRED)', note: 'Uses IG OAS spread as a proxy for investment-grade ETF conditions.' },
      { symbol: 'HYG/LQD Ratio', source: 'Calculated', note: 'Ratio of HY vs IG proxies; higher values = risk appetite.' },
      { symbol: 'TEDRATE', source: 'FRED', note: 'TED spread; widening implies funding stress.' },
    ],
  },
  {
    title: 'Rates / Yield Curve',
    items: [
      { symbol: 'DGS10', source: 'FRED', note: '10Y Treasury yield; used for duration/rate trend.' },
      { symbol: 'DGS2', source: 'FRED', note: '2Y Treasury yield; short-rate proxy.' },
      { symbol: 'DGS5', source: 'FRED', note: '5Y Treasury yield; mid-curve signal.' },
      { symbol: 'DGS1', source: 'FRED', note: '1Y Treasury yield; front-end rate pressure.' },
      { symbol: 'YIELD_SPREAD', source: 'Calculated', note: '10Y minus 2Y spread; inversion signals late-cycle risk.' },
      { symbol: 'T10YIE', source: 'FRED', note: '10Y breakeven inflation expectations.' },
    ],
  },
  {
    title: 'Dollar / FX',
    items: [
      { symbol: 'DTWEXBGS', source: 'FRED', note: 'Broad trade-weighted USD; strength can pressure risk assets.' },
      { symbol: 'UUP (Proxy)', source: 'Calculated (FRED)', note: 'Uses the broad USD index as a proxy for UUP.' },
    ],
  },
  {
    title: 'Commodities',
    items: [
      { symbol: 'GOLD', source: 'FRED', note: 'Gold spot price; risk hedge / inflation sentiment.' },
      { symbol: 'GLD (Proxy)', source: 'Calculated (FRED)', note: 'Uses gold spot price as an ETF proxy.' },
      { symbol: 'OIL', source: 'FRED', note: 'WTI crude; energy inflation and growth sensitivity.' },
    ],
  },
  {
    title: 'Breadth',
    items: [
      { symbol: 'SMALL_LARGE', source: 'Calculated', note: 'Russell 2000 vs S&P 500 ratio for breadth.' },
      { symbol: 'RSP/SPY Ratio', source: 'Calculated', note: 'Equal-weight proxy vs cap-weight proxy for participation.' },
      { symbol: 'IWM/SPY Ratio', source: 'Calculated', note: 'Small-cap proxy vs large-cap proxy for risk appetite.' },
    ],
  },
  {
    title: 'Sectors',
    items: [
      { symbol: 'Sector Attraction (FRED proxies)', source: 'Calculated', note: 'Sector scores are derived from FRED macro proxies (e.g., oil, yields, spreads). Missing proxy data yields N/A per sector.' },
    ],
  },
];

export function InfoPanel({ updatedAtNY }: InfoPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <FrostedCard className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-left p-2 rounded-lg hover:bg-white/5 transition"
      >
        <span className="text-sm font-semibold text-white">
          INFO: How this dashboard works (Indicators + Scoring)
        </span>
        <span className="text-xs text-gray-400">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-6 text-sm text-gray-200 leading-relaxed">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Last updated (ET): {updatedAtNY}</span>
            <span>Sources: FRED + Calculated</span>
          </div>

          <section>
            <h3 className="text-base font-semibold text-white mb-2">Indicator Catalog</h3>
            <div className="space-y-4">
              {INDICATOR_CATALOG.map(section => (
                <div key={section.title}>
                  <h4 className="text-xs uppercase tracking-wider text-emerald-200/80 mb-2">{section.title}</h4>
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-xs">
                      <thead className="bg-white/5 text-gray-300">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Symbol</th>
                          <th className="px-3 py-2 text-left font-medium">Source</th>
                          <th className="px-3 py-2 text-left font-medium">What it indicates</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map(item => (
                          <tr key={item.symbol} className="border-t border-white/5">
                            <td className="px-3 py-2 text-gray-100">{item.symbol}</td>
                            <td className="px-3 py-2 text-gray-400">{item.source}</td>
                            <td className="px-3 py-2 text-gray-300">{item.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2">Scoring Logic</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                Each category is normalized to a 0–100 scale using min/max thresholds.
                We clamp inputs to the range and linearly map them to a score:
                <span className="text-gray-200"> score = ((value - min) / (max - min)) * 100</span>,
                with optional inversion where lower values are better.
              </p>
              <p>
                Category weights: Trend (25%), Volatility (20%), Credit/Liquidity (20%), Rates (15%),
                Breadth (10%), USD/FX (10%). Missing data is skipped and weights are rebalanced.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="text-gray-200">Short-term</span>: 60% composite + 40% trend.</li>
                <li><span className="text-gray-200">Medium-term</span>: composite score.</li>
                <li><span className="text-gray-200">Long-term</span>: 50% composite + 30% credit + 20% rates.</li>
              </ul>
              <p>
                Regime classification uses the short/medium/long average with credit stress overrides:
                Risk-On (avg ≥ 65 & short ≥ 55), Risk-Off (avg ≤ 35 or credit stress), Choppy (short/long spread &gt; 20),
                else Neutral.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2">Sector Strength Math</h3>
            <div className="space-y-2 text-gray-300">
              <p>
                Sector attraction scores are derived from FRED macro proxies (e.g., oil for energy, rates for financials).
                Each proxy is normalized to a 0–100 score using a min/max range and optional inversion.
              </p>
              <p>
                <span className="text-gray-200">Formula:</span> normalize(proxy, min, max) → 0–100.
                Missing proxy data yields <span className="text-gray-200">N/A</span> for that sector only.
              </p>
            </div>
          </section>
        </div>
      )}
    </FrostedCard>
  );
}

export default InfoPanel;
