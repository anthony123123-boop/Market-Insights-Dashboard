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
    // Rich red to warm olive (0-50)
    const ratio = clamped / 50;
    r = Math.round(230 - (90 * ratio)); // 230 to 140
    g = Math.round(60 + (120 * ratio)); // 60 to 180
    b = Math.round(50 + (20 * ratio)); // 50 to 70
  } else {
    // Olive to vibrant green (50-100)
    const ratio = (clamped - 50) / 50;
    r = Math.round(140 - (110 * ratio)); // 140 to 30
    g = Math.round(180 + (70 * ratio)); // 180 to 250
    b = Math.round(70 + (20 * ratio)); // 70 to 90
  }

  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  const rgb = `${r}, ${g}, ${b}`;

  // Determine text class based on score
  let text: string;
  if (clamped <= 35) {
    text = 'text-rose-300';
  } else if (clamped <= 65) {
    text = 'text-amber-200';
  } else {
    text = 'text-emerald-300';
  }

  return {
    hex,
    rgb,
    text,
    glow: `0 0 30px rgba(${rgb}, 0.7)`,
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
    return '#d06a6a';
  } else if (clamped < 45) {
    // Rust for weak
    return '#c58b53';
  } else if (clamped < 55) {
    // Amber for neutral
    return '#c7a468';
  } else if (clamped < 70) {
    // Sage for mildly bullish
    return '#7fbf7a';
  } else {
    // Natural green for bullish
    return '#2fd173';
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
