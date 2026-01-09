/**
 * Color utilities for score-based gradients
 * Higher score => greener, Lower score => redder
 */

export interface ScoreColors {
  hex: string;
  rgb: string;
  text: string;
  glow: string;
}

/**
 * Get color based on score (0-100)
 * Uses a smooth red -> yellow -> green gradient
 */
export function getScoreColor(score: number): ScoreColors {
  const clamped = Math.max(0, Math.min(100, score));

  let r: number, g: number, b: number;

  if (clamped < 50) {
    // Red to Yellow (0-50)
    const ratio = clamped / 50;
    r = 239;
    g = Math.round(68 + (171 * ratio)); // 68 to 239
    b = 68;
  } else {
    // Yellow to Green (50-100)
    const ratio = (clamped - 50) / 50;
    r = Math.round(239 - (205 * ratio)); // 239 to 34
    g = Math.round(239 - (42 * ratio)); // 239 to 197
    b = Math.round(68 - (26 * ratio)); // 68 to 42
  }

  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  const rgb = `${r}, ${g}, ${b}`;

  // Determine text class based on score
  let text: string;
  if (clamped <= 35) {
    text = 'text-red-400';
  } else if (clamped <= 65) {
    text = 'text-yellow-400';
  } else {
    text = 'text-green-400';
  }

  return {
    hex,
    rgb,
    text,
    glow: `0 0 20px rgba(${rgb}, 0.5)`,
  };
}

/**
 * Get status color based on regime label
 */
export function getStatusColor(label: string): ScoreColors {
  switch (label) {
    case 'RISK-ON':
      return getScoreColor(80);
    case 'RISK-OFF':
      return getScoreColor(20);
    case 'CHOPPY':
      return getScoreColor(45);
    default:
      return getScoreColor(55);
  }
}

/**
 * Get bar color for sector chart with MORE DRAMATIC color variance
 * <30 = Red, 30-50 = Orange/Yellow, 50-70 = Yellow-Green, 70+ = Green
 */
export function getSectorBarColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));

  // More dramatic color thresholds
  if (clamped < 30) {
    // Deep red for bearish
    return '#ef4444';
  } else if (clamped < 45) {
    // Orange for weak
    return '#f97316';
  } else if (clamped < 55) {
    // Yellow for neutral
    return '#eab308';
  } else if (clamped < 70) {
    // Yellow-green for mildly bullish
    return '#84cc16';
  } else {
    // Bright green for bullish
    return '#22c55e';
  }
}

/**
 * Format percentage with color class
 */
export function getPercentageColorClass(pct: number): string {
  if (pct > 0.5) return 'text-green-400';
  if (pct < -0.5) return 'text-red-400';
  return 'text-gray-400';
}
