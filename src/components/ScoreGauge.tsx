import { getScoreColor } from '@/lib/colors';
import { InfoTooltip } from './InfoTooltip';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export function ScoreGauge({ score, label, size = 'md', tooltip }: ScoreGaugeProps) {
  const colors = getScoreColor(score);

  // Compact SVG dimensions
  const dimensions = {
    sm: { width: 80, height: 80, strokeWidth: 6, fontSize: 18, labelSize: 10 },
    md: { width: 100, height: 100, strokeWidth: 8, fontSize: 24, labelSize: 11 },
    lg: { width: 120, height: 120, strokeWidth: 10, fontSize: 28, labelSize: 12 },
  };

  const { width, height, strokeWidth, fontSize, labelSize } = dimensions[size];
  const radius = (width - strokeWidth) / 2 - 6;
  const circumference = 2 * Math.PI * radius;

  // Arc calculation: 270 degrees (3/4 of circle)
  const fillPercentage = score / 100;
  const arcLength = circumference * 0.75;
  const filledLength = arcLength * fillPercentage;

  const centerX = width / 2;
  const centerY = height / 2;

  return (
    <div className="flex flex-col items-center">
      {/* Label ABOVE the arc */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="font-semibold uppercase tracking-wider text-gray-300"
          style={{ fontSize: `${labelSize}px` }}
        >
          {label}
        </span>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>

      {/* Arc gauge */}
      <div className="relative">
        <svg width={width} height={height} className="transform -rotate-90">
          {/* Background arc */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
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
            className="transition-all duration-700 ease-out"
            style={{
              filter: `drop-shadow(0 0 10px ${colors.hex}80)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-bold ${colors.text}`}
            style={{
              fontSize: `${fontSize}px`,
              textShadow: `0 0 20px ${colors.hex}60`
            }}
          >
            {Math.round(score)}
          </span>
          <span className="text-gray-500 text-xs">/100</span>
        </div>
      </div>
    </div>
  );
}

export default ScoreGauge;
