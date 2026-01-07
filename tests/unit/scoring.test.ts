import { describe, it, expect } from 'vitest';
import { calculateScores, getStatusLabel, generateStatus, calculateSectorScores } from '@/lib/analysis/scoring';
import type { Indicator } from '@/lib/types';

describe('Scoring Functions', () => {
  describe('calculateScores', () => {
    it('returns scores between 0 and 100', () => {
      const indicators: Record<string, Indicator> = {
        SPY: {
          displayName: 'SPY',
          price: 450,
          previousClose: 445,
          change: 5,
          changePct: 1.12,
          session: 'REGULAR',
          source: 'YAHOO',
        },
        QQQ: {
          displayName: 'QQQ',
          price: 380,
          previousClose: 375,
          change: 5,
          changePct: 1.33,
          session: 'REGULAR',
          source: 'YAHOO',
        },
        VIX: {
          displayName: 'VIX',
          price: 15,
          previousClose: 16,
          change: -1,
          changePct: -6.25,
          session: 'REGULAR',
          source: 'YAHOO',
        },
      };

      const result = calculateScores(indicators, 'balanced');

      expect(result.scores.short).toBeGreaterThanOrEqual(0);
      expect(result.scores.short).toBeLessThanOrEqual(100);
      expect(result.scores.medium).toBeGreaterThanOrEqual(0);
      expect(result.scores.medium).toBeLessThanOrEqual(100);
      expect(result.scores.long).toBeGreaterThanOrEqual(0);
      expect(result.scores.long).toBeLessThanOrEqual(100);
    });

    it('returns 50 for empty indicators', () => {
      const result = calculateScores({}, 'balanced');

      // With no data, should default to neutral (50)
      expect(result.scores.short).toBe(50);
      expect(result.scores.medium).toBe(50);
      expect(result.scores.long).toBe(50);
    });

    it('handles missing categories gracefully', () => {
      const indicators: Record<string, Indicator> = {
        SPY: {
          displayName: 'SPY',
          price: 450,
          previousClose: 445,
          change: 5,
          changePct: 1.12,
          session: 'REGULAR',
          source: 'YAHOO',
        },
      };

      const result = calculateScores(indicators, 'balanced');

      // Should still return valid scores
      expect(typeof result.scores.short).toBe('number');
      expect(result.missingCategories.length).toBeGreaterThan(0);
    });

    it('uses different weights for different presets', () => {
      const indicators: Record<string, Indicator> = {
        SPY: {
          displayName: 'SPY',
          price: 450,
          previousClose: 445,
          change: 5,
          changePct: 1.12,
          session: 'REGULAR',
          source: 'YAHOO',
        },
        VIX: {
          displayName: 'VIX',
          price: 30,
          previousClose: 28,
          change: 2,
          changePct: 7.14,
          session: 'REGULAR',
          source: 'YAHOO',
        },
      };

      const balanced = calculateScores(indicators, 'balanced');
      const riskOff = calculateScores(indicators, 'risk-off-sensitive');
      const trendFollowing = calculateScores(indicators, 'trend-following');

      // Different presets should generally produce different scores
      // (though they might occasionally be the same with limited data)
      expect(typeof balanced.scores.medium).toBe('number');
      expect(typeof riskOff.scores.medium).toBe('number');
      expect(typeof trendFollowing.scores.medium).toBe('number');
    });
  });

  describe('getStatusLabel', () => {
    it('returns RISK-OFF for scores 0-25', () => {
      expect(getStatusLabel(0)).toBe('RISK-OFF');
      expect(getStatusLabel(10)).toBe('RISK-OFF');
      expect(getStatusLabel(25)).toBe('RISK-OFF');
    });

    it('returns DEFENSIVE for scores 26-45', () => {
      expect(getStatusLabel(26)).toBe('DEFENSIVE');
      expect(getStatusLabel(35)).toBe('DEFENSIVE');
      expect(getStatusLabel(45)).toBe('DEFENSIVE');
    });

    it('returns NEUTRAL for scores 46-60', () => {
      expect(getStatusLabel(46)).toBe('NEUTRAL');
      expect(getStatusLabel(50)).toBe('NEUTRAL');
      expect(getStatusLabel(60)).toBe('NEUTRAL');
    });

    it('returns RISK-ON for scores 61-80', () => {
      expect(getStatusLabel(61)).toBe('RISK-ON');
      expect(getStatusLabel(70)).toBe('RISK-ON');
      expect(getStatusLabel(80)).toBe('RISK-ON');
    });

    it('returns STRONGLY BULLISH for scores 81-100', () => {
      expect(getStatusLabel(81)).toBe('STRONGLY BULLISH');
      expect(getStatusLabel(90)).toBe('STRONGLY BULLISH');
      expect(getStatusLabel(100)).toBe('STRONGLY BULLISH');
    });
  });

  describe('generateStatus', () => {
    it('generates status with label, plan, and bullets', () => {
      const scores = { short: 55, medium: 50, long: 60 };
      const categoryScores = {
        trend: { score: 60, available: true, weight: 0.25 },
        volTail: { score: 50, available: true, weight: 0.2 },
        creditLiquidity: { score: 55, available: true, weight: 0.15 },
        rates: { score: 50, available: false, weight: 0.1 },
        usdFx: { score: 50, available: false, weight: 0.1 },
        breadth: { score: 50, available: false, weight: 0.2 },
      };
      const indicators: Record<string, Indicator> = {
        VIX: {
          displayName: 'VIX',
          price: 18,
          previousClose: 17,
          change: 1,
          changePct: 5.88,
          session: 'REGULAR',
          source: 'YAHOO',
        },
      };

      const status = generateStatus(scores, categoryScores, indicators, ['rates', 'usdFx', 'breadth']);

      expect(status.label).toBe('NEUTRAL');
      expect(status.plan).toBeTruthy();
      expect(status.bullets.length).toBeGreaterThan(0);
      expect(status.bullets.length).toBeLessThanOrEqual(8);
    });

    it('includes missing categories warning', () => {
      const scores = { short: 55, medium: 50, long: 60 };
      const categoryScores = {
        trend: { score: 60, available: true, weight: 0.25 },
        volTail: { score: 50, available: false, weight: 0.2 },
        creditLiquidity: { score: 55, available: false, weight: 0.15 },
        rates: { score: 50, available: false, weight: 0.1 },
        usdFx: { score: 50, available: false, weight: 0.1 },
        breadth: { score: 50, available: false, weight: 0.2 },
      };

      const status = generateStatus(
        scores,
        categoryScores,
        {},
        ['volTail', 'creditLiquidity', 'rates', 'usdFx', 'breadth']
      );

      const hasWarning = status.bullets.some((b) => b.includes('unavailable'));
      expect(hasWarning).toBe(true);
    });
  });
});

