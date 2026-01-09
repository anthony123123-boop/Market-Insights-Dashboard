import { getScoreColor } from '@/lib/colors';
import { InfoTooltip } from './InfoTooltip';

interface ScoreGaugeProps {
  score: number;
  label: string;
  tooltip?: string;
}

export function ScoreGauge({ score, label, tooltip }: ScoreGaugeProps) {
  const colors = getScoreColor(score);

  // Slightly larger dimensions for better visibility
  const width = 100;
  const height = 70;
  const strokeWidth = 10;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  // Arc calculation: 180 degrees (half circle)
  const fillPercentage = score / 100;
  const arcLength = circumference * 0.5; // half circle
  const filledLength = arcLength * fillPercentage;

  const centerX = width / 2;
  const centerY = height - 5;

  return (
    <div className="flex flex-col items-center py-2">
      {/* Label ABOVE the arc */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          {label}
        </span>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>

      {/* Arc gauge - half circle opening upward */}
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} className="overflow-visible">
          {/* Glow filter */}
          <defs>
            <filter id={`glow-${label.replace(/\s/g, '')}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background arc - half circle */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Filled arc with glow */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke={colors.hex}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${arcLength}`}
            className="transition-all duration-700 ease-out"
            filter={`url(#glow-${label.replace(/\s/g, '')})`}
          />
        </svg>

        {/* Center text - positioned at bottom of arc */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: '50%',
            bottom: '2px',
            transform: 'translateX(-50%)'
          }}
        >
          <span
            className={`font-bold ${colors.text} text-2xl leading-none`}
            style={{
              textShadow: `0 0 20px ${colors.hex}80`
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
