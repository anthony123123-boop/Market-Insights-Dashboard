import type { Indicator, Scores, Status, Sector, DashboardSettings } from '../types';
import { SECTOR_ETFS } from '../types';

/**
 * Default timeframe settings
 */
export const DEFAULT_TIMEFRAMES = {
  short: { min: 1, max: 5 },
  medium: { min: 10, max: 30 },
  long: { min: 60, max: 252 },
};

/**
 * Weight presets for different analysis styles
 */
const WEIGHT_PRESETS = {
  balanced: {
    trend: 0.25,
    volTail: 0.20,
    creditLiquidity: 0.15,
    rates: 0.10,
    usdFx: 0.10,
    breadth: 0.20,
  },
  'risk-off-sensitive': {
    trend: 0.15,
    volTail: 0.30,
    creditLiquidity: 0.25,
    rates: 0.10,
    usdFx: 0.10,
    breadth: 0.10,
  },
  'trend-following': {
    trend: 0.40,
    volTail: 0.10,
    creditLiquidity: 0.10,
    rates: 0.10,
    usdFx: 0.10,
    breadth: 0.20,
  },
};

/**
 * Normalize a value to 0-100 score
 */
function normalize(value: number, min: number, max: number, invert: boolean = false): number {
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = ((clamped - min) / (max - min)) * 100;
  return invert ? 100 - normalized : normalized;
}

/**
 * Calculate trend score from price data
 */
function calculateTrendScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  const spy = indicators['SPY'];
  const qqq = indicators['QQQ'];
  const iwm = indicators['IWM'];

  let totalScore = 0;
  let count = 0;

  // SPY momentum
  if (spy?.changePct !== undefined) {
    // Positive daily change is bullish
    totalScore += normalize(spy.changePct, -3, 3) * 0.4;
    count += 0.4;
  }

  // QQQ momentum
  if (qqq?.changePct !== undefined) {
    totalScore += normalize(qqq.changePct, -4, 4) * 0.35;
    count += 0.35;
  }

  // IWM (small caps) momentum
  if (iwm?.changePct !== undefined) {
    totalScore += normalize(iwm.changePct, -4, 4) * 0.25;
    count += 0.25;
  }

  if (count === 0) return { score: 50, available: false };

  return { score: totalScore / count, available: true };
}

/**
 * Calculate volatility/tail risk score
 */
function calculateVolTailScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  const vix = indicators['VIX'];
  const vixVvixRatio = indicators['VIX_VVIX_RATIO'];
  const skew = indicators['SKEW'];

  let totalScore = 0;
  let count = 0;

  // VIX level (lower is more bullish)
  if (vix?.price !== undefined) {
    // VIX typically ranges 10-40, with < 15 being low vol, > 30 being high vol
    totalScore += normalize(vix.price, 10, 40, true) * 0.5;
    count += 0.5;
  }

  // VIX/VVIX ratio (lower means less volatility of volatility)
  if (vixVvixRatio?.price !== undefined) {
    // Typical range 0.1-0.3
    totalScore += normalize(vixVvixRatio.price, 0.08, 0.35, true) * 0.3;
    count += 0.3;
  }

  // SKEW (lower is more bullish - less tail risk priced)
  if (skew?.price !== undefined) {
    // SKEW typically ranges 100-150
    totalScore += normalize(skew.price, 100, 160, true) * 0.2;
    count += 0.2;
  }

  if (count === 0) return { score: 50, available: false };

  return { score: totalScore / count, available: true };
}

/**
 * Calculate credit/liquidity score
 */
function calculateCreditScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  const hyg = indicators['HYG'];
  const lqd = indicators['LQD'];
  const hygLqdRatio = indicators['HYG_LQD_RATIO'];
  const tlt = indicators['TLT'];

  let totalScore = 0;
  let count = 0;

  // HYG momentum (high yield bonds performing = risk-on)
  if (hyg?.changePct !== undefined) {
    totalScore += normalize(hyg.changePct, -2, 2) * 0.35;
    count += 0.35;
  }

  // HYG/LQD ratio change (rising = risk appetite)
  if (hygLqdRatio?.changePct !== undefined) {
    totalScore += normalize(hygLqdRatio.changePct, -1, 1) * 0.35;
    count += 0.35;
  }

  // TLT momentum (inverse - falling TLT = rising rates = risk-on sentiment)
  if (tlt?.changePct !== undefined) {
    totalScore += normalize(tlt.changePct, -2, 2, true) * 0.3;
    count += 0.3;
  }

  if (count === 0) return { score: 50, available: false };

  return { score: totalScore / count, available: true };
}

/**
 * Calculate rates/yield curve score
 */
function calculateRatesScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  const tnx = indicators['TNX'];
  const yieldSpread = indicators['YIELD_10Y_2Y'];

  let totalScore = 0;
  let count = 0;

  // 10Y yield level - moderate yields are healthiest
  if (tnx?.price !== undefined) {
    // Optimal around 3-4%, penalize extremes
    const optimalScore = 100 - Math.abs(tnx.price - 3.5) * 20;
    totalScore += Math.max(0, Math.min(100, optimalScore)) * 0.5;
    count += 0.5;
  }

  // Yield curve slope - positive is healthier
  if (yieldSpread?.price !== undefined) {
    totalScore += normalize(yieldSpread.price, -1, 2) * 0.5;
    count += 0.5;
  }

  if (count === 0) return { score: 50, available: false };

  return { score: totalScore / count, available: true };
}

/**
 * Calculate USD/FX score
 */
function calculateUsdFxScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  const dxy = indicators['DXY'];
  const uup = indicators['UUP'];

  let totalScore = 0;
  let count = 0;

  // DXY - stronger dollar can be mixed signal, moderate is best for equities
  const dollarIndicator = dxy?.price !== undefined ? dxy : uup;

  if (dollarIndicator?.changePct !== undefined) {
    // Sharp dollar moves either way can indicate stress
    // Slight weakness (falling dollar) often bullish for risk assets
    totalScore += normalize(dollarIndicator.changePct, -1.5, 1.5, true) * 1.0;
    count += 1.0;
  }

  if (count === 0) return { score: 50, available: false };

  return { score: totalScore / count, available: true };
}

/**
 * Calculate breadth score
 */
function calculateBreadthScore(indicators: Record<string, Indicator>): { score: number; available: boolean } {
  const rspSpyRatio = indicators['RSP_SPY_RATIO'];
  const iwmSpyRatio = indicators['IWM_SPY_RATIO'];

  let totalScore = 0;
  let count = 0;

  // RSP/SPY ratio change (equal weight vs cap weight - rising = broad participation)
  if (rspSpyRatio?.changePct !== undefined) {
    totalScore += normalize(rspSpyRatio.changePct, -1, 1) * 0.5;
    count += 0.5;
  }

  // IWM/SPY ratio change (small caps vs large - rising = risk appetite)
  if (iwmSpyRatio?.changePct !== undefined) {
    totalScore += normalize(iwmSpyRatio.changePct, -1.5, 1.5) * 0.5;
    count += 0.5;
  }

  if (count === 0) return { score: 50, available: false };

  return { score: totalScore / count, available: true };
}

/**
 * Calculate overall scores
 */
export function calculateScores(
  indicators: Record<string, Indicator>,
  weightPreset: 'balanced' | 'risk-off-sensitive' | 'trend-following' = 'balanced'
): {
  scores: Scores;
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>;
  missingCategories: string[];
} {
  const weights = WEIGHT_PRESETS[weightPreset];

  // Calculate individual category scores
  const trend = calculateTrendScore(indicators);
  const volTail = calculateVolTailScore(indicators);
  const creditLiquidity = calculateCreditScore(indicators);
  const rates = calculateRatesScore(indicators);
  const usdFx = calculateUsdFxScore(indicators);
  const breadth = calculateBreadthScore(indicators);

  const categoryScores: Record<string, { score: number; available: boolean; weight: number }> = {
    trend: { ...trend, weight: weights.trend },
    volTail: { ...volTail, weight: weights.volTail },
    creditLiquidity: { ...creditLiquidity, weight: weights.creditLiquidity },
    rates: { ...rates, weight: weights.rates },
    usdFx: { ...usdFx, weight: weights.usdFx },
    breadth: { ...breadth, weight: weights.breadth },
  };

  // Calculate weighted score, renormalizing for missing categories
  let totalWeight = 0;
  let weightedSum = 0;
  const missingCategories: string[] = [];

  for (const [name, category] of Object.entries(categoryScores)) {
    if (category.available) {
      weightedSum += category.score * category.weight;
      totalWeight += category.weight;
    } else {
      missingCategories.push(name);
    }
  }

  // Base score
  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

  // Short-term is more reactive to daily changes
  const shortTermScore = Math.round(
    baseScore * 0.6 +
    (trend.available ? trend.score * 0.3 : baseScore * 0.3) +
    (volTail.available ? volTail.score * 0.1 : baseScore * 0.1)
  );

  // Medium-term blends multiple factors
  const mediumTermScore = Math.round(baseScore);

  // Long-term emphasizes trend and credit conditions
  const longTermScore = Math.round(
    baseScore * 0.5 +
    (trend.available ? trend.score * 0.25 : baseScore * 0.25) +
    (creditLiquidity.available ? creditLiquidity.score * 0.25 : baseScore * 0.25)
  );

  return {
    scores: {
      short: Math.max(0, Math.min(100, shortTermScore)),
      medium: Math.max(0, Math.min(100, mediumTermScore)),
      long: Math.max(0, Math.min(100, longTermScore)),
    },
    categoryScores,
    missingCategories,
  };
}