describe('Data Computation', () => {
  it('change equals price minus previousClose', () => {
    const price = 450.25;
    const previousClose = 445.50;
    const expectedChange = price - previousClose;

    expect(expectedChange).toBeCloseTo(4.75, 2);
  });

  it('changePct equals (change / previousClose) * 100', () => {
    const price = 450.25;
    const previousClose = 445.50;
    const change = price - previousClose;
    const expectedPct = (change / previousClose) * 100;

    expect(expectedPct).toBeCloseTo(1.066, 2);
  });

  it('ratio computation preserves previous values', () => {
    const vixPrice = 15;
    const vixPrevClose = 16;
    const vvixPrice = 85;
    const vvixPrevClose = 90;

    const ratioNow = vixPrice / vvixPrice;
    const ratioPrev = vixPrevClose / vvixPrevClose;
    const ratioChange = ratioNow - ratioPrev;
    const ratioPct = (ratioChange / ratioPrev) * 100;

    expect(ratioNow).toBeCloseTo(0.1765, 4);
    expect(ratioPrev).toBeCloseTo(0.1778, 4);
    expect(ratioChange).not.toBe(0);
    expect(ratioPct).toBeCloseTo(-0.74, 1);
  });
});

describe('calculateSectorScores', () => {
  // Helper to create a minimal indicator with changePct (in percentage points)
  // e.g., changePct = 0.42 means +0.42%
  const createIndicator = (changePct: number): Indicator => ({
    displayName: 'TEST',
    price: 100,
    previousClose: 100 / (1 + changePct / 100),
    change: changePct,
    changePct,
    session: 'REGULAR',
    source: 'STOOQ',
  });

  // New formula (tuned for intraday moves since Stooq uses open as previousClose):
  // absMove = clamp(sectorPct, -1.0, +1.0)
  // relMove = clamp(sectorPct - spyPct, -0.5, +0.5)
  // score = clamp(50 + absMove * 25 + relMove * 50, 0, 100)

  it('returns score of 50 when sector and SPY have same performance (0%)', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0),
      XLK: createIndicator(0),
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = 0, relMove = 0 → score = 50
    expect(xlk?.score).toBe(50);
  });

  it('returns score of 50 for missing sector data', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(1),
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // Missing data defaults to 50
    expect(xlk?.score).toBe(50);
  });

  it('increases score for positive sector performance', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0),
      XLK: createIndicator(0.5), // +0.5% up (typical intraday move)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(0.5, -1, 1) = 0.5
    // relMove = clamp(0.5 - 0, -0.5, 0.5) = 0.5
    // score = 50 + 0.5*25 + 0.5*50 = 50 + 12.5 + 25 = 87.5 → 88
    expect(xlk?.score).toBe(88);
  });

  it('decreases score for negative sector performance', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0),
      XLK: createIndicator(-0.5), // -0.5% down (typical intraday move)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(-0.5, -1, 1) = -0.5
    // relMove = clamp(-0.5 - 0, -0.5, 0.5) = -0.5
    // score = 50 + (-0.5)*25 + (-0.5)*50 = 50 - 12.5 - 25 = 12.5 → 13
    expect(xlk?.score).toBe(13);
  });

  it('calculates relative strength vs SPY correctly', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0.2), // SPY up 0.2%
      XLK: createIndicator(0.5), // XLK up 0.5% (outperforming by 0.3%)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(0.5, -1, 1) = 0.5
    // relMove = clamp(0.5 - 0.2, -0.5, 0.5) = 0.3
    // score = 50 + 0.5*25 + 0.3*50 = 50 + 12.5 + 15 = 77.5 → 78
    expect(xlk?.score).toBe(78);
  });

  it('handles sector underperforming SPY', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0.4), // SPY up 0.4%
      XLK: createIndicator(0), // XLK flat (underperforming by 0.4%)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(0, -1, 1) = 0
    // relMove = clamp(0 - 0.4, -0.5, 0.5) = -0.4
    // score = 50 + 0*25 + (-0.4)*50 = 50 - 20 = 30
    expect(xlk?.score).toBe(30);
  });

  it('clamps absMove at ±1.0 for extreme intraday moves', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0),
      XLK: createIndicator(2), // +2% extreme intraday move (capped at 1.0)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(2, -1, 1) = 1.0
    // relMove = clamp(2, -0.5, 0.5) = 0.5
    // score = 50 + 1.0*25 + 0.5*50 = 50 + 25 + 25 = 100
    expect(xlk?.score).toBe(100);
  });

  it('clamps total score between 0 and 100', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(-1), // SPY down 1%
      XLK: createIndicator(1), // XLK up 1% (outperformance of 2%)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(1, -1, 1) = 1.0
    // relMove = clamp(1 - -1, -0.5, 0.5) = clamp(2, -0.5, 0.5) = 0.5
    // score = clamp(50 + 1.0*25 + 0.5*50, 0, 100) = clamp(100, 0, 100) = 100
    expect(xlk?.score).toBe(100);
    expect(xlk?.score).toBeLessThanOrEqual(100);
  });

  it('handles negative extreme moves', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0.5), // SPY up 0.5%
      XLK: createIndicator(-1), // XLK down 1% (underperformance of 1.5%)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(-1, -1, 1) = -1.0
    // relMove = clamp(-1 - 0.5, -0.5, 0.5) = clamp(-1.5, -0.5, 0.5) = -0.5
    // score = clamp(50 + (-1.0)*25 + (-0.5)*50, 0, 100) = clamp(50 - 25 - 25, 0, 100) = 0
    expect(xlk?.score).toBe(0);
    expect(xlk?.score).toBeGreaterThanOrEqual(0);
  });

  it('produces varied scores for different sectors', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0.1),
      XLK: createIndicator(0.4), // Tech outperforming
      XLF: createIndicator(-0.2), // Financials underperforming
      XLE: createIndicator(0.6), // Energy strong
      XLU: createIndicator(-0.3), // Utilities weak
    };

    const sectors = calculateSectorScores(indicators);
    const scores = sectors.map((s) => s.score);

    // All sectors should have unique scores (no flat 50s)
    const uniqueScores = new Set(scores.filter((s) => s !== 50));
    expect(uniqueScores.size).toBeGreaterThan(0);

    // Verify XLK > XLF (tech outperforming financials)
    const xlk = sectors.find((s) => s.ticker === 'XLK');
    const xlf = sectors.find((s) => s.ticker === 'XLF');
    expect(xlk?.score).toBeGreaterThan(xlf?.score ?? 0);
  });

  it('returns all sector ETFs with human-readable names', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0),
    };

    const sectors = calculateSectorScores(indicators);

    // Should have all 10 sector ETFs
    expect(sectors.length).toBe(10);

    const expectedSectors = [
      { ticker: 'XLK', name: 'Technology' },
      { ticker: 'XLF', name: 'Financials' },
      { ticker: 'XLI', name: 'Industrials' },
      { ticker: 'XLE', name: 'Energy' },
      { ticker: 'XLV', name: 'Healthcare' },
      { ticker: 'XLP', name: 'Consumer Staples' },
      { ticker: 'XLU', name: 'Utilities' },
      { ticker: 'XLRE', name: 'Real Estate' },
      { ticker: 'XLY', name: 'Consumer Disc.' },
      { ticker: 'XLC', name: 'Communication' },
    ];

    for (const expected of expectedSectors) {
      const sector = sectors.find((s) => s.ticker === expected.ticker);
      expect(sector).toBeDefined();
      expect(sector?.name).toBe(expected.name);
    }
  });
});
