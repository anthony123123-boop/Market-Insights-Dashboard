import { getScoreColor } from '@/lib/colors';
import { InfoTooltip } from './InfoTooltip';

interface ScoreGaugeProps {
  score: number;
  label: string;
  tooltip?: string;
}

export function ScoreGauge({ score, label, tooltip }: ScoreGaugeProps) {
  const colors = getScoreColor(score);

  // Larger dimensions for better clarity
  const width = 120;
  const height = 80;
  const strokeWidth = 12;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  // Arc calculation: 180 degrees (half circle)
  const fillPercentage = score / 100;
  const arcLength = circumference * 0.5; // half circle
  const filledLength = arcLength * fillPercentage;

  const centerX = width / 2;
  const centerY = height - 5;

  return (
    <div className="flex flex-col items-center py-1">
      {/* Label ABOVE the arc - more prominent */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm font-bold uppercase tracking-wider text-white">
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
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
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
            stroke="rgba(255, 255, 255, 0.15)"
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

        {/* Center text - positioned inside arc */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: '50%',
            bottom: '4px',
            transform: 'translateX(-50%)'
          }}
        >
          <span
            className={`font-black ${colors.text} text-3xl leading-none`}
            style={{
              textShadow: `0 0 25px ${colors.hex}90`
            }}
          >
            {Math.round(score)}
          </span>
          <span className="text-gray-400 text-[11px] font-medium">/100</span>
        </div>
      </div>
    </div>
  );
}

export default ScoreGauge;
