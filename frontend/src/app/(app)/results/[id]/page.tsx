'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useAssessment } from '@/hooks/useAssessment';
import { useClaim } from '@/hooks/useClaim';
import { StatusChip, SeverityBadge, FraudBadge } from '@/components/ui/Badges';
import { ErrorState } from '@/components/ui/States';
import { SkeletonResultsPage } from '@/components/ui/Skeleton';
import {
  formatCurrency,
  formatConfidence,
  formatTimestamp,
  formatDateTime,
  formatFraudRisk,
} from '@/lib/utils';
import { SEVERITY_CONFIG, DAMAGE_TYPE_LABELS } from '@/constants';
import type { AnnotationPoint } from '@/types';

// ── Annotation Dot ──────────────────────────────────────────
function AnnotationDot({
  point,
  delay,
  visible,
}: {
  point: AnnotationPoint;
  delay: number;
  visible: boolean;
}) {
  const config = SEVERITY_CONFIG[point.severity];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ delay, duration: 0.4, type: 'spring', stiffness: 300 }}
          className="absolute group cursor-pointer"
          style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
          aria-label={`Damage zone: ${point.label} (${config.label})`}
        >
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              width: '32px',
              height: '32px',
              transform: 'translate(-50%, -50%) translate(6px, 6px)',
              border: `2px solid ${config.color}`,
              animation: 'annotation-pulse 2s ease-in-out infinite',
              opacity: 0.5,
            }}
          />
          {/* Expanding ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: '20px',
              height: '20px',
              transform: 'translate(-50%, -50%) translate(3px, 3px)',
              border: `1.5px solid ${config.color}`,
              animation: 'annotation-ring-expand 2s ease-out infinite',
              opacity: 0.4,
            }}
          />
          {/* Solid dot */}
          <div
            className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: config.color }}
          />
          {/* Tooltip */}
          <div
            className="absolute bottom-full left-1/2 mb-2 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              transform: 'translateX(-50%)',
              backgroundColor: config.color,
              color: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {point.label}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Confidence Bar ──────────────────────────────────────────
