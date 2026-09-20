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
  try {
    const { data, error } = await supabase.functions.invoke<ClassifyResult>('classify-incident', {
      body: { description, category },
    });

    if (error) {
      return { result: null, error: error.message };
    }

    if (!data || !data.category || typeof data.severity_score !== 'number') {
      return { result: null, error: 'Invalid response from classification service' };
    }

    return { result: data, error: null };
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export interface WhatsAppMessage {
  id: string;
  date: string | null;
  time: string | null;
  sender: string | null;
  text: string;
  raw: string;
}

export interface WhatsAppImportData {
  fileName: string;
  messages: WhatsAppMessage[];
  participants: string[];
  dateRange: { start: string | null; end: string | null } | null;
  preview: string;
}

function isWhatsAppSystemMessage(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('messages and calls are end-to-end encrypted') ||
    normalized.includes('security code changed') ||
    normalized.includes('created this group') ||
    normalized.includes('added you') ||
    normalized.includes('left') ||
    normalized.includes('joined using this link') ||
    normalized.includes('changed the group description') ||
    normalized.includes('changed this group') ||
    normalized.includes('message deleted') ||
    normalized.includes('this message was deleted') ||
    normalized.includes('you were added')
  );
}

function normalizeWhatsAppDate(rawDate: string): string | null {
  const trimmed = rawDate.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const euMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (euMatch) {
    const [, day, month, yearPart] = euMatch;
    const year = Number(yearPart) < 100 ? 2000 + Number(yearPart) : Number(yearPart);
    return `${year}-${Number(month).toString().padStart(2, '0')}-${Number(day).toString().padStart(2, '0')}`;
  }

  return null;
}

function parseImportedMessageLine(line: string): {
  date: string | null;
  time: string | null;
  sender: string | null;
  text: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed || isWhatsAppSystemMessage(trimmed)) return null;

  const bracketMatch = trimmed.match(/^\[(.+?),\s*(.+?)\]\s*([^:]+):\s*(.*)$/);
  if (bracketMatch) {
    const [, rawDate, rawTime, sender, text] = bracketMatch;
    return {
      date: normalizeWhatsAppDate(rawDate),
      time: rawTime ? rawTime.trim() : null,
      sender: sender ? sender.trim() : null,
      text: text.trim(),
    };
  }

  const dashMatch = trimmed.match(/^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),\s*([^\-]+?)\s*-\s*([^:]+):\s*(.*)$/);
  if (dashMatch) {
    const [, rawDate, rawTime, sender, text] = dashMatch;
    return {
      date: normalizeWhatsAppDate(rawDate),
      time: rawTime ? rawTime.trim() : null,
      sender: sender ? sender.trim() : null,
      text: text.trim(),
    };
  }

  const bareMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
  if (bareMatch && !trimmed.startsWith('[')) {
    const [, sender, text] = bareMatch;
    if (!sender || !text) return null;
    return {
      date: null,
      time: null,
      sender: sender.trim(),
      text: text.trim(),
    };
  }

  return null;
}

export function parseWhatsAppChat(content: string): WhatsAppImportData | null {
  const text = (content || '').trim();
  if (!text) {
    return null;
  }

  const messages: WhatsAppMessage[] = [];
  let current: WhatsAppMessage | null = null;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = parseImportedMessageLine(trimmed);
    if (parsed) {
      if (current && current.text.trim()) {
        messages.push(current);
      }
      current = {
        id: `${messages.length + 1}-${Date.now()}`,
        date: parsed.date,
        time: parsed.time,
        sender: parsed.sender,
        text: parsed.text,
        raw: trimmed,
      };
      continue;
    }

    if (current && trimmed) {
      current.text = `${current.text}\n${trimmed}`.trim();
      current.raw = `${current.raw}\n${trimmed}`;
    }
  }

  if (current && current.text.trim()) {
    messages.push(current);
  }

  const validMessages = messages.filter((item) => item.text && item.text.trim().length > 0);
  if (validMessages.length === 0) {
    return null;
  }

  const participants = [...new Set(validMessages.map((item) => item.sender).filter(Boolean) as string[])];
  const dates = validMessages.map((item) => item.date).filter(Boolean) as string[];
  const dateRange = dates.length > 0
    ? { start: dates.reduce((min, current) => (current < min ? current : min), dates[0]), end: dates.reduce((max, current) => (current > max ? current : max), dates[0]) }
    : null;

  const preview = validMessages.slice(0, 3).map((message) => {
    const label = message.sender ? `${message.sender}: ` : '';
    return `${label}${message.text}`;
  }).join('\n\n');

  return {
    fileName: 'WhatsApp Chat',
    messages: validMessages,
    participants,
    dateRange,
    preview,
  };
}

