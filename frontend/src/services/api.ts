import axios, { type AxiosInstance } from 'axios';
import type {
  Claim,
  Assessment,
  UploadClaimResponse,
  ClaimsFilter,
  SeverityLevel,
  DamageType,
  AnnotationPoint,
  StatusHistoryEntry,
  VehicleInfo,
  ClaimStatus,
} from '@/types';
import { API_BASE_URL, USE_MOCK } from '@/constants';
import { MOCK_CLAIMS, getClaimsStats } from '@/mock/claims';
import { generateMockAssessment } from '@/mock/assessment';
import { sleep } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ── Axios instance ─────────────────────────────────────────
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth interceptor: dynamically attaches JWT access token from Supabase session
axiosInstance.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Mock mode detection ────────────────────────────────────
function isMockMode(): boolean {
  return USE_MOCK;
}

// ── Helper functions for mapping backend schema to frontend model ──

function getHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getDeterministicVehicleInfo(claimId: string): VehicleInfo {
  const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Audi', 'Tesla'];
  const models: Record<string, string[]> = {
    Toyota: ['Camry', 'RAV4', 'Prius'],
    Honda: ['Civic', 'Accord', 'CR-V'],
    Ford: ['F-150', 'Mustang', 'Explorer'],
    Chevrolet: ['Silverado', 'Equinox', 'Malibu'],
    BMW: ['3 Series', '5 Series', 'X5'],
    Audi: ['A4', 'Q5', 'A6'],
    Tesla: ['Model 3', 'Model Y', 'Model S']
  };
  const colors = ['Midnight Black', 'Pearl White', 'Steel Gray', 'Deep Blue', 'Red Multi-Coat'];
  
  const hash = getHash(claimId);
  const make = makes[hash % makes.length];
  const modelOptions = models[make];
  const model = modelOptions[hash % modelOptions.length];
  const year = 2015 + (hash % 10);
  const color = colors[hash % colors.length];
  const vin = `1FM5K8F8${hash.toString(16).padEnd(9, 'A').toUpperCase().slice(0, 9)}`;
  
  return { make, model, year, vin, color };
}

function getDeterministicAnnotationPoints(damageType: string, severity: string): AnnotationPoint[] {
  const points: Record<string, {x: number, y: number, label: string}[]> = {
    front_collision: [
      { x: 35, y: 35, label: 'Hood crumple' },
      { x: 20, y: 65, label: 'Bumper displacement' },
      { x: 55, y: 50, label: 'Radiator impact' }
    ],
    rear_collision: [
      { x: 75, y: 60, label: 'Bumper impact' },
      { x: 80, y: 40, label: 'Trunk lid deformation' }
    ],
    side_impact: [
      { x: 30, y: 45, label: 'Panel deformation' },
      { x: 25, y: 35, label: 'Door intrusion' }
    ],
    hail_damage: [
      { x: 40, y: 25, label: 'Primary hail zone' },
      { x: 60, y: 30, label: 'Secondary impacts' }
    ],
    scratch_dent: [
      { x: 45, y: 55, label: 'Surface abrasion' }
    ],
    flood_damage: [
      { x: 50, y: 80, label: 'Waterline mark' }
    ],
    fire_damage: [
      { x: 50, y: 50, label: 'Thermal deformation' }
    ],
    vandalism: [
      { x: 40, y: 40, label: 'Surface scratch' }
    ],
    rollover: [
      { x: 50, y: 20, label: 'Roof crush' }
    ],
    windshield: [
      { x: 50, y: 45, label: 'Glass crack' }
    ]
  };

  const defaultPoints = [{ x: 50, y: 50, label: 'Damage area' }];
  const matching = points[damageType] || defaultPoints;
  return matching.map((p, idx) => ({
    id: `ap-${damageType}-${idx}`,
    x: p.x,
    y: p.y,
    label: p.label,
    severity: severity as SeverityLevel
  }));
}

// Request signed URL for claim image from Supabase Storage
export async function getClaimImageUrl(imagePath: string): Promise<string | null> {
  if (!imagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from('claim-images')
      .createSignedUrl(imagePath, 3600);
    if (error || !data) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error('Failed to get signed image URL:', e);
    return null;
  }
}

