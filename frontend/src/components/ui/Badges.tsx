'use client';

import { type SeverityLevel, type ClaimStatus } from '@/types';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '@/constants';
import { cn } from '@/lib/utils';

// ── StatusChip ──────────────────────────────────────────────
interface StatusChipProps {
  status: ClaimStatus;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', className)}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}

// ── SeverityBadge ───────────────────────────────────────────
interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, className, size = 'md' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span
      className={cn(
        'badge-severity',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : '',
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      {config.label}
    </span>
  );
}

// ── FraudBadge ──────────────────────────────────────────────
interface FraudBadgeProps {
  flagged: boolean;
  riskScore?: number;
  className?: string;
}

export function FraudBadge({ flagged, riskScore, className }: FraudBadgeProps) {
  if (flagged) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
          className
        )}
        style={{
          backgroundColor: 'var(--fraud-alert-bg)',
          color: 'var(--fraud-alert)',
          border: '1px solid var(--fraud-alert-border)',
        }}
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M6 1L11 10H1L6 1zm0 2.5L3.5 9h5L6 3.5z" clipRule="evenodd" />
          <rect x="5.5" y="5.5" width="1" height="2" />
          <rect x="5.5" y="8.5" width="1" height="1" />
        </svg>
        Fraud Flagged
        {riskScore !== undefined && (
          <span className="ml-1 opacity-75">· {riskScore}%</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        className
      )}
      style={{
        backgroundColor: 'var(--fraud-clear-bg)',
        color: 'var(--fraud-clear)',
        border: '1px solid var(--fraud-clear)',
      }}
    >
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
      </svg>
      No Fraud Indicators
      {riskScore !== undefined && (
        <span className="ml-1 opacity-60">· {riskScore}%</span>
      )}
    </span>
  );
}