/**
 * Get status label from score
 */
export function getStatusLabel(score: number): string {
  if (score <= 25) return 'RISK-OFF';
  if (score <= 45) return 'DEFENSIVE';
  if (score <= 60) return 'NEUTRAL';
  if (score <= 80) return 'RISK-ON';
  return 'STRONGLY BULLISH';
}

/**
 * Generate status with plan and bullets
 */
export function generateStatus(
  scores: Scores,
  categoryScores: Record<string, { score: number; available: boolean; weight: number }>,
  indicators: Record<string, Indicator>,
  missingCategories: string[]
): Status {
  const avgScore = (scores.short + scores.medium + scores.long) / 3;
  const label = getStatusLabel(avgScore);

  // Generate plan based on status
  let plan = '';
  const bullets: string[] = [];

  switch (label) {
    case 'RISK-OFF':
      plan = 'Reduce exposure and raise cash. Focus on defensive positions.';
      break;
    case 'DEFENSIVE':
      plan = 'Maintain cautious stance. Favor quality and low volatility.';
      break;
    case 'NEUTRAL':
      plan = 'Balanced approach. Monitor for directional signals.';
      break;
    case 'RISK-ON':
      plan = 'Favorable conditions for risk assets. Consider adding exposure.';
      break;
    case 'STRONGLY BULLISH':
      plan = 'Strong bullish signals. Maximize equity exposure.';
      break;
  }

  // Generate explanatory bullets
  const vix = indicators['VIX'];
  const spy = indicators['SPY'];
  const hyg = indicators['HYG'];

  if (categoryScores.trend.available) {
    const trendDesc = categoryScores.trend.score > 60 ? 'positive' : categoryScores.trend.score < 40 ? 'negative' : 'neutral';
    bullets.push(`Trend momentum is ${trendDesc} (${categoryScores.trend.score.toFixed(0)}/100)`);
  }

  if (categoryScores.volTail.available) {
    const volDesc = categoryScores.volTail.score > 60 ? 'subdued' : categoryScores.volTail.score < 40 ? 'elevated' : 'moderate';
    bullets.push(`Volatility regime is ${volDesc} (${categoryScores.volTail.score.toFixed(0)}/100)`);
  }

  if (vix?.price !== undefined) {
    bullets.push(`VIX at ${vix.price.toFixed(2)} - ${vix.price < 15 ? 'low fear' : vix.price > 25 ? 'elevated fear' : 'moderate levels'}`);
  }

  if (categoryScores.creditLiquidity.available) {
    const creditDesc = categoryScores.creditLiquidity.score > 60 ? 'healthy' : categoryScores.creditLiquidity.score < 40 ? 'stressed' : 'stable';
    bullets.push(`Credit conditions appear ${creditDesc}`);
  }

  if (categoryScores.breadth.available) {
    const breadthDesc = categoryScores.breadth.score > 60 ? 'broad' : categoryScores.breadth.score < 40 ? 'narrow' : 'moderate';
    bullets.push(`Market breadth is ${breadthDesc}`);
  }

  if (spy?.changePct !== undefined) {
    const direction = spy.changePct > 0 ? 'up' : spy.changePct < 0 ? 'down' : 'flat';
    bullets.push(`S&P 500 ${direction} ${Math.abs(spy.changePct).toFixed(2)}% today`);
  }

  if (missingCategories.length > 0) {
    bullets.push(`Note: Some data unavailable (${missingCategories.join(', ')}) - scores adjusted`);
  }

  return {
    label,
    plan,
    bullets: bullets.slice(0, 8), // Max 8 bullets
  };
}

/**
 * Calculate sector attraction scores
 */
export function calculateSectorScores(indicators: Record<string, Indicator>): Sector[] {
  const spy = indicators['SPY'];
  const spyChange = spy?.changePct ?? 0;

  return SECTOR_ETFS.map((ticker) => {
    const sector = indicators[ticker];

    if (!sector?.changePct === undefined) {
      return { ticker, score: 50, name: ticker };
    }

    // Base score from relative performance vs SPY
    const relativePerformance = (sector.changePct ?? 0) - spyChange;

    // Normalize to 0-100 (outperformance of +2% = 100, underperformance of -2% = 0)
    let score = normalize(relativePerformance, -2, 2);

    // Add momentum factor
    if (sector.changePct !== undefined && sector.changePct > 0) {
      score = Math.min(100, score + 10); // Bonus for positive performance
    }

    return {
      ticker,
      score: Math.round(score),
      name: ticker,
    };
  });
}
