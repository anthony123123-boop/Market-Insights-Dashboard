import { useState, useEffect, useCallback } from 'react';
import type { MarketDataResponse } from '@/types';

const LOCAL_STORAGE_KEY = 'market-dashboard-cache';
const LOCAL_CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours for local cache

interface CachedData {
  data: MarketDataResponse;
  timestamp: number;
}

function getLocalCache(): CachedData | null {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!cached) return null;

    const parsed: CachedData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    // Return cache if not too old
    if (age < LOCAL_CACHE_MAX_AGE_MS) {
      return parsed;
    }

    // Clear stale cache
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setLocalCache(data: MarketDataResponse): void {
  try {
    const cacheEntry: CachedData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cacheEntry));
  } catch {
    // Ignore storage errors
  }
}

interface UseMarketDataResult {
  data: MarketDataResponse | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  refetch: () => Promise<void>;
}

export function useMarketData(): UseMarketDataResult {
  const [data, setData] = useState<MarketDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Determine API URL based on environment
      const apiUrl = import.meta.env.DEV
        ? '/.netlify/functions/market'
        : '/.netlify/functions/market';

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: MarketDataResponse = await response.json();

      setData(result);
      setIsStale(result.cache.state === 'STALE');

      // Save to local cache
      setLocalCache(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);

      // Try to use local cache as fallback
      const localCache = getLocalCache();
      if (localCache) {
        setData(localCache.data);
        setIsStale(true);
        setError(null); // Clear error since we have cached data
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    // First, try to load from local cache for instant display
    const localCache = getLocalCache();
    if (localCache) {
      setData(localCache.data);
      setLoading(false);
      setIsStale(true);
    }

    // Then fetch fresh data
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading: loading && !data, // Only show loading if no data at all
    error,
    isStale,
    refetch: fetchData,
  };
}

export default useMarketData;
