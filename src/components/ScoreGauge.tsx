import { getScoreColor } from '@/lib/colors';
import { InfoTooltip } from './InfoTooltip';

interface ScoreGaugeProps {
  score: number;
  label: string;
  tooltip?: string;
}

export function ScoreGauge({ score, label, tooltip }: ScoreGaugeProps) {
  const colors = getScoreColor(score);

  // COMPACT dimensions - smaller arc
  const width = 90;
  const height = 60;
  const strokeWidth = 8;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;

  // Arc calculation: 180 degrees (half circle)
  const fillPercentage = score / 100;
  const arcLength = circumference * 0.5; // half circle
  const filledLength = arcLength * fillPercentage;

  const centerX = width / 2;
  const centerY = height - 5;

  return (
    <div className="flex flex-col items-center">
      {/* Label ABOVE the arc */}
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">
          {label}
        </span>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>

      {/* Arc gauge - half circle opening upward */}
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} className="overflow-visible">
          {/* Background arc - half circle */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Filled arc */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke={colors.hex}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${arcLength}`}
            className="transition-all duration-700 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${colors.hex}80)`,
            }}
          />
        </svg>

        {/* Center text - positioned at bottom of arc */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: '50%',
            bottom: '0px',
            transform: 'translateX(-50%)'
          }}
        >
          <span
            className={`font-bold ${colors.text} text-xl leading-none`}
            style={{
              textShadow: `0 0 15px ${colors.hex}60`
            }}
          >
            {Math.round(score)}
          </span>
          <span className="text-gray-500 text-[10px]">/100</span>
        </div>
      </div>
    </div>
  );
}

export default ScoreGauge;
