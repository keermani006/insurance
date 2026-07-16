'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useClaims } from '@/hooks/useClaims';
import { useStats } from '@/hooks/useStats';
import { StatusChip, SeverityBadge, FraudBadge } from '@/components/ui/Badges';
import { SkeletonStatsCard, SkeletonTableRow } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/States';
import {
  formatCurrency,
  formatRelativeTime,
  formatConfidence,
} from '@/lib/utils';
import { SEVERITY_CONFIG } from '@/constants';
import type { ClaimStatus, SeverityLevel, Claim } from '@/types';

// ── Animated Count ──────────────────────────────────────────
function AnimatedCount({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-data-lg font-semibold"
      style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'var(--text-primary)' }}
    >
      {prefix}{value.toLocaleString()}{suffix}
    </motion.div>
  );
}

// ── Stats Card ──────────────────────────────────────────────
function StatsCard({
  label,
  value,
  prefix,
  suffix,
  trend,
  trendLabel,
  icon,
  accentColor,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-body-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {icon}
        </div>
      </div>
      <AnimatedCount value={value} prefix={prefix} suffix={suffix} />
      {trend !== undefined && trendLabel && (
        <div className="mt-1 text-data-sm" style={{ color: 'var(--text-muted)' }}>
          {trendLabel}
        </div>
      )}
    </div>
  );
}

