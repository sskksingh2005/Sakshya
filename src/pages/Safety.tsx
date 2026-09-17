import { Shield, FileText, AlertTriangle, Scale, Lock, Info } from 'lucide-react';
import { AppNav } from '@/components/AppNav';

export function Safety() {
  return (
    <div className="min-h-screen bg-blush">
      <AppNav />
      <main className="md:ml-60 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <h1 className="font-heading text-2xl font-bold text-primary mb-1">Safety & Legal Information</h1>
          <p className="text-sm text-muted mb-6">
            Plain-language information about evidence, legal standards, and the limits of this tool.
          </p>

          {/* What is a hash */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText size={16} className="text-primary" />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">What is a SHA-256 hash?</h2>
            </div>
            <p className="text-sm text-ink leading-relaxed mb-2">
              A SHA-256 hash is like a digital fingerprint for a file. It's a unique string of characters generated from the file's contents — if even a single pixel in a photo or a single letter in a document changes, the hash changes completely.
            </p>
            <p className="text-sm text-ink leading-relaxed">
              Sakshya computes this hash for every evidence file you upload. This helps establish a <strong>chain of custody</strong> — a verifiable record that the file has not been tampered with from the moment you uploaded it. In court, this strengthens the credibility of your evidence.
            </p>
          </div>

          {/* Section 63 */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Scale size={16} className="text-secondary" />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">Section 63(4) — Two-Part Certificate</h2>
            </div>
            <p className="text-sm text-ink leading-relaxed mb-2">
              Under <strong>Section 63 of the Bharatiya Sakshya Adhiniyam, 2023</strong>, secondary electronic evidence (like screenshots, recordings, or digital documents) requires a two-part certificate to be admissible in court:
            </p>
            <ul className="space-y-2 text-sm text-ink ml-4">
              <li className="list-disc">
                <strong>Part A</strong> — Signed by the person in possession of the device that produced the electronic record. Sakshya auto-drafts this for you based on your account details and evidence hashes.
              </li>
              <li className="list-disc">
                <strong>Part B</strong> — Signed by a qualified expert in computer forensics or computer science who verifies the electronic record. <span className="text-muted">This must be completed by a real human expert — Sakshya cannot do this for you.</span>
              </li>
            </ul>
          </div>

          {/* Pune Bar Association */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Info size={16} className="text-accent" />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">Pune Bar Association Ruling (May 2026)</h2>
            </div>
            <p className="text-sm text-ink leading-relaxed">
              In <em>Pune Bar Association v. Union of India</em> (22 May 2026), the Supreme Court confirmed that Part B of the Section 63 certificate does <strong>not</strong> require a government-notified examiner. Any person with demonstrable expertise in computer forensics or computer science can sign Part B, as long as the court is satisfied with their qualifications.
            </p>
            <p className="text-sm text-muted mt-2">
              This makes it easier for survivors to find a qualified expert to complete their evidence certificate.
            </p>
          </div>

          {/* Browser disguise limitation */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                <Lock size={16} className="text-danger" />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">Honest Limitation: Browser Disguise</h2>
            </div>
            <p className="text-sm text-ink leading-relaxed mb-2">
              The calculator disguise is a <strong>deterrent, not a guarantee</strong>. A browser-based disguise is more discoverable than a native app's hidden icon — browser history, bookmarks, and tabs can reveal that Sakshya exists.
            </p>
            <p className="text-sm text-muted">
              A future version of Sakshya should offer a cloud-only, no-local-footprint access mode for high-risk situations. This is on our Phase 2 roadmap.
            </p>
          </div>

          {/* Call recording consent */}
          <div className="rounded-2xl bg-warmwhite border border-blush p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <Shield size={16} className="text-success" />
              </div>
              <h2 className="font-heading text-base font-semibold text-primary">Call Recording Consent Laws</h2>
            </div>
            <p className="text-sm text-ink leading-relaxed">
              Call-recording consent laws vary by state in India. Some states require all parties to consent to a recording, while others require only one party's consent. Sakshya asks you to record the consent status for audio evidence — this metadata is preserved alongside the file and included in your dossier.
            </p>
            <p className="text-sm text-muted mt-2">
              Always check the consent requirements in your state before recording. When in doubt, consult a legal aid service.
            </p>
          </div>

          {/* Emergency */}
          <div className="rounded-xl bg-danger/8 border border-danger/20 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-danger mb-1">If you are in immediate danger</p>
                <p className="text-sm text-ink">
                  Call <strong>112</strong> (Emergency Response) or <strong>181</strong> (Women Helpline) immediately. These numbers are available 24x7 and are free to call.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