// Map backend claim shape to frontend expected shape
export function mapBackendClaimToClaim(bClaim: any, signedImageUrl: string | null): Claim {
  const hashVal = getHash(bClaim.id);
  const vehicleInfo = getDeterministicVehicleInfo(bClaim.id);
  
  let status: ClaimStatus = 'submitted';
  if (bClaim.status === 'assessed') {
    status = 'assessed';
  } else if (bClaim.status === 'flagged') {
    status = 'under_review';
  } else if (bClaim.status === 'pending') {
    status = 'submitted';
  }

  let assessment: Assessment | undefined = undefined;
  // Backend returns assessments array, or it might be single object on some endpoints
  const bAssess = Array.isArray(bClaim.assessments) ? bClaim.assessments[0] : (bClaim.assessments || bClaim.assessment);
  
  if (bAssess) {
    let severity: SeverityLevel = 'minor';
    if (bAssess.severity === 'total_loss') {
      severity = 'critical';
    } else if (['minor', 'moderate', 'severe', 'critical'].includes(bAssess.severity)) {
      severity = bAssess.severity as SeverityLevel;
    }

    const flags = bClaim.fraud_flags || [];
    const flagged = bAssess.duplicate_flagged || flags.length > 0;
    const reasons = flags.map((f: any) => f.detail || f.detail_message);
    if (bAssess.duplicate_flagged && !reasons.includes('Duplicate image detected')) {
      reasons.unshift('Duplicate image detected');
    }

    let riskScore = 10;
    if (flagged) {
      if (flags.some((f: any) => f.flag_type === 'duplicate_image') || bAssess.duplicate_flagged) {
        riskScore = 85;
      } else if (flags.some((f: any) => f.flag_type === 'cost_anomaly')) {
        riskScore = 65;
      } else {
        riskScore = 45;
      }
    }

    assessment = {
      id: bAssess.id || `asm-${bClaim.id}`,
      claimId: bClaim.id,
      damageType: bAssess.damage_type as DamageType,
      severity,
      confidence: Math.round((bAssess.confidence || 0) * 100),
      estimatedCost: bAssess.estimated_cost,
      explanation: bAssess.explanation,
      fraud: {
        flagged,
        riskScore,
        reasons,
      },
      annotationPoints: getDeterministicAnnotationPoints(bAssess.damage_type, severity),
      assessedAt: bAssess.created_at || bClaim.updated_at,
    };
  }

  const statusHistory: StatusHistoryEntry[] = [
    {
      status: 'submitted',
      timestamp: bClaim.created_at,
      note: 'Claim created and photo uploaded successfully.',
      actor: 'System',
    },
  ];

  if (status === 'assessed') {
    statusHistory.push({
      status: 'assessed',
      timestamp: bClaim.updated_at,
      note: 'AI damage assessment completed.',
      actor: 'AI Assessor',
    });
  } else if (bClaim.status === 'flagged') {
    statusHistory.push({
      status: 'under_review',
      timestamp: bClaim.updated_at,
      note: 'Claim flagged for potential fraud. Under review.',
      actor: 'Fraud Detection Engine',
    });
  }

  return {
    id: bClaim.id,
    claimNumber: `CLM-${(hashVal % 90000) + 10000}`,
    status,
    createdAt: bClaim.created_at,
    updatedAt: bClaim.updated_at,
    imageUrl: signedImageUrl,
    vehicleInfo,
    assessment,
    statusHistory,
    assignedAdjuster: 'Marcus Webb',
    policyNumber: `POL-${(hashVal % 900000) + 100000}`,
  };
}

// ── Upload a claim photo ───────────────────────────────────
export async function uploadClaim(file: File): Promise<UploadClaimResponse> {
  if (isMockMode()) {
    await sleep(2000);
    const claimId = `clm-new-${Date.now()}`;
    const imageUrl = URL.createObjectURL(file);
    return { claimId, imageUrl };
  }

  const formData = new FormData();
  formData.append('image', file); // Backend expects field name: image

  const response = await axiosInstance.post<{ claim_id: string; image_path: string; imageUrl: string }>(
    '/api/claims/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  return {
    claimId: response.data.claim_id,
    imageUrl: response.data.imageUrl || null,
  };
}

