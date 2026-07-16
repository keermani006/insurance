'use client';

import { useState, useEffect, useCallback } from 'react';
import { getClaim } from '@/services/api';
import type { Claim } from '@/types';

interface UseClaimReturn {
  claim: Claim | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useClaim(id: string): UseClaimReturn {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClaim = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getClaim(id);
      setClaim(result);
    } catch (err) {
      setError('Unable to load this claim. It may have been removed or you may not have access.');
      console.error('useClaim error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchClaim();
  }, [fetchClaim, id]);

  return { claim, loading, error, retry: fetchClaim };
}