function ConfidenceBar({
  value,
  animate: shouldAnimate,
  color,
}: {
  value: number;
  animate: boolean;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>AI Confidence</span>
        <span className="text-data-lg" style={{ color, fontFamily: 'var(--font-mono)' }}>
          {formatConfidence(value)}
        </span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Assessment confidence: ${formatConfidence(value)}`}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: shouldAnimate ? `${value}%` : 0 }}
          transition={{ duration: 1.2, delay: 1.4, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

// ── Main Results Page ───────────────────────────────────────
interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ResultsPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const imageUrl = searchParams.get('imageUrl') ?? undefined;

  const { assessment, loading, error, retry } = useAssessment(id, imageUrl);

  // For existing claims with pre-baked assessments, fall back to claim data
  const { claim } = useClaim(id);
  const effectiveAssessment = assessment ?? claim?.assessment ?? null;
  const effectiveImageUrl = imageUrl ?? claim?.imageUrl ?? null;

  const [scanComplete, setScanComplete] = useState(false);
  const [annotationsVisible, setAnnotationsVisible] = useState(false);

  // Trigger annotation reveals after scan completes
  useEffect(() => {
    if (!loading && effectiveAssessment) {
      const scanTimer = setTimeout(() => setScanComplete(true), 1400);
      const annotTimer = setTimeout(() => setAnnotationsVisible(true), 1500);
      return () => {
        clearTimeout(scanTimer);
        clearTimeout(annotTimer);
      };
    }
  }, [loading, effectiveAssessment]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-display-md mb-2">Running assessment...</h1>
          <p className="text-body-md" style={{ color: 'var(--text-secondary)' }}>
            The AI is scanning the image for damage patterns.
          </p>
        </div>
        <SkeletonResultsPage />
      </div>
    );
  }

  if (error || !effectiveAssessment) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <ErrorState
          title="Assessment failed"
          message={error ?? 'No assessment data available for this claim.'}
          onRetry={retry}
        />
      </div>
    );
  }

  const sevConfig = SEVERITY_CONFIG[effectiveAssessment.severity];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* ── Page Header ──────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/claims" className="text-data-sm hover:underline" style={{ color: 'var(--brand-primary)' }}>CLAIMS</Link>
          <span style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="text-data-sm">ASSESSMENT</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-display-md mb-1">Damage Assessment</h1>
            <div className="flex items-center gap-3">
              <span className="text-data-sm">{claim?.claimNumber ?? `CLM-${id}`}</span>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span className="text-data-sm">{formatTimestamp(effectiveAssessment.assessedAt)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="btn-secondary"
              onClick={() => window.print()}
              aria-label="Download assessment report"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download report
            </button>
            <Link href="/upload" className="btn-primary">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New assessment
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 mb-6">
        {/* Image with scan animation */}
        <div className="card overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
            <span className="text-heading-sm">Damage Analysis</span>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: scanComplete ? 'var(--fraud-clear)' : 'var(--brand-primary)', animation: scanComplete ? 'none' : 'annotation-pulse 1s ease-in-out infinite' }}
              />
              <span className="text-data-sm">{scanComplete ? 'SCAN COMPLETE' : 'SCANNING'}</span>
            </div>
          </div>

          {/* ─── SIGNATURE ANIMATION ─── */}
          <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {effectiveImageUrl ? (
              <motion.img
                src={effectiveImageUrl}
                alt="Vehicle damage — annotated assessment"
                className="w-full h-full object-cover"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: scanComplete ? 1 : 0.65 }}
                transition={{ duration: 0.6 }}
              />
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-500 gap-2"
                style={{ backgroundColor: 'var(--bg-card-secondary)', borderColor: 'var(--border-default)' }}
              >
                <span className="text-zinc-500 text-sm font-medium">No image available</span>
              </div>
            )}

            {/* Scan line — sweeps top to bottom */}
            {!scanComplete && (
              <motion.div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  height: '3px',
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.2) 10%, #2563eb 50%, rgba(37,99,235,0.2) 90%, transparent 100%)',
                  boxShadow: '0 0 30px 8px rgba(37,99,235,0.4)',
                  zIndex: 10,
                }}
                initial={{ top: '0%', opacity: 1 }}
                animate={{ top: '100%', opacity: [1, 1, 0] }}
                transition={{ duration: 1.2, ease: 'linear', times: [0, 0.85, 1] }}
                aria-hidden="true"
              />
            )}

            {/* Scan overlay — darkens image as scan passes */}
            {!scanComplete && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(37,99,235,0.04) 0%, transparent 30%)',
                  zIndex: 9,
                }}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 1.2 }}
                aria-hidden="true"
              />
            )}

            {/* Annotation dots */}
            {effectiveAssessment.annotationPoints.map((point, i) => (
              <AnnotationDot
                key={point.id}
                point={point}
                delay={i * 0.15}
                visible={annotationsVisible}
              />
            ))}

            {/* Corner HUD elements */}
            <div className="absolute top-3 left-3 text-data-sm px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}>
              {effectiveAssessment.annotationPoints.length} zones detected
            </div>
            <div className="absolute top-3 right-3 text-data-sm px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}>
              {DAMAGE_TYPE_LABELS[effectiveAssessment.damageType]}
            </div>
          </div>
        </div>

        {/* Assessment Details */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-4"
        >
          {/* Damage Summary Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-heading-sm">Damage Summary</h2>
              <SeverityBadge severity={effectiveAssessment.severity} />
            </div>

            <div className="text-display-md mb-1" style={{ color: sevConfig.color, fontFamily: 'var(--font-display)' }}>
              {formatCurrency(effectiveAssessment.estimatedCost)}
            </div>
            <div className="text-data-sm mb-4">Estimated repair cost</div>

            <ConfidenceBar
              value={effectiveAssessment.confidence}
              animate={scanComplete}
              color={sevConfig.barColor}
            />

            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <div className="text-body-sm mb-1" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {DAMAGE_TYPE_LABELS[effectiveAssessment.damageType]}
              </div>
              <p className="text-body-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.65' }}>
                {effectiveAssessment.explanation}
              </p>
            </div>
          </div>

          {/* Fraud Assessment Card */}
          <motion.div
            className="card p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-heading-sm mb-3">Fraud Assessment</h2>
            <FraudBadge
              flagged={effectiveAssessment.fraud.flagged}
              riskScore={effectiveAssessment.fraud.riskScore}
              className="mb-3"
            />

            {/* Risk score bar */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between">
                <span className="text-data-sm">Risk Score</span>
                <span className="text-data-sm" style={{ color: effectiveAssessment.fraud.flagged ? 'var(--fraud-alert)' : 'var(--fraud-clear)' }}>
                  {formatFraudRisk(effectiveAssessment.fraud.riskScore)}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: effectiveAssessment.fraud.flagged ? 'var(--fraud-alert)' : 'var(--fraud-clear)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${effectiveAssessment.fraud.riskScore}%` }}
                  transition={{ duration: 1, delay: 1.6 }}
                />
              </div>
            </div>

            {effectiveAssessment.fraud.flagged && effectiveAssessment.fraud.reasons.length > 0 && (
              <div
                className="rounded-lg p-3 space-y-2"
                style={{ backgroundColor: 'var(--fraud-alert-bg)', border: '1px solid var(--fraud-alert-border)' }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fraud-alert)' }}>
                  Indicators
                </div>
                {effectiveAssessment.fraud.reasons.map((reason) => (
                  <div key={reason} className="flex items-start gap-2 text-xs" style={{ color: 'var(--fraud-alert)' }}>
                    <span className="flex-shrink-0 mt-0.5">·</span>
                    {reason}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Status */}
          {claim && (
            <motion.div
              className="card p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-heading-sm">Claim Status</h2>
                <StatusChip status={claim.status} />
              </div>
              {claim.assignedAdjuster && (
                <div className="mt-3 text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                  Adjuster: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{claim.assignedAdjuster}</span>
                </div>
              )}
              <Link
                href={`/claims/${id}`}
                className="mt-3 text-sm font-semibold inline-flex items-center gap-1"
                style={{ color: 'var(--brand-primary)' }}
              >
                View full claim detail →
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Damage Zone Table ─────────────────────────── */}
      <motion.div
        className="card overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h2 className="text-heading-sm">Detected Damage Zones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table" aria-label="Damage zone breakdown">
            <thead>
              <tr>
                <th>#</th>
                <th>Zone</th>
                <th>Severity</th>
                <th>Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {effectiveAssessment.annotationPoints.map((point, i) => (
                <tr key={point.id}>
                  <td>
                    <span className="text-data-sm">{String(i + 1).padStart(2, '0')}</span>
                  </td>
                  <td>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{point.label}</span>
                  </td>
                  <td>
                    <SeverityBadge severity={point.severity} size="sm" />
                  </td>
                  <td>
                    <span className="text-data-sm">
                      X:{point.x.toFixed(1)}% · Y:{point.y.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
