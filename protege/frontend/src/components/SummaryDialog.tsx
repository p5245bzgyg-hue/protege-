import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SummaryResponse } from "@/lib/types";
import { CheckCircle2, CircleAlert, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SummaryResponse | undefined;
  loading: boolean;
  error: string | null;
}

export default function SummaryDialog({ open, onOpenChange, data, loading, error }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="summary-dialog" className="max-h-[90vh] overflow-y-auto bg-white p-6 sm:max-w-lg sm:p-8">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium">How did you do?</DialogTitle>
          <DialogDescription>An honest look at your teaching across every round.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div data-testid="summary-loading" className="flex items-center gap-3 py-8 text-stone-600">
            <ThinkingDots /> Reviewing your lesson…
          </div>
        )}
        {error && !loading && (
          <p data-testid="summary-error" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </p>
        )}
        {data && !loading && !error && (
          <div className="mt-2 space-y-6">
            <section>
              <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                What you did well
              </h3>
              <ul data-testid="summary-did-well-list" className="space-y-2">
                {data.did_well.map((x, i) => (
                  <li key={i} className="flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {x}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-800">
                What you missed
              </h3>
              <ul data-testid="summary-missed-list" className="space-y-2">
                {data.missed.map((x, i) => (
                  <li key={i} className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" /> {x}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-blue-800">
                Next step
              </h3>
              <p data-testid="summary-next-step" className="flex gap-2 text-sm text-blue-900">
                <ArrowRight className="mt-0.5 size-4 shrink-0" /> {data.next_step}
              </p>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-think rounded-full bg-current"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
