// ============================================================
// CLAIMSIGHT — Constants
// ============================================================

import type { SeverityLevel, ClaimStatus } from '@/types';

export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    barColor: string;
    cssClass: string;
  }
> = {
  minor: {
    label: 'Minor',
    color: '#0ea5e9',
    bgColor: '#f0f9ff',
    textColor: '#0369a1',
    borderColor: '#0ea5e9',
    barColor: '#0ea5e9',
    cssClass: 'badge-minor',
  },
  moderate: {
    label: 'Moderate',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    textColor: '#92400e',
    borderColor: '#f59e0b',
    barColor: '#f59e0b',
    cssClass: 'badge-moderate',
  },
  severe: {
    label: 'Severe',
    color: '#ef4444',
    bgColor: '#fef2f2',
    textColor: '#991b1b',
    borderColor: '#ef4444',
    barColor: '#ef4444',
    cssClass: 'badge-severe',
  },
  critical: {
    label: 'Critical',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    textColor: '#4c1d95',
    borderColor: '#7c3aed',
    barColor: '#7c3aed',
    cssClass: 'badge-critical',
  },
};

export const STATUS_CONFIG: Record<
  ClaimStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    description: string;
    step: number;
  }
> = {
  submitted: {
    label: 'Submitted',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    description: 'Claim received and logged',
    step: 1,
  },
  under_review: {
    label: 'Under Review',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    description: 'Adjuster reviewing documentation',
    step: 2,
  },
  assessed: {
    label: 'Assessed',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    description: 'AI assessment complete',
    step: 3,
  },
  resolved: {
    label: 'Resolved',
    color: '#10b981',
    bgColor: '#ecfdf5',
    description: 'Claim settled and closed',
    step: 4,
  },
};

export const DAMAGE_TYPE_LABELS: Record<string, string> = {
  front_collision: 'Front Collision',
  rear_collision: 'Rear Collision',
  side_impact: 'Side Impact',
  hail_damage: 'Hail Damage',
  scratch_dent: 'Scratch & Dent',
  flood_damage: 'Flood Damage',
  fire_damage: 'Fire Damage',
  vandalism: 'Vandalism',
  rollover: 'Rollover',
  windshield: 'Windshield',
};

export const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const PAGE_SIZE = 10;

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/upload', label: 'New Assessment', icon: 'ScanLine' },
  { href: '/claims', label: 'Claims', icon: 'FileText' },
] as const;

// Mock mode: set NEXT_PUBLIC_USE_MOCK=true to use mock data
export const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
