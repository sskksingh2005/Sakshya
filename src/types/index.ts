export interface Incident {
  id: string;
  user_id: string;
  incident_date: string;
  description: string;
  category: string | null;
  severity_score: number | null;
  ai_summary: string | null;
  people_involved: string[];
  risk_keywords_detected: string[];
  escalation_flag: boolean;
  created_at: string;
}

export interface Evidence {
  id: string;
  incident_id: string;
  user_id: string;
  filename: string;
  file_type: string;
  storage_path: string;
  sha256_hash: string;
  consent_status: string;
  captured_at: string;
  uploaded_at: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  description: string;
  last_verified: string;
}

export interface ClassifyResult {
  category: string;
  severity_score: number;
  summary: string;
  people_involved: string[];
  risk_keywords_detected: string[];
  fallback_used: boolean;
}

export interface IncidentWithEvidence extends Incident {
  evidence: Evidence[];
}
