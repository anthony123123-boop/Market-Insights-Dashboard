import { FrostedCard } from './FrostedCard';
import { getStatusColor } from '@/lib/colors';
import type { Status } from '@/types';

interface StatusCardProps {
  status: Status;
}

export function StatusCard({ status }: StatusCardProps) {
  const colors = getStatusColor(status.label);

  return (
    <FrostedCard className="h-full flex flex-col" glowColor={colors.hex}>
      {/* Regime Label - prominent at top */}
      <div className="text-center pb-3 border-b border-white/5">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
          Market Regime
        </div>
        <div
          className={`text-2xl font-black uppercase tracking-wider ${colors.text}`}
          style={{ textShadow: `0 0 30px ${colors.hex}80` }}
        >
          {status.label}
        </div>
      </div>

      {/* Plan of Action */}
      <div className="py-3 border-b border-white/5">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
          Plan of Action
        </div>
        <p className="text-sm text-gray-200 leading-relaxed">{status.plan}</p>
      </div>

      {/* Key Drivers - scrollable if needed */}
      <div className="flex-1 py-3 overflow-y-auto">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
          Key Drivers
        </div>
        <ul className="space-y-2">
          {status.reasons.map((reason, index) => (
            <li key={index} className="flex items-start text-xs">
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5 mr-2 flex-shrink-0"
                style={{ backgroundColor: colors.hex }}
              />
              <span className="text-gray-300 leading-relaxed">{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary footer */}
      <div className="pt-2 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">Analysis based on macro/micro signals</span>
          <span className={`font-semibold ${colors.text}`}>
            {status.label === 'RISK-ON' ? '▲ Bullish' :
             status.label === 'RISK-OFF' ? '▼ Bearish' :
             status.label === 'CHOPPY' ? '◆ Volatile' : '● Neutral'}
          </span>
        </div>
      </div>
    </FrostedCard>
  );
}

export default StatusCard;
