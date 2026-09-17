import { AlertTriangle } from 'lucide-react';
import type { DangerFactors } from '@/lib/utils';

export function DangerIndicator({ factors }: { factors: DangerFactors }) {
  const barColor = (val: number) => {
    if (val >= 67) return '#E0563D';
    if (val >= 34) return '#E8579E';
    return '#3FA37E';
  };

  const labelColor = (val: number) => {
    if (val >= 67) return 'text-danger';
    if (val >= 34) return 'text-accent';
    return 'text-success';
  };

  return (
    <div className="rounded-2xl bg-warmwhite p-5 shadow-sm border border-blush">
      <div className="mb-4">
        <h3 className="font-heading text-base font-semibold text-primary">Safety-Planning Indicator</h3>
        <p className="text-xs text-muted mt-0.5">
          Explainable safety-planning indicator — a demo heuristic, not a validated risk prediction.
        </p>
      </div>

      {/* Overall */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-ink">Overall Concern</span>
          <span className={`text-sm font-semibold ${labelColor(factors.overall.value)}`}>
            {factors.overall.label}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-blush overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${factors.overall.value}%`, backgroundColor: barColor(factors.overall.value) }}
          />
        </div>
      </div>

      {/* Individual factors */}
      <div className="space-y-3">
        <FactorBar
          label="Frequency"
          value={factors.frequency.value}
          detail={factors.frequency.detail}
          label_={factors.frequency.label}
          barColor={barColor}
          labelColor={labelColor}
        />
        <FactorBar
          label="Severity"
          value={factors.severity.value}
          detail={factors.severity.detail}
          label_={factors.severity.label}
          barColor={barColor}
          labelColor={labelColor}
        />
        <FactorBar
          label="Recency"
          value={factors.recency.value}
          detail={factors.recency.detail}
          label_={factors.recency.label}
          barColor={barColor}
          labelColor={labelColor}
        />
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-blush/60 p-3">
        <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
        <p className="text-xs text-ink">
          If you are in immediate danger, call <strong>112</strong> or <strong>181</strong>.
        </p>
      </div>
    </div>
  );
}

function FactorBar({
  label,
  value,
  detail,
  label_,
  barColor,
  labelColor,
}: {
  label: string;
  value: number;
  detail: string;
  label_: string;
  barColor: (v: number) => string;
  labelColor: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-ink">{label}</span>
        <span className={`text-xs font-semibold ${labelColor(value)}`}>{label_}</span>
      </div>
      <div className="h-2 rounded-full bg-blush overflow-hidden mb-0.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: barColor(value) }}
        />
      </div>
      <p className="text-[11px] text-muted">{detail}</p>
    </div>
  );
}
