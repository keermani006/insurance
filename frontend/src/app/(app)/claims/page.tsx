'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClaims } from '@/hooks/useClaims';
import { StatusChip, SeverityBadge, FraudBadge } from '@/components/ui/Badges';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type { ClaimStatus, SeverityLevel } from '@/types';

const STATUS_OPTIONS: Array<{ value: ClaimStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'assessed', label: 'Assessed' },
  { value: 'resolved', label: 'Resolved' },
];

export default function ClaimsPage() {
  const [searchInput, setSearchInput] = useState('');
  const { claims, total, loading, error, filter, setFilter, retry } = useClaims();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({ search: searchInput });
  };

  const totalPages = Math.ceil(total / (filter.pageSize ?? 10));

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display-md mb-1">Claims History</h1>
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            {total} claim{total !== 1 ? 's' : ''} on record
          </p>
        </div>
        <Link href="/upload" className="btn-primary">
          + New assessment
        </Link>
      </div>

      {/* ── Filter Bar ──────────────────────────────── */}
      <div className="card mb-6">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center" style={{ borderColor: 'var(--border-default)' }}>
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]" role="search">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search claims..."
                className="input-base pl-9"
                aria-label="Search claims"
                id="claims-history-search"
              />
            </div>
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
            {filter.search && (
              <button type="button" onClick={() => { setSearchInput(''); setFilter({ search: '' }); }} className="btn-secondary px-3 py-2 text-sm" aria-label="Clear search">
                Clear
              </button>
            )}
          </form>

          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter({ status: opt.value })}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: filter.status === opt.value ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                  color: filter.status === opt.value ? 'white' : 'var(--text-secondary)',
                }}
                aria-pressed={filter.status === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Claims list */}
        {error ? (
          <ErrorState message={error} onRetry={retry} className="py-12" />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {loading
              ? [0, 1, 2, 3].map((i) => (
                  <div key={i} className="p-4">
                    <SkeletonCard />
                  </div>
                ))
              : claims.length === 0
              ? (
                  <EmptyState
                    title={filter.search ? 'No claims match' : 'No claims on record'}
                    message={
                      filter.search
                        ? `Nothing found for "${filter.search}". Try a claim number, VIN, or vehicle.`
                        : 'Start a new assessment to create the first claim record.'
                    }
                    action={
                      filter.search
                        ? { label: 'Clear search', onClick: () => { setSearchInput(''); setFilter({ search: '' }); } }
                        : { label: 'Start assessment', onClick: () => { window.location.href = '/upload'; } }
                    }
                    className="py-16"
                  />
                )
              : claims.map((claim) => (
                  <Link
                    key={claim.id}
                    href={`/claims/${claim.id}`}
                    className="flex items-start gap-4 p-5 hover:bg-[var(--bg-subtle)] transition-colors block"
                  >
                    {/* Vehicle thumbnail */}
                    <div
                      className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card-secondary)' }}
                    >
                      {claim.imageUrl ? (
                        <img
                          src={claim.imageUrl}
                          alt={`${claim.vehicleInfo.year} ${claim.vehicleInfo.make} ${claim.vehicleInfo.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                          N/A
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <span className="text-data-sm">{claim.claimNumber}</span>
                        <StatusChip status={claim.status} />
                        {claim.assessment?.fraud.flagged && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--fraud-alert-bg)', color: 'var(--fraud-alert)' }}
                          >
                            FRAUD FLAGGED
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                        {claim.vehicleInfo.year} {claim.vehicleInfo.make} {claim.vehicleInfo.model} · {claim.vehicleInfo.color}
                      </div>
                      <div className="text-data-sm mb-2">
                        Policy: {claim.policyNumber} · VIN: {claim.vehicleInfo.vin.slice(-8)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {claim.assessment && (
                          <>
                            <SeverityBadge severity={claim.assessment.severity} size="sm" />
                            <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                              {formatCurrency(claim.assessment.estimatedCost)}
                            </span>
                            <span className="text-data-sm">{claim.assessment.confidence}% confidence</span>
                          </>
                        )}
                        <span className="text-data-sm ml-auto">{formatRelativeTime(claim.updatedAt)}</span>
                      </div>
                    </div>

                    <svg className="w-5 h-5 flex-shrink-0 self-center" style={{ color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <span className="text-data-sm">Page {filter.page ?? 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter({ page: (filter.page ?? 1) - 1 })}
                disabled={(filter.page ?? 1) <= 1}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => setFilter({ page: (filter.page ?? 1) + 1 })}
                disabled={(filter.page ?? 1) >= totalPages}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
