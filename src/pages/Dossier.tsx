import { useState, useEffect, useCallback } from 'react';
import { Download, FileCheck, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Incident, Evidence } from '@/types';
import { AppNav } from '@/components/AppNav';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { getCategoryLabel, getSeverityLabel } from '@/lib/utils';

export function Dossier() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, Evidence[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    const { data: inc } = await supabase
      .from('incidents')
      .select('*')
      .order('incident_date', { ascending: true });

    setIncidents((inc || []) as Incident[]);

    if (inc && inc.length > 0) {
      const { data: ev } = await supabase
        .from('evidence')
        .select('*');
      const map: Record<string, Evidence[]> = {};
      (ev || []).forEach((e: Evidence) => {
        if (!map[e.incident_id]) map[e.incident_id] = [];
        map[e.incident_id].push(e as Evidence);
      });
      setEvidenceMap(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generatePDF = () => {
    setGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = margin;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(0x3d, 0x1f, 0x5c);
      doc.text('Sakshya — Evidence Dossier', margin, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0x8a, 0x7b, 0x92);
      const caseId = `SAK-${Date.now().toString(36).toUpperCase()}`;
      doc.text(`Case Identifier: ${caseId}`, margin, y);
      y += 5;
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y);
      y += 5;
      doc.text(`Account holder: ${user?.email || 'Unknown'}`, margin, y);
      y += 5;
      doc.text(`Total incidents: ${incidents.length}`, margin, y);
      y += 10;

      // Divider
      doc.setDrawColor(0xd6, 0x20, 0x8f);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Incident timeline
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0x3d, 0x1f, 0x5c);
      doc.text('Incident Timeline', margin, y);
      y += 8;

      incidents.forEach((inc, idx) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0x2a, 0x1b, 0x3d);
        doc.text(`Incident ${idx + 1}: ${new Date(inc.incident_date).toLocaleDateString('en-IN')}`, margin, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0x6b, 0x2f, 0xa0);
        doc.text(`Category: ${getCategoryLabel(inc.category)}`, margin, y);
        y += 5;
        doc.text(`Severity: ${getSeverityLabel(inc.severity_score)}`, margin, y);
        y += 5;

        if (inc.escalation_flag) {
          doc.setTextColor(0xe0, 0x56, 0x3d);
          doc.text('Escalation flag: YES', margin, y);
          y += 5;
          doc.setTextColor(0x6b, 0x2f, 0xa0);
        }

        // Description
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0x2a, 0x1b, 0x3d);
        const descLines = doc.splitTextToSize(`Description: ${inc.description}`, pageWidth - 2 * margin);
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 2;

        if (inc.ai_summary) {
          const sumLines = doc.splitTextToSize(`AI Summary: ${inc.ai_summary}`, pageWidth - 2 * margin);
          doc.text(sumLines, margin, y);
          y += sumLines.length * 5 + 2;
        }

        if (inc.people_involved && inc.people_involved.length > 0) {
          doc.text(`People involved: ${inc.people_involved.join(', ')}`, margin, y);
          y += 5;
        }

        // Evidence inventory
        const evList = evidenceMap[inc.id] || [];
        if (evList.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('Evidence files:', margin, y);
          y += 5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          evList.forEach((ev) => {
            if (y > pageHeight - 20) {
              doc.addPage();
              y = margin;
            }
            doc.text(`  - ${ev.filename} | Hash: ${ev.sha256_hash} | Uploaded: ${new Date(ev.uploaded_at).toLocaleString('en-IN')} | Consent: ${ev.consent_status}`, margin, y);
            y += 4;
          });
          y += 4;
        }

        y += 4;
      });

      // Section 63 Certificate
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin;
      }

      y += 10;
      doc.setDrawColor(0xd6, 0x20, 0x8f);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0x3d, 0x1f, 0x5c);
      doc.text('Section 63(4) Certificate — Bharatiya Sakshya Adhiniyam, 2023', margin, y);
      y += 10;

      // Part A
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Part A — Certificate of the Person in Possession of the Device', margin, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0x2a, 0x1b, 0x3d);
      const partALines = doc.splitTextToSize(
        `I, ${user?.email || 'Account Holder'}, certify that the electronic records contained in this dossier were produced and stored on a device under my control. The hash values (SHA-256) listed for each evidence file are computed from the original files. This certificate is produced in accordance with Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023.`,
        pageWidth - 2 * margin
      );
      doc.text(partALines, margin, y);
      y += partALines.length * 5 + 5;

      doc.text('Signature: ____________________________', margin, y);
      y += 5;
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, margin, y);
      y += 10;

      // Part B
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0x3d, 0x1f, 0x5c);
      doc.text('Part B — Certificate of the Expert (To Be Completed)', margin, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0x8a, 0x7b, 0x92);
      const partBLines = doc.splitTextToSize(
        'This section must be completed and signed by a qualified person with demonstrable expertise in computer forensics or computer science, as per the Supreme Court ruling in Pune Bar Association v. Union of India (May 2026). The expert must verify the electronic record and the process of its production.',
        pageWidth - 2 * margin
      );
      doc.text(partBLines, margin, y);
      y += partBLines.length * 5 + 5;

      doc.setTextColor(0x2a, 0x1b, 0x3d);
      doc.text('Expert Name: ____________________________', margin, y);
      y += 5;
      doc.text('Qualifications: ____________________________', margin, y);
      y += 5;
      doc.text('Signature: ____________________________', margin, y);
      y += 5;
      doc.text('Date: ____________________________', margin, y);
      y += 15;

      // Disclaimer
      if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
      }

      doc.setDrawColor(0xe0, 0x56, 0x3d);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0xe0, 0x56, 0x3d);
      doc.text('Disclaimer', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const disclaimerLines = doc.splitTextToSize(
        'This dossier is a structured preparation document. It is not automatically admissible in court. Part B of the Section 63(4) certificate must be completed and signed by a qualified expert. Please seek legal guidance before submitting this document as evidence.',
        pageWidth - 2 * margin
      );
      doc.text(disclaimerLines, margin, y);

      doc.save(`sakshya-dossier-${caseId}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    }

    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-blush/60">
      <AppNav />
      <main className="md:ml-60 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary mb-1">Evidence Dossier</h1>
            <p className="text-xs md:text-sm text-muted">
              Generate a structured preparation dossier with your incident timeline, evidence inventory, and Section 63 certificate draft.
            </p>
          </div>

          {loading ? (
            <LoadingState message="Compiling dossier records..." className="py-20" />
          ) : incidents.length === 0 ? (
            <EmptyState
              title="No incidents to include in dossier"
              description="Add incidents to your vault first, then return here to generate your structured PDF dossier."
              action={
                <Button onClick={() => window.location.hash = '#/incidents/new'} variant="primary" size="sm">
                  Add Incident
                </Button>
              }
            />
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Summary card */}
              <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-4">
                <h2 className="font-heading text-base font-semibold text-primary">Dossier Contents Summary</h2>
                <div className="space-y-3 text-xs text-ink">
                  <div className="flex items-center gap-2.5">
                    <FileCheck size={18} className="text-success shrink-0" />
                    <span><strong>{incidents.length}</strong> incident record{incidents.length > 1 ? 's' : ''} with full descriptions & metadata</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FileCheck size={18} className="text-success shrink-0" />
                    <span><strong>{Object.values(evidenceMap).flat().length}</strong> evidence file{Object.values(evidenceMap).flat().length !== 1 ? 's' : ''} with cryptographic SHA-256 hashes</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FileCheck size={18} className="text-success shrink-0" />
                    <span>Section 63(4) Part A certificate draft (Bharatiya Sakshya Adhiniyam, 2023)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <AlertCircle size={18} className="text-amber-500 shrink-0" />
                    <span>Section 63(4) Part B certificate template (requires expert signature)</span>
                  </div>
                </div>
              </div>

              {/* Legal admissibility disclaimer */}
              <div className="rounded-2xl bg-warmwhite border border-border p-5 shadow-sm flex items-start gap-3">
                <AlertCircle size={20} className="text-muted shrink-0 mt-0.5" />
                <div className="text-xs text-ink leading-relaxed">
                  <strong className="text-ink block mb-0.5">Structured Evidence Disclaimer</strong>
                  This dossier is a structured evidence preparation document. It is not automatically admissible in court. Part B of the Section 63(4) certificate must be completed and signed by a qualified computer forensics expert. Please consult a qualified legal professional before submitting.
                </div>
              </div>

              {/* PDF generation action */}
              <Button
                onClick={generatePDF}
                variant="primary"
                size="lg"
                fullWidth
                loading={generating}
                disabled={!navigator.onLine}
                leftIcon={<Download size={18} />}
              >
                {generating ? 'Generating PDF Dossier...' : 'Generate & Download Dossier'}
              </Button>

              {!navigator.onLine && (
                <p className="text-xs text-danger text-center">
                  You are offline. Generating dossier PDF requires an active connection.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
