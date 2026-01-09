
import { getScoreColor } from '@/lib/colors';

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

  // Arc calculation: 270 degrees (3/4 of circle)
  const fillPercentage = score / 100;
  const arcLength = circumference * 0.75;
  const filledLength = arcLength * fillPercentage;

  const centerX = width / 2;
  const centerY = height / 2;

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
          strokeDashoffset={-circumference * 0.125}
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
            filter: `drop-shadow(0 0 8px ${colors.hex})`,
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
          {Math.round(score)}
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
