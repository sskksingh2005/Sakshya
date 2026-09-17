import { AlertTriangle } from 'lucide-react';
import type { EscalationAnalysis } from '@/lib/utils';

export function EscalationBanner({ analysis }: { analysis: EscalationAnalysis }) {
  if (!analysis.isEscalating) return null;

  return (
    <div className="rounded-xl border border-danger/30 bg-danger/8 p-4 animate-fade-in">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-danger mb-1">Escalation Pattern Detected</p>
          <ul className="text-sm text-ink space-y-0.5 mb-2">
            {analysis.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-danger">•</span>
                {r}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted italic">
            This is an informational pattern flag, not a diagnosis. If you are in immediate danger, call 112 or 181.
          </p>
        </div>
      </div>
    </div>
  );
}