export async function analyzeWhatsAppChat(
  importData: WhatsAppImportData,
  category?: string | null
): Promise<{ description: string; category: string | null; severity_score: number; people_involved: string[]; risk_keywords_detected: string[]; summary: string; date: string | null; error: string | null }> {
  if (!importData.messages.length) {
    return {
      description: '',
      category: category || null,
      severity_score: 1,
      people_involved: [],
      risk_keywords_detected: [],
      summary: '',
      date: importData.dateRange?.start || null,
      error: 'No valid WhatsApp messages were found in this file.',
    };
  }

  const participants = importData.participants.length > 0 ? importData.participants.join(', ') : 'unknown participants';
  const dateText = importData.dateRange
    ? ` between ${importData.dateRange.start ?? 'an unknown date'} and ${importData.dateRange.end ?? 'an unknown date'}`
    : '';

  const messageQuotes = importData.messages
    .map((item) => item.text)
    .filter((text) => text.length > 0)
    .slice(0, 3)
    .join(' ');

  const description = [
    `Based only on the imported WhatsApp chat file, this conversation includes ${importData.messages.length} messages from ${participants}${dateText}.`,
    messageQuotes
      ? `The imported messages contain statements such as: "${messageQuotes.slice(0, 280)}".`
      : 'The file contains message content, but no clear statement was available for a direct quote in the imported text.',
    'This summary is based only on the imported WhatsApp content and should be reviewed before saving as an incident record.',
  ].join(' ');

  const { result, error } = await classifyIncident(description, category || null);

  return {
    description: result?.summary?.trim() || description,
    category: result?.category || category || null,
    severity_score: result?.severity_score || 1,
    people_involved: result?.people_involved || importData.participants,
    risk_keywords_detected: result?.risk_keywords_detected || [],
    summary: result?.summary?.trim() || description,
    date: importData.dateRange?.start || null,
    error: error ? 'AI analysis could not complete for this WhatsApp import. Please review the messages and make any needed edits before saving.' : null,
  };
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

export interface TimelineBriefEvent {
  date: string;
  title: string;
}

export interface TimelineBrief {
  totalIncidents: number;
  dateRange: string | null;
  summary: string;
  keyEvents: TimelineBriefEvent[];
  categories: string[];
  severities: string[];
  pattern: string | null;
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function buildTimelineBrief(incidents: Incident[]): TimelineBrief | null {
  const sorted = [...incidents]
    .filter((incident) => incident.incident_date)
    .sort((a, b) => new Date(a.incident_date).getTime() - new Date(b.incident_date).getTime());

  if (sorted.length < 5) {
    return null;
  }

  const validDates = sorted.filter((incident) => !Number.isNaN(new Date(incident.incident_date).getTime()));
  if (validDates.length === 0) {
    return null;
  }

  const earliest = validDates[0];
  const latest = validDates[validDates.length - 1];
  const categoryCounts = new Map<string, number>();
  const severityCounts = new Map<string, number>();

  sorted.forEach((incident) => {
    const category = incident.category ? getCategoryLabel(incident.category) : 'Uncategorized';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

    const severity = incident.severity_score === null ? 'Not classified' : getSeverityLabel(incident.severity_score);
    severityCounts.set(severity, (severityCounts.get(severity) || 0) + 1);
  });

  const topCategoryEntry = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const topSeverityEntry = Array.from(severityCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  const summaryParts: string[] = [
    `This account includes ${sorted.length} documented incident${sorted.length === 1 ? '' : 's'}.`,
  ];

  const dateRange = `${formatDateLabel(earliest.incident_date)} – ${formatDateLabel(latest.incident_date)}`;
  if (topCategoryEntry) {
    summaryParts.push(`The most common category was ${topCategoryEntry[0]} (${topCategoryEntry[1]} of ${sorted.length}).`);
  }
  if (topSeverityEntry) {
    summaryParts.push(`The most common severity was ${topSeverityEntry[0]}.`);
  }
  summaryParts.push(`The dates span ${dateRange}.`);

  const keyEvents: TimelineBriefEvent[] = sorted
    .slice(-3)
    .reverse()
    .map((incident) => ({
      date: formatDateLabel(incident.incident_date),
      title: `${incident.category ? getCategoryLabel(incident.category) : 'Incident'}${incident.severity_score !== null ? ` · ${getSeverityLabel(incident.severity_score)}` : ''}`,
    }));

  let pattern: string | null = null;
  if (topCategoryEntry && topCategoryEntry[1] >= 2) {
    pattern = `${topCategoryEntry[0]} appears in ${topCategoryEntry[1]} of ${sorted.length} incidents in this record.`;
  } else if (topSeverityEntry && topSeverityEntry[1] >= 2) {
    pattern = `${topSeverityEntry[0]} is the most frequent severity label across these incidents.`;
  }

  return {
    totalIncidents: sorted.length,
    dateRange,
    summary: summaryParts.join(' '),
    keyEvents,
    categories: Array.from(categoryCounts.keys()),
    severities: Array.from(severityCounts.keys()),
    pattern,
  };
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
