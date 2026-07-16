-- ============================================================
-- Insurance Claims Backend — Supabase Schema
-- Run this in the Supabase SQL Editor against your project.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── claims ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.claims (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path    TEXT NOT NULL,
  phash         TEXT,                     -- perceptual hash hex string
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'assessed', 'flagged')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── assessments ────────────────────────────────────────────────
-- One assessment per claim (enforced by UNIQUE constraint)
CREATE TABLE IF NOT EXISTS public.assessments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id         UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  damage_type      TEXT NOT NULL,
  severity         TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'total_loss')),
  confidence       NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  explanation      TEXT NOT NULL,
  estimated_cost   INTEGER NOT NULL CHECK (estimated_cost >= 0),
  duplicate_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (claim_id)  -- prevents double assessment at DB level
);

-- ─── fraud_flags ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id    UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type   TEXT NOT NULL CHECK (flag_type IN ('duplicate_image', 'cost_anomaly', 'metadata_anomaly')),
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── audit_log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource_id UUID,
  detail      JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_claims_user_id     ON public.claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status      ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_assessments_claim  ON public.assessments(claim_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_claim  ON public.fraud_flags(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user     ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON public.audit_log(action);

-- ─── updated_at trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────
ALTER TABLE public.claims        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_flags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log     ENABLE ROW LEVEL SECURITY;

-- claims: users see and modify only their own rows
CREATE POLICY "claims_select_own" ON public.claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "claims_insert_own" ON public.claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "claims_update_own" ON public.claims
  FOR UPDATE USING (auth.uid() = user_id);

-- assessments: users see only assessments for their own claims
CREATE POLICY "assessments_select_own" ON public.assessments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "assessments_insert_own" ON public.assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- fraud_flags: users see only flags on their own claims
CREATE POLICY "fraud_flags_select_own" ON public.fraud_flags
  FOR SELECT USING (auth.uid() = user_id);

-- audit_log: users see only their own audit entries
CREATE POLICY "audit_log_select_own" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Storage Bucket ─────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage → New Bucket
-- Name: claims-images, Private: true (no public access)
-- Then add these policies:

-- Allow authenticated users to upload to their own folder
-- INSERT policy: (bucket_id = 'claims-images') AND (auth.uid()::text = (storage.foldername(name))[1])
-- SELECT policy: (bucket_id = 'claims-images') AND (auth.uid()::text = (storage.foldername(name))[1])
