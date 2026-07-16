'use client';

import { useState, useEffect, useCallback } from 'react';
import { getClaims } from '@/services/api';
import type { Claim, ClaimsFilter } from '@/types';

interface UseClaimsReturn {
  claims: Claim[];
  total: number;
  loading: boolean;
  error: string | null;
  filter: ClaimsFilter;
  setFilter: (filter: Partial<ClaimsFilter>) => void;
  retry: () => void;
}

export function useClaims(initialFilter?: ClaimsFilter): UseClaimsReturn {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<ClaimsFilter>({
    status: 'all',
    severity: 'all',
    page: 1,
    pageSize: 10,
    ...initialFilter,
  });

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getClaims(filter);
      setClaims(result.claims);
      setTotal(result.total);
    } catch (err) {
      setError('Failed to load claims. Check your connection and try again.');
      console.error('useClaims error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const setFilter = useCallback((updates: Partial<ClaimsFilter>) => {
    setFilterState((prev) => ({
      ...prev,
      ...updates,
      // Reset to page 1 on filter change (except explicit page change)
      page: updates.page ?? 1,
    }));
  }, []);

  return { claims, total, loading, error, filter, setFilter, retry: fetchClaims };
}
