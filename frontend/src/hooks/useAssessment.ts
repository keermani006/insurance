'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAssessment } from '@/services/api';
import type { Assessment } from '@/types';

interface UseAssessmentReturn {
  assessment: Assessment | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useAssessment(
  claimId: string,
  imageUrl?: string
): UseAssessmentReturn {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runAssessment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAssessment(claimId, imageUrl);
      setAssessment(result);
    } catch (err) {
      setError('Assessment failed. The AI service may be unavailable. Try again in a moment.');
      console.error('useAssessment error:', err);
    } finally {
      setLoading(false);
    }
  }, [claimId, imageUrl]);

  useEffect(() => {
    if (claimId) runAssessment();
  }, [runAssessment, claimId]);

  return { assessment, loading, error, retry: runAssessment };
}
