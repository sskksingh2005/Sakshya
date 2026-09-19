# Sakshya Platform Architecture

This document describes the high-level architecture, data flows, security boundaries, and component interactions in Sakshya.

## Core System Architecture

```
Survivor / User
     │
     ▼
[ Decoy Entry (Calculator Disguise) ]
     │  (Secret PIN Entry)
     ▼
[ React Frontend Application (Vite + TS) ]
     │
     ├──► [ Auth Context (`auth.tsx`) ] ────────► Supabase Auth
     │
     ├──► [ Incident Entry Form ]
     │        │
     │        ├──► Client Cryptography ───────► SHA-256 Hash Computation
     │        │
     │        └──► AI Structuring Layer ───────► Category & Severity Extraction
     │
     ├──► [ Supabase DB & Storage ]
     │        ├── `incidents` table
     │        ├── `evidence` table
     │        └── `evidence` private bucket
     │
     └──► [ Dossier Engine (`jsPDF`) ] ────────► Court-Ready PDF Export
              (Section 63(4) BSA 2023 Draft)
```

---

## Technical Data Flow

1. **Decoy Entry Flow**
   - The user opens the web application presenting a neutral calculator disguise (`Calculator.tsx`).
   - Typing the secret PIN entry routes the user to `/auth`.

2. **Authentication Flow**
   - Handled via Supabase Authentication (`@supabase/supabase-js`).
   - Session state is provided application-wide via `AuthProvider`.
   - `ProtectedRoute` displays `SakshyaLoader` during initial boot and session resolution.

3. **Incident Document & Cryptographic Evidence Flow**
   - Narrative text is submitted alongside optional evidence files (images, audio, PDFs).
   - Before uploading, `computeSHA256()` computes a SHA-256 hash client-side for each file to guarantee chain-of-custody integrity.
   - Narrative text is passed to `classifyIncident()`, which parses incident categories, extracts severity metrics (1–4 scale), identifies mentioned entities, and flags risk keywords.
   - Files are stored in Supabase Storage under the user's isolated path; metadata and SHA-256 hashes are recorded in the `evidence` table.

4. **Safety Indicator & Escalation Analysis**
   - `computeDangerFactors()` evaluates incident recency, frequency, and severity to provide an explainable safety planning metric.
   - `detectEscalation()` flags compounding safety risks across consecutive incidents.

5. **Dossier Generation Flow**
   - `jsPDF` compiles incidents, SHA-256 evidence logs, and consent metadata.
   - Auto-drafts Section 63(4) Part A Certificate under the Bharatiya Sakshya Adhiniyam, 2023.
   - Provides Section 63(4) Part B expert certification template with legal admissibility disclaimers.

---

## Security & Privacy Principles

- **Row Level Security (RLS)**: Enforced on Supabase database tables to ensure users can only access their own incident records.
- **Client-Side Hashing**: Cryptographic hashes are computed before network upload.
- **No Unvalidated AI Guarantees**: AI output is explicitly designated as assistive structuring; safety indicators are presented as heuristics.
