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
    // Muted red to olive (0-50)
    const ratio = clamped / 50;
    r = Math.round(255); // 180 to 120
    g = Math.round(45 + (169 * ratio)); // 80 to 170
    b = Math.round(70 + (20 * ratio)); // 70 to 90
  } else {
    // Olive to sage green (50-100)
    const ratio = (clamped - 50) / 50;
    r = Math.round(255 - (205 * ratio)); // 120 to 50
    g = Math.round(214 + (41 * ratio)); // 170 to 210
    b = Math.round(10 + (65 * ratio)); // 90 to 110
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
    glow: `0 0 42px rgba(${rgb}, 0.85)`,
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
    // Muted red for bearish
    return '#cf4c4c';
  } else if (clamped < 45) {
    // Rust for weak
    return '#c47c45';
  } else if (clamped < 55) {
    // Amber for neutral
    return '#bfa04a';
  } else if (clamped < 70) {
    // Sage for mildly bullish
    return '#8caf5a';
  } else {
    // Natural green for bullish
    return '#4c8f6c';
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
