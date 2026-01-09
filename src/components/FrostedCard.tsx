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
        bg-gradient-to-br from-slate-800/60 to-slate-900/80
        backdrop-blur-xl
        border border-cyan-500/10
        ${noPadding ? '' : 'p-4'}
        ${className}
      `}
      style={{
        boxShadow: glowColor
          ? `0 0 50px ${glowColor}25, 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`
          : '0 4px 20px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,212,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Top highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.3) 50%, transparent 100%)',
        }}
      />
      {/* Inner glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 50%)',
        }}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default FrostedCard;
