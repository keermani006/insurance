# ClaimSight — AI Damage Assessment Frontend

> An instrument-panel-aesthetic frontend for automated warranty & insurance claim damage assessment. Built with Next.js 15, TypeScript, Tailwind CSS, and Framer Motion.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local   # or edit .env.local directly

# 3. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of your backend API | `http://localhost:8000` |
| `NEXT_PUBLIC_USE_MOCK` | Use mock data instead of real API | `true` |

**For demo/hackathon**: Leave `NEXT_PUBLIC_USE_MOCK=true`. The app works fully from static mock data — no backend required.

**For production**: Set `NEXT_PUBLIC_USE_MOCK=false` and set `NEXT_PUBLIC_API_BASE_URL` to your API.

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing page (standalone, no sidebar) |
| `/upload` | Upload damage photo and start assessment |
| `/dashboard` | Claims overview with stats, search, and table |
| `/claims` | Claims history list with filters |
| `/claims/[id]` | Claim detail with status timeline |
| `/results/[id]` | Assessment results with scan animation |

---

## Connecting a Real Backend

> **Backend teammate**: you only need to touch these files. Zero component changes.

### 1. `src/services/api.ts`

This is the only file that makes HTTP requests. Update the endpoint paths if your API uses different routes:

```typescript
// Current mock → real endpoint mapping:
uploadClaim(file)      → POST /api/claims/upload       (multipart/form-data)
getAssessment(id)      → POST /api/claims/{id}/assess
getClaims(filter)      → GET  /api/claims
getClaim(id)           → GET  /api/claims/{id}
getStats()             → GET  /api/claims/stats
```

### 2. `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
NEXT_PUBLIC_USE_MOCK=false
```

### 3. Expected API Response Shapes

All TypeScript types are in `src/types/index.ts`. Your API responses must match these shapes:

```typescript
// POST /api/claims/upload
{ claimId: string; imageUrl: string }

// POST /api/claims/{id}/assess
{
  id: string; claimId: string; damageType: DamageType;
  severity: SeverityLevel; confidence: number; // 0-100
  estimatedCost: number; // USD
  explanation: string;
  fraud: { flagged: boolean; riskScore: number; reasons: string[] };
  annotationPoints: Array<{ id: string; x: number; y: number; label: string; severity: SeverityLevel }>;
  assessedAt: string; // ISO 8601
}

// GET /api/claims
{ claims: Claim[]; total: number }

// GET /api/claims/{id}
Claim // (full shape in src/types/index.ts)

// GET /api/claims/stats
{ total: number; pending: number; completed: number; fraudAlerts: number; averageCost: number; averageConfidence: number }
```

### 4. Auth (if needed)

Add token injection in the Axios interceptor in `src/services/api.ts`:

```typescript
axiosInstance.interceptors.request.use((config) => {
  const token = getAuthToken(); // implement this
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## Mock Data

- `src/mock/claims.ts` — 16 varied claims (different damage types, severities, statuses, fraud flags)
- `src/mock/assessment.ts` — Random assessment generator for upload flow
- `src/mock/users.ts` — Adjuster and admin users

---

## Architecture

```
src/
  app/                    # Next.js App Router
    (app)/                # Sidebar layout (upload, dashboard, claims, results)
    page.tsx              # Landing page (standalone layout)
    not-found.tsx         # 404 page
  components/
    layout/               # Sidebar, TopBar, MobileNavbar
    ui/                   # Badges, Skeleton, States (shared)
    upload/               # (upload-specific, currently in page)
    results/              # (results-specific, currently in page)
  hooks/
    useClaims.ts          # Claims list with filter/pagination
    useClaim.ts           # Single claim fetch
    useAssessment.ts      # AI assessment fetch
    useStats.ts           # Dashboard statistics
  services/
    api.ts                # ← ONLY FILE backend teammate needs to edit
  mock/
    claims.ts             # 16 mock claims
    assessment.ts         # Assessment generator
    users.ts              # Mock users
  types/
    index.ts              # All TypeScript interfaces
  constants/
    index.ts              # Severity/status config, limits, feature flags
  lib/
    utils.ts              # Formatters, helpers
  app/globals.css         # Design system tokens + Tailwind v4 theme
```

---

## Design System

| Token | Value | Used for |
|---|---|---|
| Brand Primary | `#2563EB` | Actions, focus, active nav |
| Severity: Minor | `#0EA5E9` sky-blue | Low damage |
| Severity: Moderate | `#F59E0B` amber | Elevated damage |
| Severity: Severe | `#EF4444` red | High damage |
| Severity: Critical | `#7C3AED` violet | Maximum severity |
| Fraud Alert | `#DC2626` | Fraud flags **only** |
| Display font | Barlow Condensed | Headlines, big numbers |
| Body font | Inter | All UI copy |
| Mono font | JetBrains Mono | Claim IDs, timestamps, costs |

---

## Build

```bash
npm run build    # Production build (must be clean before submitting)
npm run lint     # ESLint check
```

---

## Key Features

- **Signature scan animation**: Results page sweeps a scan line over the damage image, reveals annotation dots over detected zones, and fills the confidence bar in sync — all via Framer Motion with `prefers-reduced-motion` support
- **Mock-mode fallback**: The app runs fully on static mock data if the backend isn't available at demo time. Toggle with `NEXT_PUBLIC_USE_MOCK=true`
- **Contract-first API**: All data flows through `services/api.ts` and custom hooks. No inline data in components
- **16 varied mock claims**: Different damage types (front collision, hail, fire, flood, rollover, vandalism, windshield), all 4 severities, all 4 statuses, 3 fraud-flagged claims
- **Full responsive**: Mobile bottom nav, tablet-friendly, ultra-wide max-width container
