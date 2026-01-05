'use client';

import { getScoreColor } from '@/lib/format';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreGauge({ score, label, size = 'md' }: ScoreGaugeProps) {
  const colors = getScoreColor(score);

  // SVG dimensions based on size
  const dimensions = {
    sm: { width: 100, height: 100, strokeWidth: 8, fontSize: 20, labelSize: 10 },
    md: { width: 140, height: 140, strokeWidth: 10, fontSize: 28, labelSize: 12 },
    lg: { width: 180, height: 180, strokeWidth: 12, fontSize: 36, labelSize: 14 },
  };

  const { width, height, strokeWidth, fontSize, labelSize } = dimensions[size];
  const radius = (width - strokeWidth) / 2 - 10;
  const circumference = 2 * Math.PI * radius;

  // Arc starts at top (270 degrees or -90 in standard math) and goes clockwise
  // We want to fill based on score percentage
  const fillPercentage = score / 100;
  const arcLength = circumference * 0.75; // 270 degree arc (3/4 of circle)
  const filledLength = arcLength * fillPercentage;
  const emptyLength = arcLength - filledLength;

  const centerX = width / 2;
  const centerY = height / 2;

  // Arc path for 270 degrees starting from bottom-left going clockwise to bottom-right
  const startAngle = 135; // Start at 135 degrees (bottom-left)
  const endAngle = 45; // End at 45 degrees (bottom-right) - clockwise through top

  // Convert to radians for calculations
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((360 + endAngle) * Math.PI) / 180;

  // Calculate start and end points
  const startX = centerX + radius * Math.cos(startRad);
  const startY = centerY + radius * Math.sin(startRad);

  return (
    <div className="relative flex flex-col items-center">
      <svg width={width} height={height} className="transform -rotate-90">
        {/* Background arc */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={-circumference * 0.125} // Offset to start at correct position
          strokeLinecap="round"
        />

        {/* Filled arc */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={colors.hex}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filledLength} ${circumference - filledLength}`}
          strokeDashoffset={-circumference * 0.125}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${colors.hex})`,
          }}
        />
      </svg>

      {/* Center text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingBottom: size === 'lg' ? 10 : 5 }}
      >
        <span
          className={`font-bold ${colors.text}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {score}
        </span>
        <span className="text-gray-400" style={{ fontSize: `${labelSize}px` }}>
          /100
        </span>
      </div>

      {/* Label below */}
      <span
        className={`mt-1 font-semibold uppercase tracking-wide ${colors.text}`}
        style={{ fontSize: `${labelSize + 2}px` }}
      >
        {label}
      </span>
    </div>
  );
}

export default ScoreGauge;
