import { useState } from 'react';
import { Info, X } from 'lucide-react';

const DEMO_FEATURES = [
  { name: 'AI incident classification', status: 'Live (OpenAI API)' },
  { name: 'Escalation detection', status: 'Live (rule-based, LLM-assisted)' },
  { name: 'Danger score', status: 'Live (explainable heuristic — demo only, not validated)' },
  { name: 'Evidence hashing (SHA-256)', status: 'Live' },
  { name: 'PDF dossier export', status: 'Live' },
  { name: 'Legal-aid directory', status: 'Live (static, manually verified contact list)' },
  { name: 'Section 63 Part A certificate', status: 'Live (auto-drafted)' },
  { name: 'Section 63 Part B certificate', status: 'Simulated (requires a real human expert signature)' },
  { name: 'Silent SOS', status: 'Simulated (shows a mock alert, does not send a real message)' },
  { name: 'Offline mode', status: 'Live for viewing already-loaded data only. Adding new incidents requires an internet connection.' },
];

export function DemoModeBadge() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-secondary transition-colors"
        aria-label="Demo mode information"
      >
        <Info size={12} />
        Demo Mode
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-warmwhite p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-primary">Demo Mode — Live vs. Simulated</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted">
              This is a hackathon MVP. Some features are fully functional, while others are simulated for demonstration. Here's the honest breakdown:
            </p>
            <ul className="space-y-2">
              {DEMO_FEATURES.map((f) => (
                <li key={f.name} className="flex flex-col gap-0.5 rounded-lg bg-blush/50 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{f.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        f.status.startsWith('Live')
                          ? 'bg-success/15 text-success'
                          : 'bg-danger/15 text-danger'
                      }`}
                    >
                      {f.status.startsWith('Live') ? 'Live' : 'Simulated'}
                    </span>
                  </div>
                  <span className="text-xs text-muted">{f.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
