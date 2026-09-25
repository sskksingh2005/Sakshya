# Sakshya — Survivor-Controlled Evidence & Documentation Platform

> *"Sakshya doesn't force a survivor to report today. It helps preserve her options for tomorrow."*

Sakshya is a safe, private, survivor-controlled digital evidence and documentation platform designed for domestic and spousal abuse situations. It enables survivors to document incidents in real-time, compute cryptographic SHA-256 evidence hashes, receive AI-assisted incident structuring, track safety indicators, and generate court-ready legal dossiers under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023.

---

## Current Product Structure

### Voice Recording & Transcription
- Add Incident uses the browser's native `MediaRecorder` API. Recordings can be played back, replaced, or converted to editable text before the incident is saved.
- Configure the Supabase Edge Function name with `VITE_SUPABASE_TRANSCRIPTION_FUNCTION` in the environment used by Vite. The frontend sends the audio as an authenticated multipart request through `supabase.functions.invoke` and does not contain a speech-service secret.
- The Edge Function must validate the authenticated user, keep audio private, forward it to the configured speech-to-text provider, and return JSON shaped as `{ "transcript": "..." }` (or `{ "text": "..." }`). It should return a clear non-2xx error for failures.
- Until that function is configured, `Convert to Text` shows a configuration error and keeps the local recording available. Recordings are uploaded to the existing private `evidence` bucket only when the user confirms the incident.

### Frontend Architecture
- **Framework**: React 18 with TypeScript & Vite.
- **Routing**: `react-router-dom` (HashRouter) supporting decoy calculator entry flow.
- **Styling & Design System**: Custom Sakshya CSS design system (`index.css` & `tailwind.config.js`) featuring brand palette `#3D1F5C` (Deep Purple), `#6B2FA0` (Royal Violet), `#D6208F` (Magenta), `#FBE4EC` (Blush), and `#FFF9FB` (Warm White).
- **Core Branding & UI Components**:
  - `src/components/branding/SakshyaLogo.tsx`: Custom SVG emblem combining a protective shield and flowing silhouette.
  - `src/components/branding/SakshyaLoader.tsx`: Polished boot/loading screen with ambient glow and reduced-motion support.
  - `src/components/ui/Button.tsx`: Standardized button component (`primary`, `secondary`, `danger`, `success`, `ghost`, `outline`).
  - `src/components/ui/LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx`: Reusable UI state managers.

### Backend & Database (Supabase)
- **Authentication**: Email & password authentication with automatic session persistence (`src/lib/auth.tsx`).
- **Database Tables**:
  - `incidents`: Stores incident date, narrative, AI classification, severity score (1–4), risk keywords, and escalation flags.
  - `evidence`: Stores attached media files, file types, SHA-256 cryptographic hashes, storage paths, and party consent metadata.
  - `resources`: Verified legal aid, NALSA, NCW, and DLSA support directory entries.
- **Storage Bucket**: Private `evidence` storage bucket with row-level security policies.

### AI Structuring & Analytics
- **AI Classification**: Edge processing/client helper (`src/lib/utils.ts` -> `classifyIncident`) that classifies narrative category, extracts severity score, generates summaries, identifies entities, and flags risk keywords.
- **Explainable Safety Indicator**: Computes frequency, recency, and severity heuristics (`computeDangerFactors`) to inform survivors without making unvalidated predictions.
- **Escalation Detection**: Identifies rising incident frequency and severity across records.

### Key Pages & User Flow
1. **Decoy Entry (`/`)**: Discreet iOS/Android-style calculator disguise. Secret PIN entry unlocks vault access.
2. **Authentication (`/auth`)**: Private account creation and sign-in.
3. **Dashboard (`/dashboard`)**: Vault overview, Safety-Planning Indicator, Escalation Banner, and Incident Timeline.
4. **Add Incident (`/incidents/new`)**: Narrative entry, SHA-256 evidence hashing, and AI-assisted incident review.
5. **Incident Detail (`/incidents/:id`)**: Detailed record view with evidence download links and party consent metadata controls.
6. **Evidence Dossier (`/dossier`)**: Dynamic PDF dossier generator (`jsPDF`) including Section 63(4) Part A & Part B legal certificate drafts.
7. **Legal Aid Directory (`/legal-aid`)**: Support pathways and helpline directory.
8. **Safety Information (`/safety`)**: Legal guidance on SHA-256 integrity, Section 63 BSA 2023 rules, and privacy limitations.
9. **Settings (`/settings`)**: Account management, simulated Silent SOS alert, vault data purge, and product roadmap.
