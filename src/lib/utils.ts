import { supabase } from './supabase';
import type { Incident, Evidence, ClassifyResult } from '@/types';

export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadEvidence(
  file: File,
  incidentId: string,
  userId: string,
  consentStatus: string
): Promise<{ evidence: Evidence | null; error: string | null }> {
  const hash = await computeSHA256(file);
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${incidentId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('evidence')
    .upload(fileName, file);

  if (uploadError) {
    return { evidence: null, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from('evidence')
    .insert({
      incident_id: incidentId,
      filename: file.name,
      file_type: file.type || `.${fileExt}`,
      storage_path: fileName,
      sha256_hash: hash,
      consent_status: consentStatus,
    })
    .select()
    .single();

  if (error) {
    return { evidence: null, error: error.message };
  }

  return { evidence: data as Evidence, error: null };
}

export async function classifyIncident(
  description: string,
  category?: string | null
): Promise<{ result: ClassifyResult | null; error: string | null }> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-incident`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  // Get the current session token for authenticated requests
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ description, category }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed (${response.status})`);
    }

    const data = await response.json();
    if (!data.category || typeof data.severity_score !== 'number') {
      throw new Error('Invalid response from classification service');
    }

    return { result: data as ClassifyResult, error: null };
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export interface EscalationAnalysis {
  isEscalating: boolean;
  reasons: string[];
}

export function detectEscalation(incidents: Incident[]): EscalationAnalysis {
  if (incidents.length < 2) return { isEscalating: false, reasons: [] };

  const sorted = [...incidents].sort(
    (a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime()
  );

  const reasons: string[] = [];

  // Check severity progression across last 2-3 incidents
  const recent = sorted.slice(0, 3).reverse();
  if (recent.length >= 2) {
    let increasing = true;
    for (let i = 1; i < recent.length; i++) {
      if (
        recent[i].severity_score === null ||
        recent[i - 1].severity_score === null ||
        recent[i].severity_score! < recent[i - 1].severity_score!
      ) {
        increasing = false;
        break;
      }
    }
    if (increasing && recent[recent.length - 1].severity_score! > recent[0].severity_score!) {
      reasons.push('Severity has increased across recent incidents');
    }
  }

  // Check frequency: 2+ incidents within 7 days
  if (sorted.length >= 2) {
    const lastDate = new Date(sorted[0].incident_date);
    const secondLastDate = new Date(sorted[1].incident_date);
    const diffDays = (lastDate.getTime() - secondLastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) {
      reasons.push('Incidents are becoming more frequent (2+ within 7 days)');
    }
  }

  // Check high-risk keywords
  const highRiskKeywords = [
    'weapon', 'strangl', 'choke', 'threat to children', 'children', 'confin', 'kill', 'murder', 'burn', 'acid'
  ];
  for (const inc of sorted.slice(0, 3)) {
    if (inc.risk_keywords_detected) {
      for (const kw of inc.risk_keywords_detected) {
        if (highRiskKeywords.some((hrk) => kw.toLowerCase().includes(hrk))) {
          reasons.push(`High-risk keyword detected: "${kw}"`);
          break;
        }
      }
    }
  }

  return { isEscalating: reasons.length > 0, reasons };
}

export interface DangerFactors {
  frequency: { label: string; value: number; detail: string };
  severity: { label: string; value: number; detail: string };
  recency: { label: string; value: number; detail: string };
  overall: { label: string; value: number };
}

export function computeDangerFactors(incidents: Incident[]): DangerFactors {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentIncidents = incidents.filter(
    (i) => new Date(i.incident_date) >= thirtyDaysAgo
  );

  // Frequency: 0-5+ incidents in last 30 days → 0-100
  const freqCount = recentIncidents.length;
  const freqValue = Math.min(100, freqCount * 20);
  const freqLabel =
    freqCount === 0 ? 'No recent incidents' :
    freqCount === 1 ? 'Low frequency' :
    freqCount <= 3 ? 'Moderate frequency' :
    'High frequency';

  // Severity: average of recent incident severities → 1-4 mapped to 0-100
  let sevValue = 0;
  let sevLabel = 'No data';
  let sevDetail = 'No recent incidents to evaluate';
  if (recentIncidents.length > 0) {
    const validSeverities = recentIncidents.filter((i) => i.severity_score !== null);
    if (validSeverities.length > 0) {
      const avg = validSeverities.reduce((sum, i) => sum + i.severity_score!, 0) / validSeverities.length;
      sevValue = Math.round((avg / 4) * 100);
      sevLabel = avg >= 3.5 ? 'High severity' : avg >= 2.5 ? 'Moderate severity' : avg >= 1.5 ? 'Low-moderate' : 'Low severity';
      sevDetail = `Average severity: ${avg.toFixed(1)} / 4`;
    }
  }

  // Recency: days since last incident → 0 (very recent) to 100 (long ago)
  let recValue = 0;
  let recLabel = 'No incidents';
  let recDetail = 'No incidents recorded';
  if (incidents.length > 0) {
    const sorted = [...incidents].sort(
      (a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime()
    );
    const lastDate = new Date(sorted[0].incident_date);
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    recValue = Math.min(100, daysSince * 3);
    recLabel = daysSince <= 2 ? 'Very recent' : daysSince <= 7 ? 'Recent' : daysSince <= 30 ? 'Somewhat recent' : 'Less recent';
    recDetail = `Last incident: ${daysSince} day${daysSince === 1 ? '' : 's'} ago`;
  }

  const overall = Math.round((freqValue + sevValue + (100 - recValue)) / 3);
  let overallLabel = 'Low concern';
  if (overall >= 67) overallLabel = 'High concern';
  else if (overall >= 34) overallLabel = 'Moderate concern';

  return {
    frequency: { label: freqLabel, value: freqValue, detail: `${freqCount} incident${freqCount === 1 ? '' : 's'} in last 30 days` },
    severity: { label: sevLabel, value: sevValue, detail: sevDetail },
    recency: { label: recLabel, value: 100 - recValue, detail: recDetail },
    overall: { label: overallLabel, value: overall },
  };
}

export function getCategoryLabel(category: string | null): string {
  const labels: Record<string, string> = {
    verbal_abuse: 'Verbal / Emotional Abuse',
    threat: 'Threat / Intimidation',
    physical_abuse: 'Physical Abuse',
    economic_abuse: 'Economic Abuse',
    stalking_control: 'Stalking / Control',
  };
  return category ? labels[category] || category : 'Uncategorized';
}

export function getSeverityLabel(score: number | null): string {
  if (score === null) return 'Not classified';
  const labels: Record<number, string> = {
    1: 'Verbal / Emotional',
    2: 'Threat',
    3: 'Physical Abuse',
    4: 'Physical Abuse (Weapon / Severe)',
  };
  return labels[score] || 'Unknown';
}

export function getSeverityColor(score: number | null): string {
  if (score === null) return '#8A7B92';
  if (score <= 1) return '#3FA37E';
  if (score === 2) return '#E8579E';
  if (score === 3) return '#E0563D';
  return '#E0563D';
}
