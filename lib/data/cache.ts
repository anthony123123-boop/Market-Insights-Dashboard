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

/**
 * Last-known-good cache entry
 * Stores the most recent successful fetch result
 */
interface LKGEntry<T> {
  data: T;
  timestamp: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private inFlight: Map<string, Promise<unknown>> = new Map();
  private lastKnownGood: Map<string, LKGEntry<unknown>> = new Map();

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
   * Get last-known-good value for a key
   */
  getLastKnownGood<T>(key: string): { data: T | null; ageSeconds: number } {
    const entry = this.lastKnownGood.get(key) as LKGEntry<T> | undefined;
    if (!entry) {
      return { data: null, ageSeconds: 0 };
    }
    const ageSeconds = Math.floor((Date.now() - entry.timestamp) / 1000);
    return { data: entry.data, ageSeconds };
  }

  /**
   * Set last-known-good value
   */
  setLastKnownGood<T>(key: string, data: T): void {
    this.lastKnownGood.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Single-flight fetch - deduplicates concurrent requests
   * With last-known-good fallback on fetch failure
   */
  async singleFlight<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<{ data: T; state: CacheState; ageSeconds: number; isStale?: boolean }> {
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
      // Only update cache and LKG if data is valid (not null)
      if (data !== null) {
        this.set(key, data, options);
        this.setLastKnownGood(key, data);
      }
      return { data, state: 'LIVE', ageSeconds: 0 };
    } catch (error) {
      // On fetch failure, try to return last-known-good value
      const lkg = this.getLastKnownGood<T>(key);
      if (lkg.data !== null) {
        console.warn(`[Cache] Fetch failed for ${key}, using LKG (${lkg.ageSeconds}s old)`);
        return {
          data: lkg.data,
          state: 'STALE',
          ageSeconds: lkg.ageSeconds,
          isStale: true,
        };
      }
      // If no LKG, check stale cache
      const stale = this.get<T>(key);
      if (stale.data !== null) {
        console.warn(`[Cache] Fetch failed for ${key}, using stale cache (${stale.ageSeconds}s old)`);
        return {
          data: stale.data,
          state: 'STALE',
          ageSeconds: stale.ageSeconds,
          isStale: true,
        };
      }
      // No fallback available
      throw error;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Single-flight with automatic LKG fallback on null result
   * Used for quote fetches where null means "no data"
   */
  async singleFlightWithLKG<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    options: CacheOptions
  ): Promise<{ data: T | null; state: CacheState; ageSeconds: number; isStale?: boolean }> {
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

      // If fetch succeeded with data, update cache and LKG
      if (data !== null) {
        this.set(key, data, options);
        this.setLastKnownGood(key, data);
        return { data, state: 'LIVE', ageSeconds: 0 };
      }

      // Fetch returned null - try LKG fallback
      const lkg = this.getLastKnownGood<T>(key);
      if (lkg.data !== null) {
        console.warn(`[Cache] Fetch returned null for ${key}, using LKG (${lkg.ageSeconds}s old)`);
        return {
          data: lkg.data,
          state: 'STALE',
          ageSeconds: lkg.ageSeconds,
          isStale: true,
        };
      }

      // No LKG available
      return { data: null, state: 'LIVE', ageSeconds: 0 };
    } catch (error) {
      // On fetch error, try LKG
      const lkg = this.getLastKnownGood<T>(key);
      if (lkg.data !== null) {
        console.warn(`[Cache] Fetch error for ${key}, using LKG (${lkg.ageSeconds}s old)`);
        return {
          data: lkg.data,
          state: 'STALE',
          ageSeconds: lkg.ageSeconds,
          isStale: true,
        };
      }
      // No fallback - return null (don't throw)
      console.error(`[Cache] Fetch error for ${key}, no LKG available:`, error);
      return { data: null, state: 'LIVE', ageSeconds: 0 };
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
  getStats(): { size: number; keys: string[]; lkgSize: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      lkgSize: this.lastKnownGood.size,
    };
  }
}

// Singleton instance
export const cache = new InMemoryCache();

/**
 * Cache TTL constants
 * Swing/Long-term tool: 60-minute refresh cycle
 */
export const CACHE_TTL = {
  // Main market data cache: 60 minutes for swing/long-term analysis
  QUOTES: 60 * 60 * 1000, // 60 minutes for quotes
  HISTORICAL: 60 * 60 * 1000, // 60 minutes for historical data
  SYMBOL_RESOLUTION: 24 * 60 * 60 * 1000, // 24 hours for symbol resolution
  ANALYSIS: 60 * 60 * 1000, // 60 minutes for analysis results
  FX_RATE: 60 * 60 * 1000, // 60 minutes for FX rates
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
