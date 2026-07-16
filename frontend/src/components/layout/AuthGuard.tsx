'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-canvas)]">
        {/* Premium instrument-panel styled spinner */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--border-default)]"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[var(--brand-primary)] animate-spin"></div>
        </div>
        <div className="font-display text-lg tracking-wider text-[var(--text-secondary)] uppercase" style={{ fontFamily: 'var(--font-display)' }}>
          Verifying Adjuster Session...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
