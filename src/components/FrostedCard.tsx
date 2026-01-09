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
        bg-gradient-to-br from-white/[0.08] to-white/[0.02]
        backdrop-blur-xl
        border border-white/[0.08]
        shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        ${noPadding ? '' : 'p-4'}
        ${className}
      `}
      style={{
        boxShadow: glowColor
          ? `0 0 40px ${glowColor}20, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`
          : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Inner glow effect */}
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 60%)',
        }}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default FrostedCard;
