import React from 'react';

interface FrostedCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function FrostedCard({ children, className = '', glowColor }: FrostedCardProps) {
  return (
    <div
      className={`frosted-card p-4 ${className}`}
      style={glowColor ? { boxShadow: `0 0 20px ${glowColor}40` } : undefined}
    >
      {children}
    </div>
  );
}

export default FrostedCard;
