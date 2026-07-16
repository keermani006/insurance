'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    // Check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Registration successful! Check your email for confirmation (if email confirmation is enabled), or log in directly.',
        });
        setIsRegistering(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An authentication error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-canvas)]">
      <div
        className="w-full max-w-md card overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
          boxShadow: '0 8px 32px rgba(37,99,235,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header chrome */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            </div>
            <span className="text-data-sm ml-2" style={{ fontFamily: 'var(--font-mono)' }}>
              {isRegistering ? 'CREATING_SESSION' : 'AUTHENTICATE_ADJUSTER'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-primary)' }} />
            <span className="text-data-sm" style={{ fontFamily: 'var(--font-mono)' }}>SECURE</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-display text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                ClaimSight
              </span>
            </Link>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isRegistering
                ? 'Create a new adjuster account to process claims.'
                : 'Sign in to access your claims adjuster dashboard.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Adjuster Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adjuster@claimsight.io"
                className="w-full px-4 py-3 rounded-lg border text-sm transition-all outline-none"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border text-sm transition-all outline-none"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {message && (
              <div
                className="p-3 rounded text-xs border"
                style={{
                  backgroundColor: message.type === 'error' ? 'var(--fraud-alert-bg)' : 'var(--fraud-clear-bg)',
                  borderColor: message.type === 'error' ? 'var(--fraud-alert)40' : 'var(--fraud-clear)40',
                  color: message.type === 'error' ? 'var(--fraud-alert)' : 'var(--fraud-clear)',
                }}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isRegistering ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Toggle link */}
          <div className="mt-6 text-center text-xs">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage(null);
              }}
              style={{ color: 'var(--brand-primary)' }}
              className="hover:underline font-medium"
            >
              {isRegistering
                ? 'Already have an account? Sign In'
                : 'Need an account? Register as Adjuster'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
