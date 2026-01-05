'use client';

import { X } from 'lucide-react';
import type { DashboardSettings } from '@/lib/types';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DashboardSettings;
  onSettingsChange: (settings: DashboardSettings) => void;
}

export function SettingsSidebar({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsSidebarProps) {
  if (!isOpen) return null;

  const updateSetting = <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updateTimeframe = (
    timeframe: 'short' | 'medium' | 'long',
    field: 'min' | 'max',
    value: number
  ) => {
    const newTimeframes = {
      ...settings.timeframes,
      [timeframe]: {
        ...settings.timeframes[timeframe],
        [field]: value,
      },
    };
    onSettingsChange({ ...settings, timeframes: newTimeframes });
  };

  const updateViewMoreCategory = (
    category: keyof DashboardSettings['viewMoreCategories'],
    value: boolean
  ) => {
    onSettingsChange({
      ...settings,
      viewMoreCategories: {
        ...settings.viewMoreCategories,
        [category]: value,
      },
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-gray-900 border-r border-white/10 z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Density */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Density
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('density', 'comfortable')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settings.density === 'comfortable'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Comfortable
              </button>
              <button
                onClick={() => updateSetting('density', 'compact')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settings.density === 'compact'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Compact
              </button>
            </div>
          </div>

          {/* Refresh Interval */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Refresh Interval (minutes)
            </label>
            <div className="flex flex-wrap gap-2">
              {[10, 12, 15, 20, 30].map((interval) => (
                <button
                  key={interval}
                  onClick={() => updateSetting('refreshInterval', interval as 10 | 12 | 15 | 20 | 30)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.refreshInterval === interval
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {interval}
                </button>
              ))}
            </div>
          </div>

          {/* Weight Preset */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Weight Preset
            </label>
            <select
              value={settings.weightPreset}
              onChange={(e) => updateSetting('weightPreset', e.target.value as DashboardSettings['weightPreset'])}
              className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="balanced">Balanced</option>
              <option value="risk-off-sensitive">Risk-Off Sensitive</option>
              <option value="trend-following">Trend-Following</option>
            </select>
          </div>

          {/* Timeframes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Timeframes (trading days)
            </label>

            {/* Short Term */}
            <div className="mb-3">
              <span className="text-xs text-gray-400">Short Term</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.timeframes.short.min}
                  onChange={(e) => updateTimeframe('short', 'min', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-1 bg-white/10 border border-white/10 rounded text-white text-sm"
                  placeholder="Min"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.timeframes.short.max}
                  onChange={(e) => updateTimeframe('short', 'max', Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                  className="w-full px-3 py-1 bg-white/10 border border-white/10 rounded text-white text-sm"
                  placeholder="Max"
                />
              </div>
            </div>

            {/* Medium Term */}
            <div className="mb-3">
              <span className="text-xs text-gray-400">Medium Term</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={settings.timeframes.medium.min}
                  onChange={(e) => updateTimeframe('medium', 'min', Math.max(5, Math.min(60, parseInt(e.target.value) || 10)))}
                  className="w-full px-3 py-1 bg-white/10 border border-white/10 rounded text-white text-sm"
                  placeholder="Min"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="number"
                  min="10"
                  max="90"
                  value={settings.timeframes.medium.max}
                  onChange={(e) => updateTimeframe('medium', 'max', Math.max(10, Math.min(90, parseInt(e.target.value) || 30)))}
                  className="w-full px-3 py-1 bg-white/10 border border-white/10 rounded text-white text-sm"
                  placeholder="Max"
                />
              </div>
            </div>

            {/* Long Term */}
            <div>
              <span className="text-xs text-gray-400">Long Term</span>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  min="20"
                  max="252"
                  value={settings.timeframes.long.min}
                  onChange={(e) => updateTimeframe('long', 'min', Math.max(20, Math.min(252, parseInt(e.target.value) || 60)))}
                  className="w-full px-3 py-1 bg-white/10 border border-white/10 rounded text-white text-sm"
                  placeholder="Min"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="number"
                  min="60"
                  max="504"
                  value={settings.timeframes.long.max}
                  onChange={(e) => updateTimeframe('long', 'max', Math.max(60, Math.min(504, parseInt(e.target.value) || 252)))}
                  className="w-full px-3 py-1 bg-white/10 border border-white/10 rounded text-white text-sm"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          {/* View More Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              View More Categories
            </label>
            <div className="space-y-2">
              {Object.entries(settings.viewMoreCategories).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => updateViewMoreCategory(key as keyof DashboardSettings['viewMoreCategories'], e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SettingsSidebar;
