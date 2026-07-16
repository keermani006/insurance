// ============================================================
// CLAIMSIGHT — Mock Assessment (for new upload flow)
// ============================================================

import type { Assessment } from '@/types';

export function generateMockAssessment(claimId: string, imageUrl: string): Assessment {
  const options: Partial<Assessment>[] = [
    {
      damageType: 'front_collision',
      severity: 'severe',
      confidence: 94,
      estimatedCost: 9200,
      explanation:
        'Significant front-end structural damage detected. Hood crumple zone activated, bumper assembly displaced 4–6 inches. Radiator support compromised. Airbag deployment confirmed from sensor data overlay.',
      fraud: { flagged: false, riskScore: 12, reasons: [] },
      annotationPoints: [
        { id: 'ap-new-1', x: 35, y: 35, label: 'Hood crumple', severity: 'severe' },
        { id: 'ap-new-2', x: 20, y: 65, label: 'Bumper displacement', severity: 'moderate' },
        { id: 'ap-new-3', x: 55, y: 50, label: 'Radiator impact', severity: 'severe' },
      ],
    },
    {
      damageType: 'hail_damage',
      severity: 'moderate',
      confidence: 88,
      estimatedCost: 2900,
      explanation:
        'Hail impact pattern consistent with 1.5–2 inch diameter hailstones. 38 distinct impact points mapped. Paint integrity intact at most locations. Hood and roof primary damage zones.',
      fraud: { flagged: false, riskScore: 7, reasons: [] },
      annotationPoints: [
        { id: 'ap-new-1', x: 40, y: 25, label: 'Primary hail zone', severity: 'moderate' },
        { id: 'ap-new-2', x: 60, y: 30, label: 'Secondary impacts', severity: 'minor' },
      ],
    },
    {
      damageType: 'side_impact',
      severity: 'critical',
      confidence: 96,
      estimatedCost: 14800,
      explanation:
        'High-energy lateral impact detected. Door frame intrusion exceeds 2 inches. B-pillar deformation compromises structural cage integrity. Passenger compartment breach risk. Immediate structural inspection required.',
      fraud: { flagged: false, riskScore: 18, reasons: [] },
      annotationPoints: [
        { id: 'ap-new-1', x: 30, y: 45, label: 'B-pillar deformation', severity: 'critical' },
        { id: 'ap-new-2', x: 20, y: 55, label: 'Door intrusion', severity: 'critical' },
        { id: 'ap-new-3', x: 25, y: 35, label: 'Panel crush', severity: 'severe' },
      ],
    },
  ];

  const pick = options[Math.floor(Math.random() * options.length)];

  return {
    id: `asm-new-${Date.now()}`,
    claimId,
    assessedAt: new Date().toISOString(),
    ...pick,
  } as Assessment;
}
