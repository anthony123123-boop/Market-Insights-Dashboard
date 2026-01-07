'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltip component using Portal to escape frosted-glass stacking contexts
 * The backdrop-filter on frosted-cards creates a new stacking context,
 * so we must portal to body to ensure visibility above all cards.
 */
export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Only render portal after component mounts (SSR safety)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      let x = rect.left + scrollX + rect.width / 2;
      let y = rect.top + scrollY;

      // Adjust based on position
      switch (position) {
        case 'top':
          y = rect.top + scrollY - 8;
          break;
        case 'bottom':
          y = rect.bottom + scrollY + 8;
          break;
        case 'left':
          x = rect.left + scrollX - 8;
          y = rect.top + scrollY + rect.height / 2;
          break;
        case 'right':
          x = rect.right + scrollX + 8;
          y = rect.top + scrollY + rect.height / 2;
          break;
      }

      setCoords({ x, y });
    }
    setIsVisible(true);
  };

  const getTooltipStyle = (): React.CSSProperties => {
    switch (position) {
      case 'top':
        return {
          left: coords.x,
          top: coords.y,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          left: coords.x,
          top: coords.y,
          transform: 'translate(-50%, 0)',
        };
      case 'left':
        return {
          left: coords.x,
          top: coords.y,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          left: coords.x,
          top: coords.y,
          transform: 'translate(0, -50%)',
        };
    }
  };

  const getArrowClass = (): string => {
    switch (position) {
      case 'top':
        return 'top-full -translate-y-1 left-1/2 -translate-x-1/2 border-b border-r';
      case 'bottom':
        return 'bottom-full translate-y-1 left-1/2 -translate-x-1/2 border-t border-l';
      case 'left':
        return 'left-full -translate-x-1 top-1/2 -translate-y-1/2 border-t border-r';
      case 'right':
        return 'right-full translate-x-1 top-1/2 -translate-y-1/2 border-b border-l';
    }
  };

  const tooltipContent = isVisible && mounted ? (
    createPortal(
      <div
        className="fixed z-[9999] px-3 py-2 text-sm bg-gray-900 border border-white/20 rounded-lg shadow-xl max-w-xs whitespace-normal pointer-events-none"
        style={getTooltipStyle()}
      >
        {content}
        {/* Arrow */}
        <div
          className={`absolute w-2 h-2 bg-gray-900 border-white/20 transform rotate-45 ${getArrowClass()}`}
        />
      </div>,
      document.body
    )
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children || (
          <Info className="w-4 h-4 text-gray-400 hover:text-gray-200 cursor-help transition-colors" />
        )}
      </div>
      {tooltipContent}
    </>
  );
}

export default Tooltip;
