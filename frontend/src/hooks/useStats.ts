'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStats } from '@/services/api';
import type { ClaimsStats } from '@/types';

interface UseStatsReturn {
  stats: ClaimsStats | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<ClaimsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStats();
      setStats(result);
    } catch (err) {
      setError('Failed to load statistics.');
      console.error('useStats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, retry: fetchStats };
}
