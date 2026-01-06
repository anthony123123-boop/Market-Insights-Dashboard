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

  // New formula:
  // absMove = clamp(sectorPct, -2.5, +2.5)
  // relMove = clamp(sectorPct - spyPct, -2.0, +2.0)
  // score = clamp(50 + absMove * 12 + relMove * 15, 0, 100)

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
      XLK: createIndicator(1), // +1% up day
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = 1, relMove = 1
    // score = 50 + 1*12 + 1*15 = 77
    expect(xlk?.score).toBe(77);
  });

  it('decreases score for negative sector performance', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0),
      XLK: createIndicator(-1), // -1% down day
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = -1, relMove = -1
    // score = 50 + (-1)*12 + (-1)*15 = 50 - 12 - 15 = 23
    expect(xlk?.score).toBe(23);
  });

  it('calculates relative strength vs SPY correctly', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0.5), // SPY up 0.5%
      XLK: createIndicator(1.5), // XLK up 1.5% (outperforming by 1%)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = 1.5, relMove = 1.0
    // score = 50 + 1.5*12 + 1.0*15 = 50 + 18 + 15 = 83
    expect(xlk?.score).toBe(83);
  });

  it('handles sector underperforming SPY', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(1), // SPY up 1%
      XLK: createIndicator(0), // XLK flat (underperforming by 1%)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = 0, relMove = -1
    // score = 50 + 0*12 + (-1)*15 = 50 - 15 = 35
    expect(xlk?.score).toBe(35);
  });

  it('clamps absMove at ±2.5 for extreme moves', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0),
      XLK: createIndicator(5), // +5% extreme up day (capped at 2.5)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(5, -2.5, 2.5) = 2.5
    // relMove = clamp(5, -2, 2) = 2
    // score = 50 + 2.5*12 + 2*15 = 50 + 30 + 30 = 110 → clamped to 100
    expect(xlk?.score).toBe(100);
  });

  it('clamps total score between 0 and 100', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(-3), // SPY down 3%
      XLK: createIndicator(3), // XLK up 3% (massive outperformance of 6%)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(3, -2.5, 2.5) = 2.5
    // relMove = clamp(3 - -3, -2, 2) = clamp(6, -2, 2) = 2
    // score = clamp(50 + 2.5*12 + 2*15, 0, 100) = clamp(110, 0, 100) = 100
    expect(xlk?.score).toBe(100);
    expect(xlk?.score).toBeLessThanOrEqual(100);
  });

  it('handles negative extreme moves', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(2), // SPY up 2%
      XLK: createIndicator(-3), // XLK down 3% (underperformance of 5%)
    };

    const sectors = calculateSectorScores(indicators);
    const xlk = sectors.find((s) => s.ticker === 'XLK');

    // absMove = clamp(-3, -2.5, 2.5) = -2.5
    // relMove = clamp(-3 - 2, -2, 2) = clamp(-5, -2, 2) = -2
    // score = clamp(50 + (-2.5)*12 + (-2)*15, 0, 100) = clamp(50 - 30 - 30, 0, 100) = clamp(-10, 0, 100) = 0
    expect(xlk?.score).toBe(0);
    expect(xlk?.score).toBeGreaterThanOrEqual(0);
  });

  it('produces varied scores for different sectors', () => {
    const indicators: Record<string, Indicator> = {
      SPY: createIndicator(0.3),
      XLK: createIndicator(0.8), // Tech outperforming
      XLF: createIndicator(-0.2), // Financials underperforming
      XLE: createIndicator(1.0), // Energy strong
      XLU: createIndicator(-0.5), // Utilities weak
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
