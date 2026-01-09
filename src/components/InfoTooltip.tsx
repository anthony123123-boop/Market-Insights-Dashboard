import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ content, position = 'bottom' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = 280;
      const tooltipHeight = 120;
      const padding = 8;

      let top = 0;
      let left = 0;

      // Calculate position based on preference, but adjust if would go off-screen
      if (position === 'bottom' || position === 'top') {
        left = rect.left + rect.width / 2 - tooltipWidth / 2;

        // Adjust if going off left edge
        if (left < padding) left = padding;
        // Adjust if going off right edge
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = window.innerWidth - tooltipWidth - padding;
        }

        if (position === 'bottom') {
          top = rect.bottom + 8;
          // If would go off bottom, show on top instead
          if (top + tooltipHeight > window.innerHeight - padding) {
            top = rect.top - tooltipHeight - 8;
          }
        } else {
          top = rect.top - tooltipHeight - 8;
          // If would go off top, show on bottom instead
          if (top < padding) {
            top = rect.bottom + 8;
          }
        }
      } else {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;

        if (position === 'right') {
          left = rect.right + 8;
        } else {
          left = rect.left - tooltipWidth - 8;
        }
      }

      setTooltipPos({ top, left });
    }
  }, [isVisible, position]);

  return (
    <div className="relative inline-flex">
      {/* Info icon */}
      <button
        ref={buttonRef}
        className="w-4 h-4 rounded-full bg-white/10 hover:bg-cyan-500/30 flex items-center justify-center transition-colors cursor-help"
        aria-label="More information"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <svg
          className="w-2.5 h-2.5 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Tooltip rendered via portal to avoid clipping - DARK solid background */}
      {isVisible && createPortal(
        <div
          className="fixed w-[280px] px-4 py-3 text-xs text-gray-100 rounded-lg shadow-2xl border border-cyan-500/50"
          style={{
            zIndex: 99999,
            top: tooltipPos.top,
            left: tooltipPos.left,
            backgroundColor: '#0f1419',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 0 40px rgba(6, 182, 212, 0.15)',
          }}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          <div className="whitespace-pre-line leading-relaxed">{content}</div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default InfoTooltip;
