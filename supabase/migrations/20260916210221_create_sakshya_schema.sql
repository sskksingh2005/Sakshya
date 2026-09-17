/*
# Create Sakshya Core Schema

## Summary
Creates the three core tables for the Sakshya evidence-documentation platform:
- `incidents`: stores survivor-reported incidents with AI classification results
- `evidence`: stores metadata for uploaded evidence files (photos, audio, documents)
- `resources`: static, admin-managed legal-aid directory (helplines, NALSA, NCW, OSCs, DLSAs)

## Tables

### incidents
- id (uuid PK)
- user_id (uuid, references auth.users, defaults to auth.uid())
- incident_date (date)
- description (text) — survivor's original wording, never overwritten
- category (text) — AI-classified category
- severity_score (int 1-4)
- ai_summary (text) — AI-generated neutral summary
- people_involved (text[]) — people mentioned
- risk_keywords_detected (text[]) — high-risk keywords from AI
- escalation_flag (boolean) — set by escalation detector
- created_at (timestamptz)

### evidence
- id (uuid PK)
- incident_id (uuid, references incidents, cascade delete)
- user_id (uuid, references auth.users, defaults to auth.uid())
- filename (text)
- file_type (text)
- storage_path (text)
- sha256_hash (text)
- consent_status (text) — "obtained" | "not_obtained" | "unsure"
- captured_at (timestamptz)
- uploaded_at (timestamptz)

### resources
- id (uuid PK)
- name (text)
- type (text) — "helpline" | "nalsa" | "ncw" | "osc" | "dlsa"
- phone (text)
- description (text)
- last_verified (date)

## Security
- RLS enabled on all tables
- incidents: owner-scoped CRUD (authenticated users access only their own rows)
- evidence: owner-scoped CRUD (authenticated users access only their own rows)
- resources: read-only for anon and authenticated (static directory, not user-editable)

## Seed Data
- Resources table seeded with verified contacts: NALSA (15100), Women Helpline (181),
  NCW (7827170170), One Stop Centres description, DLSA description
*/

-- ============================================
-- INCIDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_date date NOT NULL,
  description text NOT NULL,
  category text,
  severity_score int,
  ai_summary text,
  people_involved text[] DEFAULT '{}',
  risk_keywords_detected text[] DEFAULT '{}',
  escalation_flag boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_incidents" ON incidents;
CREATE POLICY "select_own_incidents" ON incidents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_incidents" ON incidents;
CREATE POLICY "insert_own_incidents" ON incidents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_incidents" ON incidents;
CREATE POLICY "update_own_incidents" ON incidents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_incidents" ON incidents;
CREATE POLICY "delete_own_incidents" ON incidents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- EVIDENCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  sha256_hash text NOT NULL,
  consent_status text DEFAULT 'unsure',
  captured_at timestamptz DEFAULT now(),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_evidence" ON evidence;
CREATE POLICY "select_own_evidence" ON evidence FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_evidence" ON evidence;
CREATE POLICY "insert_own_evidence" ON evidence FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_evidence" ON evidence;
CREATE POLICY "update_own_evidence" ON evidence FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_evidence" ON evidence;
CREATE POLICY "delete_own_evidence" ON evidence FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- RESOURCES TABLE (static, admin-managed)
-- ============================================
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  phone text,
  description text,
  last_verified date
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Resources are read-only for all users (static directory)
DROP POLICY IF EXISTS "read_resources" ON resources;
CREATE POLICY "read_resources" ON resources FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================
-- STORAGE BUCKET FOR EVIDENCE
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only access their own evidence files
DROP POLICY IF EXISTS "Evidence bucket: users can read own files" ON storage.objects;
CREATE POLICY "Evidence bucket: users can read own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Evidence bucket: users can upload own files" ON storage.objects;
CREATE POLICY "Evidence bucket: users can upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Evidence bucket: users can delete own files" ON storage.objects;
CREATE POLICY "Evidence bucket: users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND auth.uid() = owner);

-- ============================================
-- SEED DATA FOR RESOURCES
-- ============================================
INSERT INTO resources (name, type, phone, description, last_verified) VALUES
  ('Women Helpline (181)', 'helpline', '181', '24x7 toll-free helpline for women in distress. Provides emergency support, information, and referral to services including One Stop Centres.', '2026-09-01'),
  ('Emergency Response Support System', 'helpline', '112', 'Single emergency number for police, fire, and ambulance. Call in immediate danger.', '2026-09-01'),
  ('National Legal Services Authority (NALSA)', 'nalsa', '15100', 'Free legal aid and services for eligible persons. NALSA provides legal assistance through State and District Legal Services Authorities.', '2026-09-01'),
  ('National Commission for Women (NCW)', 'ncw', '7827170170', 'Statutory body for women''s rights. Handles complaints of dowry harassment and domestic violence. Also offers a dedicated complaint portal.', '2026-09-01'),
  ('One Stop Centres (OSC)', 'osc', NULL, 'Sakhi — One Stop Centres provide integrated support to women affected by violence: medical aid, police assistance, legal aid, counselling, and shelter. Search the Mission Shakti portal (wcd.nic.in) for your nearest OSC.', '2026-09-01'),
  ('District Legal Services Authorities (DLSA)', 'dlsa', NULL, 'Free legal aid at the district level. DLSAs organise lok adalats and provide legal assistance. Find your nearest DLSA through the NALSA website (nalsa.gov.in) or your state legal services authority.', '2026-09-01')
ON CONFLICT DO NOTHING;