// ── Run AI assessment on a claim ───────────────────────────
export async function getAssessment(
  claimId: string,
  imageUrl?: string
): Promise<Assessment> {
  if (isMockMode()) {
    await sleep(3000);
    return generateMockAssessment(claimId, imageUrl ?? '');
  }

  await axiosInstance.post<any>(
    `/api/claims/${claimId}/assess`
  );
  
  // Fetch fully updated claim to retrieve db elements (e.g. explanations, fraud flags)
  const fullClaimResponse = await axiosInstance.get<{ claim: any }>(`/api/claims/${claimId}`);
  const mappedClaim = mapBackendClaimToClaim(fullClaimResponse.data.claim, imageUrl ?? null);
  
  if (!mappedClaim.assessment) {
    throw new Error('Assessment failed to process');
  }

  return mappedClaim.assessment;
}

// ── Get all claims (with optional filter) ─────────────────
export async function getClaims(
  filter?: ClaimsFilter
): Promise<{ claims: Claim[]; total: number }> {
  if (isMockMode()) {
    await sleep(600);
    let claims = [...MOCK_CLAIMS];

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      claims = claims.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(q) ||
          c.vehicleInfo.make.toLowerCase().includes(q) ||
          c.vehicleInfo.model.toLowerCase().includes(q) ||
          c.vehicleInfo.vin.toLowerCase().includes(q) ||
          c.policyNumber.toLowerCase().includes(q)
      );
    }

    if (filter?.status && filter.status !== 'all') {
      claims = claims.filter((c) => c.status === filter.status);
    }

    if (filter?.severity && filter.severity !== 'all') {
      claims = claims.filter(
        (c) => c.assessment?.severity === filter.severity
      );
    }

    if (filter?.fraud === true) {
      claims = claims.filter((c) => c.assessment?.fraud.flagged);
    }

    const total = claims.length;
    const page = filter?.page ?? 1;
    const pageSize = filter?.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    claims = claims.slice(start, start + pageSize);

    return { claims, total };
  }

  const params = new URLSearchParams();
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.pageSize) params.set('limit', String(filter.pageSize ?? 10)); // Backend uses limit

  const response = await axiosInstance.get<{ claims: any[]; page: number; limit: number; total: number }>(
    `/api/claims?${params.toString()}`
  );

  const claimsList = response.data.claims.map((c) => {
    return mapBackendClaimToClaim(c, c.imageUrl || null);
  });

  let filteredClaims = claimsList;

  // Apply filters on client side as the simple backend returns all user claims
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    filteredClaims = filteredClaims.filter(
      (c) =>
        c.claimNumber.toLowerCase().includes(q) ||
        c.vehicleInfo.make.toLowerCase().includes(q) ||
        c.vehicleInfo.model.toLowerCase().includes(q) ||
        c.vehicleInfo.vin.toLowerCase().includes(q) ||
        c.policyNumber.toLowerCase().includes(q)
    );
  }

  if (filter?.status && filter.status !== 'all') {
    filteredClaims = filteredClaims.filter((c) => c.status === filter.status);
  }

  if (filter?.severity && filter.severity !== 'all') {
    filteredClaims = filteredClaims.filter(
      (c) => c.assessment?.severity === filter.severity
    );
  }

  if (filter?.fraud === true) {
    filteredClaims = filteredClaims.filter((c) => c.assessment?.fraud.flagged);
  }

  return {
    claims: filteredClaims,
    total: response.data.total || filteredClaims.length,
  };
}

// ── Get a single claim by ID ───────────────────────────────
export async function getClaim(id: string): Promise<Claim> {
  if (isMockMode()) {
    await sleep(400);
    const claim = MOCK_CLAIMS.find((c) => c.id === id);
    if (!claim) throw new Error(`Claim ${id} not found`);
    return claim;
  }

  const response = await axiosInstance.get<{ claim: any }>(`/api/claims/${id}`);
  return mapBackendClaimToClaim(response.data.claim, response.data.claim.imageUrl || null);
}

// ── Get dashboard stats ────────────────────────────────────
export async function getStats() {
  if (isMockMode()) {
    await sleep(400);
    return getClaimsStats();
  }

  const response = await axiosInstance.get('/api/claims/stats');
  return response.data;
}
