'use client';

import { ReactNode } from 'react';

interface FrostedCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
}

export function FrostedCard({
  children,
  className = '',
  glowColor,
  onClick,
}: FrostedCardProps) {
  const glowClass = glowColor || '';
  const clickable = onClick ? 'cursor-pointer hover:bg-white/10 transition-colors' : '';

  return (
    <div
      className={`frosted-card p-4 ${glowClass} ${clickable} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export default FrostedCard;
