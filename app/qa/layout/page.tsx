'use client';

import { useState } from 'react';
import Dashboard from '@/app/page';

export default function QALayoutPage() {
  const [opacity, setOpacity] = useState(30);
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div className="relative min-h-screen">
      {/* Dashboard */}
      <Dashboard />

      {/* Wireframe overlay */}
      {showOverlay && (
        <div
          className="fixed inset-0 pointer-events-none z-50"
          style={{ opacity: opacity / 100 }}
        >
          <img
            src="/wireframe.png"
            alt="Wireframe overlay"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Controls */}
      <div className="fixed bottom-4 right-4 z-[60] frosted-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-300">Overlay</label>
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`px-3 py-1 rounded text-sm ${
              showOverlay ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400'
            }`}
          >
            {showOverlay ? 'On' : 'Off'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-300">Opacity: {opacity}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(parseInt(e.target.value))}
            className="w-32"
          />
        </div>

        <div className="text-xs text-gray-500">
          Use this page to compare against wireframe.png
        </div>
      </div>
    </div>
  );
}
