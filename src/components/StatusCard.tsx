
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
      <div className="flex-1 flex flex-col">
        {/* Label */}
        <div className="text-center mb-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
            Market Regime
          </div>
          <div
            className={`text-2xl font-bold uppercase tracking-wider ${colors.text}`}
            style={{ textShadow: colors.glow }}
          >
            {status.label}
          </div>
        </div>

        {/* Plan */}
        <div className="mb-4 p-3 rounded-lg bg-white/5">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
            Plan of Action
          </div>
          <p className="text-sm text-gray-200">{status.plan}</p>
        </div>

        {/* Reasons */}
        <div className="flex-1">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            Key Drivers
          </div>
          <ul className="space-y-1.5">
            {status.reasons.map((reason, index) => (
              <li key={index} className="flex items-start text-sm">
                <span className="text-gray-500 mr-2">•</span>
                <span className="text-gray-300">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FrostedCard>
  );
}

export default StatusCard;
