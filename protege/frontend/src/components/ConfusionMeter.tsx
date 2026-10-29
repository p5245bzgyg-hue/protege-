export function confusionColor(v: number): string {
  if (v > 70) return "#DC2626";
  if (v > 55) return "#EA580C";
  if (v >= 40) return "#D97706";
  return "#16A34A";
}

export function confusionLabel(v: number): string {
  if (v > 80) return "Totally lost";
  if (v > 60) return "Pretty confused";
  if (v >= 40) return "Starting to follow";
  if (v >= 20) return "Getting it";
  return "Crystal clear";
}

interface Props {
  value: number | null;
}

export default function ConfusionMeter({ value }: Props) {
  const v = value ?? 0;
  const color = confusionColor(v);
  return (
    <div data-testid="confusion-meter" className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Student confusion
          </p>
          <p data-testid="confusion-status-label" className="mt-1 text-sm text-stone-600">
            {value === null ? "Waiting for your first explanation" : confusionLabel(v)}
          </p>
        </div>
        <p
          data-testid="confusion-number"
          className="font-serif text-4xl font-medium tabular-nums transition-colors duration-700"
          style={{ color: value === null ? "#A8A29E" : color }}
        >
          {value === null ? "—" : v}
          <span className="ml-0.5 text-base text-stone-400">/100</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Student confusion level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        className="h-3 w-full overflow-hidden rounded-full bg-stone-200"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${value === null ? 0 : Math.max(v, 2)}%`,
            backgroundColor: color,
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}
