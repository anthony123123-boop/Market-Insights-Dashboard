import type { CacheState } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttlMs: number;
  staleTtlMs?: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private inFlight: Map<string, Promise<unknown>> = new Map();

  /**
   * Get item from cache
   */
  get<T>(key: string): { data: T | null; state: CacheState; ageSeconds: number } {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return { data: null, state: 'LIVE', ageSeconds: 0 };
    }

    const now = Date.now();
    const ageMs = now - entry.timestamp;
    const ageSeconds = Math.floor(ageMs / 1000);

    if (now < entry.expiresAt) {
      return { data: entry.data, state: 'CACHED', ageSeconds };
    }

    // Data exists but is expired - it's stale
    return { data: entry.data, state: 'STALE', ageSeconds };
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, options: CacheOptions): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + options.ttlMs,
    });
  }

  /**
   * Single-flight fetch - deduplicates concurrent requests
   */
  async singleFlight<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<{ data: T; state: CacheState; ageSeconds: number }> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached.data !== null && cached.state === 'CACHED') {
      return { data: cached.data, state: 'CACHED', ageSeconds: cached.ageSeconds };
    }

    // Check if there's already a request in flight
    const inFlightPromise = this.inFlight.get(key);
    if (inFlightPromise) {
      const data = await inFlightPromise as T;
      const afterFetch = this.get<T>(key);
      return {
        data,
        state: 'CACHED',
        ageSeconds: afterFetch.ageSeconds
      };
    }

    // Start new fetch
    const fetchPromise = fetcher();
    this.inFlight.set(key, fetchPromise);

    try {
      const data = await fetchPromise;
      this.set(key, data, options);
      return { data, state: 'LIVE', ageSeconds: 0 };
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Clear specific key
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const cache = new InMemoryCache();

// Cache TTL constants
export const CACHE_TTL = {
  QUOTES: 60 * 1000, // 1 minute for quotes
  HISTORICAL: 15 * 60 * 1000, // 15 minutes for historical data
  SYMBOL_RESOLUTION: 24 * 60 * 60 * 1000, // 24 hours for symbol resolution
  ANALYSIS: 5 * 60 * 1000, // 5 minutes for analysis results
  FX_RATE: 5 * 60 * 1000, // 5 minutes for FX rates
} as const;

/**
 * Generate cache key with settings
 */
export function generateCacheKey(
  base: string,
  settings?: {
    refreshInterval?: number;
    timeframes?: { short: { min: number; max: number }; medium: { min: number; max: number }; long: { min: number; max: number } };
    weightPreset?: string;
  }
): string {
  if (!settings) return base;

  const parts = [base];
  if (settings.refreshInterval) parts.push(`ri:${settings.refreshInterval}`);
  if (settings.weightPreset) parts.push(`wp:${settings.weightPreset}`);
  if (settings.timeframes) {
    parts.push(`tf:${settings.timeframes.short.min}-${settings.timeframes.short.max}`);
    parts.push(`${settings.timeframes.medium.min}-${settings.timeframes.medium.max}`);
    parts.push(`${settings.timeframes.long.min}-${settings.timeframes.long.max}`);
  }

  return parts.join('|');
}
