import { ReactNode } from 'react';

interface FrostedCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  noPadding?: boolean;
}

export function FrostedCard({ children, className = '', glowColor, noPadding = false }: FrostedCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-gradient-to-br from-neutral-800/70 via-zinc-900/85 to-neutral-950/90
        backdrop-blur-2xl
        border border-emerald-200/10
        ${noPadding ? '' : 'p-4'}
        ${className}
      `}
      style={{
        boxShadow: glowColor
          ? `0 0 50px ${glowColor}40, 0 12px 30px rgba(2,6,23,0.65), inset 0 1px 0 rgba(255,255,255,0.08)`
          : '0 12px 30px rgba(2,6,23,0.65), 0 0 44px rgba(34,197,94,0.24), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Top highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.55) 50%, transparent 100%)',
        }}
      />
      {/* Inner glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 65%)',
        }}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default FrostedCard;
