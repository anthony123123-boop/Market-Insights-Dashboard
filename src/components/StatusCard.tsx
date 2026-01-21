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
      <div className="text-center pb-4 border-b border-white/10">
        <div className="text-[11px] text-slate-300 uppercase tracking-widest mb-1.5">
          Market Regime
        </div>
        <div
          className="text-3xl font-black uppercase tracking-wider"
          style={{ color: colors.hex, textShadow: `0 0 30px ${colors.hex}80` }}
        >
          {status.label}
        </div>
      </div>

      {/* Plan of Action - More visible text */}
      <div className="py-4 border-b border-white/10">
        <div className="text-[11px] text-emerald-300/80 uppercase tracking-widest mb-2 font-medium">
          Plan of Action
        </div>
        <p className="text-base text-white/95 leading-relaxed font-medium">{status.plan}</p>
      </div>

      {/* Key Drivers - scrollable, compact spacing */}
      <div className="flex-1 py-3 overflow-y-auto">
        <div className="text-[11px] text-emerald-300/80 uppercase tracking-widest mb-3 font-medium">
          Key Drivers
        </div>
        <ul className="space-y-2">
          {status.reasons.map((reason, index) => (
            <li key={index} className="flex items-start text-[13px] leading-relaxed text-gray-100">
              <span
                className="w-2 h-2 rounded-full mt-2 mr-2.5 flex-shrink-0"
                style={{
                  backgroundColor: colors.hex,
                  boxShadow: `0 0 4px ${colors.hex}80`
                }}
              />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary footer */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Analysis based on macro/micro signals</span>
          <span className="font-bold" style={{ color: colors.hex }}>
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
