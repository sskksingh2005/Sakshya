import { FileText, AlertTriangle, Scale, Lock, Info } from 'lucide-react';
import { AppNav } from '@/components/AppNav';

export function Safety() {
  return (
    <div className="min-h-screen bg-blush/60">
      <AppNav />
      <main className="md:ml-60 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary mb-1">Safety & Legal Information</h1>
            <p className="text-xs md:text-sm text-muted">
              Plain-language guide to digital evidence integrity, Section 63 certificates, and safety principles.
            </p>
          </div>

          {/* Cryptographic Hash */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">What is a SHA-256 Evidence Hash?</h2>
            </div>
            <p className="text-xs text-ink leading-relaxed">
              A SHA-256 hash is a cryptographic digital fingerprint for a file. It generates a unique string from the file's binary contents. If even a single byte or pixel is altered, the hash changes completely.
            </p>
            <p className="text-xs text-ink leading-relaxed">
              Sakshya computes this SHA-256 fingerprint immediately when you select a file. This establishes a <strong>verifiable chain of custody</strong> — proving the evidence was preserved without tampering from the exact moment of upload.
            </p>
          </div>

          {/* Section 63 */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <Scale size={20} />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">Section 63(4) — Two-Part Certificate Standard</h2>
            </div>
            <p className="text-xs text-ink leading-relaxed">
              Under <strong>Section 63 of the Bharatiya Sakshya Adhiniyam, 2023</strong>, electronic records require a two-part certificate for court admissibility:
            </p>
            <ul className="space-y-2 text-xs text-ink pl-1">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span><strong>Part A</strong> — Certificate signed by the device custodian (you). Sakshya auto-drafts this based on your account details and file hashes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span><strong>Part B</strong> — Certificate signed by a computer forensics or computer science expert verifying the record. <span className="text-muted">Must be completed by a qualified expert. Sakshya does not provide legal advice or legal certification.</span></span>
              </li>
            </ul>
          </div>

          {/* Pune Bar Association Ruling */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Info size={20} />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">Legal Precedent — Pune Bar Association Ruling</h2>
            </div>
            <p className="text-xs text-ink leading-relaxed">
              In <em>Pune Bar Association v. Union of India</em>, the Supreme Court clarified that Part B of Section 63 certificate does not require a government-notified examiner. Any professional with demonstrable computer science or digital forensics expertise can fulfill Part B requirements.
            </p>
          </div>

          {/* Decoy Disguise Limitation */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-6 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">Decoy Disguise Guidance</h2>
            </div>
            <p className="text-xs text-ink leading-relaxed">
              The calculator entry mode provides a visual deterrent on device screens. However, browser history, bookmarks, and network records may remain visible on shared or monitored devices.
            </p>
            <p className="text-xs text-muted">
              For high-risk environments, clear your browser history or use private browsing mode after exiting.
            </p>
          </div>

          {/* Emergency Box */}
          <div className="rounded-2xl bg-danger/10 border border-danger/20 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-danger shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-danger">Immediate Danger Notice</p>
                <p className="text-xs text-ink leading-relaxed">
                  If you are in immediate physical danger, call <strong>112</strong> (National Emergency Response) or <strong>181</strong> (Women Helpline) immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