// ── Claim Row ───────────────────────────────────────────────
function ClaimRow({ claim }: { claim: Claim }) {
  return (
    <tr className="group">
      <td>
        <Link
          href={`/claims/${claim.id}`}
          className="text-data-sm hover:underline"
          style={{ color: 'var(--brand-primary)' }}
        >
          {claim.claimNumber}
        </Link>
      </td>
      <td>
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {claim.vehicleInfo.year} {claim.vehicleInfo.make} {claim.vehicleInfo.model}
          </div>
          <div className="text-data-sm mt-0.5">{claim.vehicleInfo.color}</div>
        </div>
      </td>
      <td>
        <StatusChip status={claim.status} />
      </td>
      <td>
        {claim.assessment ? (
          <SeverityBadge severity={claim.assessment.severity} size="sm" />
        ) : (
          <span className="text-data-sm">—</span>
        )}
      </td>
      <td>
        {claim.assessment ? (
          <FraudBadge flagged={claim.assessment.fraud.flagged} />
        ) : (
          <span className="text-data-sm">Pending</span>
        )}
      </td>
      <td>
        {claim.assessment ? (
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(claim.assessment.estimatedCost)}
          </span>
        ) : (
          <span className="text-data-sm">—</span>
        )}
      </td>
      <td>
        {claim.assessment ? (
          <div>
            <div
              className="h-1.5 rounded-full overflow-hidden mb-1"
              style={{ backgroundColor: 'var(--bg-elevated)', width: '80px' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${claim.assessment.confidence}%`,
                  backgroundColor: SEVERITY_CONFIG[claim.assessment.severity as SeverityLevel].barColor,
                }}
              />
            </div>
            <span className="text-data-sm">{formatConfidence(claim.assessment.confidence)}</span>
          </div>
        ) : (
          <span className="text-data-sm">—</span>
        )}
      </td>
      <td>
        <span className="text-data-sm">{formatRelativeTime(claim.updatedAt)}</span>
      </td>
      <td>
        <Link
          href={`/claims/${claim.id}`}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          style={{ backgroundColor: 'var(--brand-primary-light)', color: 'var(--brand-primary)' }}
          aria-label={`View details for ${claim.claimNumber}`}
        >
          View
        </Link>
      </td>
    </tr>
  );
}

// ── Claim Card (mobile) ─────────────────────────────────────
function ClaimCard({ claim }: { claim: Claim }) {
  return (
    <Link href={`/claims/${claim.id}`} className="card p-4 block hover:border-[var(--brand-secondary)] transition-colors">
      <div className="flex items-start gap-3">
        <div
          className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card-secondary)' }}
        >
          {claim.imageUrl ? (
            <img
              src={claim.imageUrl}
              alt={`${claim.vehicleInfo.year} ${claim.vehicleInfo.make} ${claim.vehicleInfo.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
              N/A
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-data-sm">{claim.claimNumber}</span>
            <StatusChip status={claim.status} />
          </div>
          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {claim.vehicleInfo.year} {claim.vehicleInfo.make} {claim.vehicleInfo.model}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {claim.assessment && (
              <>
                <SeverityBadge severity={claim.assessment.severity} size="sm" />
                <span className="text-data-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(claim.assessment.estimatedCost)}
                </span>
                {claim.assessment.fraud.flagged && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--fraud-alert-bg)', color: 'var(--fraud-alert)' }}
                  >
                    FRAUD
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

const STATUS_FILTER_OPTIONS: Array<{ value: ClaimStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'assessed', label: 'Assessed' },
  { value: 'resolved', label: 'Resolved' },
];

const SEVERITY_FILTER_OPTIONS: Array<{ value: SeverityLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All severity' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

export default function DashboardPage() {
  const [searchInput, setSearchInput] = useState('');
  const { stats, loading: statsLoading } = useStats();
  const { claims, total, loading, error, filter, setFilter, retry } = useClaims();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({ search: searchInput });
  };

  const totalPages = Math.ceil(total / (filter.pageSize ?? 10));

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display-md mb-1">Dashboard</h1>
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            Claims overview · Updated just now
          </p>
        </div>
        <Link href="/upload" className="btn-primary">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New assessment
        </Link>
      </div>

      {/* ── Stats Row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          [0, 1, 2, 3].map((i) => <SkeletonStatsCard key={i} />)
        ) : stats ? (
          <>
            <StatsCard
              label="Total Claims"
              value={stats.total}
              trendLabel="All time"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>}
              accentColor="var(--brand-primary)"
            />
            <StatsCard
              label="Pending Review"
              value={stats.pending}
              trendLabel="Awaiting action"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              accentColor="var(--status-pending)"
            />
            <StatsCard
              label="Resolved"
              value={stats.completed}
              trendLabel="Successfully closed"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              accentColor="var(--status-resolved)"
            />
            <StatsCard
              label="Fraud Alerts"
              value={stats.fraudAlerts}
              trendLabel="Flagged for review"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
              accentColor="var(--fraud-alert)"
            />
          </>
        ) : null}
      </div>

      {/* ── Filters & Search ───────────────────────────── */}
      <div className="card mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-center border-b" style={{ borderColor: 'var(--border-default)' }}>
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[240px]" role="search">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by claim #, vehicle, VIN, or policy..."
                className="input-base pl-9"
                aria-label="Search claims"
                id="claims-search"
              />
            </div>
            <button type="submit" className="btn-primary px-4 py-2 text-sm">
              Search
            </button>
            {filter.search && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setFilter({ search: '' }); }}
                className="btn-secondary px-3 py-2 text-sm"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </form>

          {/* Status filter */}
          <select
            value={filter.status ?? 'all'}
            onChange={(e) => setFilter({ status: e.target.value as ClaimStatus | 'all' })}
            className="input-base w-auto"
            aria-label="Filter by status"
            id="status-filter"
            style={{ paddingRight: '2rem' }}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Severity filter */}
          <select
            value={filter.severity ?? 'all'}
            onChange={(e) => setFilter({ severity: e.target.value as SeverityLevel | 'all' })}
            className="input-base w-auto"
            aria-label="Filter by severity"
            id="severity-filter"
            style={{ paddingRight: '2rem' }}
          >
            {SEVERITY_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="ml-auto text-data-sm">
            {loading ? 'Loading...' : `${total} claim${total !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* ── Table (desktop) ─────────────────────────── */}
        {error ? (
          <ErrorState message={error} onRetry={retry} className="py-12" />
        ) : (
          <>
            <div className="overflow-x-auto hidden md:block">
              <table className="data-table" aria-label="Claims list">
                <thead>
                  <tr>
                    <th>Claim #</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Severity</th>
                    <th>Fraud</th>
                    <th>Est. Cost</th>
                    <th>Confidence</th>
                    <th>Updated</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [0, 1, 2, 3, 4].map((i) => <SkeletonTableRow key={i} />)
                    : claims.map((claim) => <ClaimRow key={claim.id} claim={claim} />)}
                </tbody>
              </table>

              {!loading && claims.length === 0 && (
                <EmptyState
                  title={filter.search ? 'No claims match that search' : 'No claims yet'}
                  message={
                    filter.search
                      ? `Nothing matches "${filter.search}". Try a different claim number, vehicle, or policy.`
                      : 'Claims appear here once an assessment is submitted. Start by uploading a damage photo.'
                  }
                  action={
                    filter.search
                      ? { label: 'Clear search', onClick: () => { setSearchInput(''); setFilter({ search: '' }); } }
                      : { label: 'Start first assessment', onClick: () => { window.location.href = '/upload'; } }
                  }
                  className="py-16"
                />
              )}
            </div>

            {/* ── Cards (mobile) ──────────────────────── */}
            <div className="md:hidden p-4 space-y-3">
              {loading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="card p-4 animate-skeleton rounded-xl" style={{ height: '90px' }} />
                  ))
                : claims.length === 0
                ? (
                    <EmptyState
                      title="No claims found"
                      message="Adjust your filters or start a new assessment."
                      action={{ label: 'New assessment', onClick: () => { window.location.href = '/upload'; } }}
                    />
                  )
                : claims.map((claim) => <ClaimCard key={claim.id} claim={claim} />)}
            </div>
          </>
        )}

        {/* ── Pagination ──────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <span className="text-data-sm">
              Page {filter.page ?? 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter({ page: (filter.page ?? 1) - 1 })}
                disabled={(filter.page ?? 1) <= 1}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                ← Prev
              </button>
              <button
                onClick={() => setFilter({ page: (filter.page ?? 1) + 1 })}
                disabled={(filter.page ?? 1) >= totalPages}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
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
