// ============================================================
// CLAIMSIGHT — TypeScript Types
// ============================================================

export type ClaimStatus = 'submitted' | 'under_review' | 'assessed' | 'resolved';
export type SeverityLevel = 'minor' | 'moderate' | 'severe' | 'critical';
export type DamageType =
  | 'front_collision'
  | 'rear_collision'
  | 'side_impact'
  | 'hail_damage'
  | 'scratch_dent'
  | 'flood_damage'
  | 'fire_damage'
  | 'vandalism'
  | 'rollover'
  | 'windshield';

export interface Assessment {
  id: string;
  claimId: string;
  damageType: DamageType;
  severity: SeverityLevel;
  confidence: number; // 0–100
  estimatedCost: number; // USD
  explanation: string;
  fraud: FraudAssessment;
  annotationPoints: AnnotationPoint[];
  assessedAt: string; // ISO 8601
}

export interface FraudAssessment {
  flagged: boolean;
  riskScore: number; // 0–100
  reasons: string[];
}

export interface AnnotationPoint {
  id: string;
  x: number; // percentage 0–100
  y: number; // percentage 0–100
  label: string;
  severity: SeverityLevel;
}

export interface Claim {
  id: string;
  claimNumber: string; // human-readable e.g. CLM-2024-00042
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
  vehicleInfo: VehicleInfo;
  assessment?: Assessment;
  statusHistory: StatusHistoryEntry[];
  assignedAdjuster?: string;
  policyNumber: string;
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  vin: string;
  color: string;
}

export interface StatusHistoryEntry {
  status: ClaimStatus;
  timestamp: string;
  note?: string;
  actor?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'adjuster' | 'claimant' | 'admin';
  email: string;
  avatarInitials: string;
}

// API response types
export interface UploadClaimResponse {
  claimId: string;
  imageUrl: string | null;
}

export interface ClaimsStats {
  total: number;
  pending: number;
  completed: number;
  fraudAlerts: number;
  averageCost: number;
  averageConfidence: number;
}

export interface PaginatedClaims {
  claims: Claim[];
  total: number;
  page: number;
  pageSize: number;
}

// Filter/search types
export interface ClaimsFilter {
  status?: ClaimStatus | 'all';
  severity?: SeverityLevel | 'all';
  fraud?: boolean | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}
