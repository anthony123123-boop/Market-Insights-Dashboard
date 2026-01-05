'use client';

import { ReactNode, useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (
        <Info className="w-4 h-4 text-gray-400 hover:text-gray-200 cursor-help transition-colors" />
      )}

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} px-3 py-2 text-sm bg-gray-900 border border-white/20 rounded-lg shadow-xl max-w-xs whitespace-normal`}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 border-white/20 transform rotate-45 ${
              position === 'top'
                ? 'top-full -translate-y-1 left-1/2 -translate-x-1/2 border-b border-r'
                : position === 'bottom'
                ? 'bottom-full translate-y-1 left-1/2 -translate-x-1/2 border-t border-l'
                : position === 'left'
                ? 'left-full -translate-x-1 top-1/2 -translate-y-1/2 border-t border-r'
                : 'right-full translate-x-1 top-1/2 -translate-y-1/2 border-b border-l'
            }`}
          />
        </div>
      )}
    </div>
  );
}

export default Tooltip;
