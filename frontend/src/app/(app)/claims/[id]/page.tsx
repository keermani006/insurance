'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useClaim } from '@/hooks/useClaim';
import { StatusChip, SeverityBadge, FraudBadge } from '@/components/ui/Badges';
import { ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  formatCurrency,
  formatConfidence,
  formatDateTime,
  formatTimestamp,
} from '@/lib/utils';
import { SEVERITY_CONFIG, STATUS_CONFIG, DAMAGE_TYPE_LABELS } from '@/constants';
import type { ClaimStatus } from '@/types';

// ── Status Timeline ─────────────────────────────────────────
const TIMELINE_STEPS: ClaimStatus[] = ['submitted', 'under_review', 'assessed', 'resolved'];

function StatusTimeline({ currentStatus, history }: {
  currentStatus: ClaimStatus;
  history: { status: ClaimStatus; timestamp: string; note?: string; actor?: string }[];
}) {
  const currentStep = STATUS_CONFIG[currentStatus].step;

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, i) => {
        const config = STATUS_CONFIG[step];
        const stepNum = i + 1;
        const isComplete = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;
        const isPending = currentStep < stepNum;
        const historyEntry = history.find((h) => h.status === step);

        return (
          <div key={step} className="flex gap-4">
            {/* Step indicator column */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 z-10"
                style={{
                  backgroundColor: isComplete
                    ? 'var(--fraud-clear)'
                    : isCurrent
                    ? 'var(--brand-primary)'
                    : 'var(--bg-elevated)',
                  color: isPending ? 'var(--text-muted)' : 'white',
                  border: isPending ? '2px solid var(--border-default)' : 'none',
                  boxShadow: isCurrent ? '0 0 0 4px var(--brand-primary-light)' : 'none',
                }}
                aria-label={`Step ${stepNum}: ${config.label} — ${isComplete ? 'complete' : isCurrent ? 'current' : 'pending'}`}
              >
                {isComplete ? (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 8.5l3.5 3.5 7-7" />
                  </svg>
                ) : (
                  <span className="text-xs font-bold">{String(stepNum).padStart(2, '0')}</span>
                )}
              </motion.div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div
                  className="w-0.5 flex-1 my-1 min-h-[24px]"
                  style={{
                    backgroundColor: isComplete ? 'var(--fraud-clear)' : 'var(--border-default)',
                    transition: 'background-color 0.3s',
                  }}
                />
              )}
            </div>

            {/* Step content */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`pb-6 ${i === TIMELINE_STEPS.length - 1 ? 'pb-0' : ''}`}
              style={{ flex: 1 }}
            >
              <div className="flex items-center gap-2 mb-0.5 pt-1.5">
                <span
                  className="text-sm font-semibold"
                  style={{ color: isCurrent ? 'var(--brand-primary)' : isPending ? 'var(--text-muted)' : 'var(--text-primary)' }}
                >
                  {config.label}
                </span>
                {isCurrent && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--brand-primary-light)', color: 'var(--brand-primary)' }}
                  >
                    CURRENT
                  </span>
                )}
              </div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                {config.description}
              </p>
              {historyEntry && (
                <div className="text-data-sm">
                  {formatDateTime(historyEntry.timestamp)}
                  {historyEntry.actor && ` · ${historyEntry.actor}`}
                  {historyEntry.note && (
                    <div className="mt-0.5 text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                      {historyEntry.note}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClaimDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { claim, loading, error, retry } = useClaim(id);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <Skeleton className="w-full aspect-video rounded-xl" />
            <div className="card p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="card p-5 space-y-3">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <ErrorState
          title="Claim not found"
          message={error ?? "This claim doesn't exist or has been removed."}
          onRetry={retry}
        />
      </div>
    );
  }

  const assessment = claim.assessment;
  const sevConfig = assessment ? SEVERITY_CONFIG[assessment.severity] : null;

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* ── Header ──────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/claims" className="text-data-sm hover:underline" style={{ color: 'var(--brand-primary)' }}>CLAIMS</Link>
          <span style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="text-data-sm">{claim.claimNumber}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-display-md mb-1">{claim.claimNumber}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status={claim.status} />
              {assessment?.fraud.flagged && <FraudBadge flagged={true} riskScore={assessment.fraud.riskScore} />}
              <span className="text-data-sm">Policy: {claim.policyNumber}</span>
            </div>
          </div>
          {assessment && (
            <Link href={`/results/${id}`} className="btn-primary">
              View full assessment →
            </Link>
          )}
        </div>
      </div>

      {/* ── Main Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="xl:col-span-2 space-y-5">
          {/* Vehicle image */}
          <div className="card overflow-hidden">
            <div className="relative" style={{ aspectRatio: '16/9' }}>
              {claim.imageUrl ? (
                <img
                  src={claim.imageUrl}
                  alt={`${claim.vehicleInfo.year} ${claim.vehicleInfo.make} ${claim.vehicleInfo.model} — damage photo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-500 gap-2"
                  style={{ backgroundColor: 'var(--bg-card-secondary)', borderColor: 'var(--border-default)' }}
                >
                  <span className="text-zinc-500 text-sm font-medium">No image available</span>
                </div>
              )}
              {assessment && (
                <div className="absolute top-3 left-3">
                  <SeverityBadge severity={assessment.severity} />
                </div>
              )}
            </div>
          </div>

          {/* Vehicle info */}
          <div className="card p-5">
            <h2 className="text-heading-sm mb-4">Vehicle Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Make', value: claim.vehicleInfo.make },
                { label: 'Model', value: claim.vehicleInfo.model },
                { label: 'Year', value: String(claim.vehicleInfo.year) },
                { label: 'Color', value: claim.vehicleInfo.color },
                { label: 'VIN', value: claim.vehicleInfo.vin, mono: true },
                { label: 'Policy', value: claim.policyNumber, mono: true },
              ].map((field) => (
                <div key={field.label}>
                  <div className="text-data-sm mb-0.5">{field.label}</div>
                  <div
                    className="text-sm font-medium"
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: field.mono ? 'var(--font-mono)' : 'inherit',
                      fontSize: field.mono ? '0.75rem' : undefined,
                    }}
                  >
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment summary */}
          {assessment && sevConfig && (
            <div className="card p-5">
              <h2 className="text-heading-sm mb-4">Assessment Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-data-sm mb-0.5">Damage Type</div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {DAMAGE_TYPE_LABELS[assessment.damageType]}
                  </div>
                </div>
                <div>
                  <div className="text-data-sm mb-0.5">Severity</div>
                  <SeverityBadge severity={assessment.severity} size="sm" />
                </div>
                <div>
                  <div className="text-data-sm mb-0.5">Est. Cost</div>
                  <div className="text-sm font-semibold" style={{ color: sevConfig.color, fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(assessment.estimatedCost)}
                  </div>
                </div>
                <div>
                  <div className="text-data-sm mb-0.5">Confidence</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {formatConfidence(assessment.confidence)}
                  </div>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mb-4">
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: sevConfig.barColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${assessment.confidence}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>

              <p className="text-body-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.65' }}>
                {assessment.explanation}
              </p>

              {/* Damage zones */}
              {assessment.annotationPoints.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <div className="text-data-sm mb-2">Detected Zones</div>
                  <div className="space-y-2">
                    {assessment.annotationPoints.map((pt, i) => (
                      <div key={pt.id} className="flex items-center gap-3">
                        <span className="text-data-sm w-6">{String(i + 1).padStart(2, '0')}</span>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SEVERITY_CONFIG[pt.severity].color }}
                        />
                        <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{pt.label}</span>
                        <SeverityBadge severity={pt.severity} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fraud detail */}
          {assessment && (
            <div className="card p-5">
              <h2 className="text-heading-sm mb-3">Fraud Assessment</h2>
              <FraudBadge flagged={assessment.fraud.flagged} riskScore={assessment.fraud.riskScore} className="mb-3" />
              {assessment.fraud.flagged && assessment.fraud.reasons.length > 0 && (
                <div
                  className="rounded-lg p-4 space-y-2"
                  style={{ backgroundColor: 'var(--fraud-alert-bg)', border: '1px solid var(--fraud-alert-border)' }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fraud-alert)' }}>
                    Fraud Indicators
                  </div>
                  {assessment.fraud.reasons.map((reason) => (
                    <div key={reason} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fraud-alert)' }}>
                      <span className="mt-1 flex-shrink-0">·</span>
                      {reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Status timeline */}
          <div className="card p-5">
            <h2 className="text-heading-sm mb-5">Claim Progress</h2>
            <StatusTimeline currentStatus={claim.status} history={claim.statusHistory} />
          </div>

          {/* Adjuster info */}
          {claim.assignedAdjuster && (
            <div className="card p-5">
              <h2 className="text-heading-sm mb-3">Assigned Adjuster</h2>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                  aria-hidden="true"
                >
                  {claim.assignedAdjuster.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {claim.assignedAdjuster}
                  </div>
                  <div className="text-data-sm">Senior Claims Adjuster</div>
                </div>
              </div>
            </div>
          )}

          {/* Status history log */}
          <div className="card p-5">
            <h2 className="text-heading-sm mb-4">Activity Log</h2>
            <div className="space-y-4">
              {[...claim.statusHistory].reverse().map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: STATUS_CONFIG[entry.status].color }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {STATUS_CONFIG[entry.status].label}
                      </span>
                      {entry.actor && (
                        <span className="text-data-sm">by {entry.actor}</span>
                      )}
                    </div>
                    {entry.note && (
                      <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-secondary)' }}>
                        {entry.note}
                      </p>
                    )}
                    <div className="text-data-sm mt-0.5">
                      {formatDateTime(entry.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div className="card p-5">
            <div className="space-y-2">
              <div>
                <div className="text-data-sm mb-0.5">Filed</div>
                <div className="text-sm font-mono" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  {formatTimestamp(claim.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-data-sm mb-0.5">Last Updated</div>
                <div className="text-sm font-mono" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  {formatTimestamp(claim.updatedAt)}
                </div>
              </div>
              {assessment && (
                <div>
                  <div className="text-data-sm mb-0.5">Assessed</div>
                  <div className="text-sm font-mono" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {formatTimestamp(assessment.assessedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
