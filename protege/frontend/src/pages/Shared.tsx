import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { personaLabel } from "@/lib/library";
import type { SharedSession } from "@/lib/types";
import { confusionColor } from "@/components/ConfusionMeter";

const VERDICT_LABEL = { caught: "Caught", partly: "Partly", missed: "Missed", false_alarm: "Was fine" } as const;

export default function Shared() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["share", id], queryFn: () => apiGet<SharedSession>(`/share/${id}`), retry: false });
  const s = q.isError ? undefined : q.data;
  const first = s?.rounds[0]?.confusion;
  const last = s?.rounds.at(-1)?.confusion;

  return (
    <div className="min-h-screen bg-[#FAF8F5] print:bg-white">
      <header className="border-b border-stone-200/70 print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" data-testid="brand-logo" className="flex items-baseline gap-1.5">
            <span className="font-serif text-2xl font-medium tracking-tight">Protégé</span>
            <span className="size-1.5 rounded-full bg-[#0284C7]" />
          </Link>
          <Button data-testid="shared-print-button" size="sm" variant="outline" onClick={() => window.print()} disabled={!s}>
            <Printer className="size-3.5" /> Print / save PDF
          </Button>
        </div>
      </header>

      <main data-testid="shared-page" className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 print:py-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">Lesson summary · Protégé</p>

        {q.isPending && <div data-testid="shared-loading" className="h-40 animate-pulse rounded-2xl bg-stone-200/60" />}
        {q.isError && (
          <div data-testid="shared-error" className="rounded-2xl border border-stone-200 bg-white p-6">
            <p className="font-serif text-xl">We couldn't load this lesson.</p>
            <p className="mt-1 text-sm text-stone-600">{errorMessage(q.error)}</p>
            <Link to="/" className={buttonVariants({ size: "sm", className: "mt-4" })}>Start your own lesson</Link>
          </div>
        )}

        {s && (
          <>
            <section className="space-y-2">
              <h1 data-testid="shared-topic" className="font-serif text-4xl font-medium leading-tight tracking-tight">{s.topic}</h1>
              <p data-testid="shared-meta" className="text-sm text-stone-600">
                Taught to a {personaLabel(s.persona).toLowerCase()} · {s.rounds.length} round{s.rounds.length > 1 ? "s" : ""} ·{" "}
                {format(new Date(s.created_at), "d MMM yyyy")}
              </p>
              {first !== undefined && last !== undefined && s.rounds.length > 1 && (
                <p data-testid="shared-confusion-change" className="text-sm text-stone-800">
                  Confusion went from <b style={{ color: confusionColor(first) }}>{first}</b> to{" "}
                  <b style={{ color: confusionColor(last) }}>{last}</b>.
                </p>
              )}
            </section>

            <section className="space-y-4">
              {s.rounds.map((r, i) => {
                const flags = new Map(r.flagged.map((f) => [f.sentence_number, f.reason]));
                const sentences = r.sentences.length ? r.sentences : [r.explanation];
                return (
                  <article key={i} data-testid="shared-round" className="break-inside-avoid rounded-2xl border border-stone-200/80 bg-white p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">Round {i + 1}</h2>
                      <p className="text-xs text-stone-600">
                        Confusion <b style={{ color: confusionColor(r.confusion) }}>{r.confusion}</b> · Accuracy {r.scores.accuracy} · Clarity{" "}
                        {r.scores.clarity} · Steps {r.scores.missing_steps} · Plain language {r.scores.jargon}
                      </p>
                    </div>
                    <p className="leading-relaxed text-stone-800">
                      {sentences.map((t, j) => (
                        <span key={j} className={flags.has(j + 1) ? "rounded bg-[#FEF08A] px-0.5 text-[#713F12]" : ""}>{t} </span>
                      ))}
                    </p>
                    {r.flagged.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-[#854D0E]">
                        {r.flagged.map((f) => <li key={f.sentence_number}>Sentence {f.sentence_number}: {f.reason}</li>)}
                      </ul>
                    )}
                    <p className="mt-3 border-l-2 border-stone-300 pl-3 font-serif italic text-stone-700">“{r.question}”</p>
                  </article>
                );
              })}
            </section>

            {s.teachback && (
              <section data-testid="shared-teachback" className="break-inside-avoid rounded-2xl border border-stone-200/80 bg-white p-6">
                <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Teach-back{s.teachback.check ? ` · score ${s.teachback.check.score}/100` : ""}
                </h2>
                <ol className="space-y-2 text-sm">
                  {s.teachback.sentences.map((t, j) => {
                    const n = j + 1;
                    const res = s.teachback?.check?.results.find((r) => r.sentence_number === n);
                    const fix = s.teachback?.corrections.find((c) => c.sentence_number === n);
                    return (
                      <li key={n}>
                        <span className="font-serif italic">{n}. {t}</span>
                        {fix && <span className="block text-stone-600">Fix: {fix.correction}</span>}
                        {res && <span className="block text-stone-500">{VERDICT_LABEL[res.verdict]}: {res.note}</span>}
                      </li>
                    );
                  })}
                </ol>
                {s.teachback.check && <p className="mt-3 text-sm text-stone-700">{s.teachback.check.overall}</p>}
              </section>
            )}

            {s.summary && (
              <section data-testid="shared-summary" className="grid break-inside-avoid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                  <h2 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">Did well</h2>
                  <ul className="list-disc space-y-1 pl-4">{s.summary.did_well.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
                  <h2 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider">Missed</h2>
                  <ul className="list-disc space-y-1 pl-4">{s.summary.missed.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 sm:col-span-2">
                  <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider">Next step</h2>
                  {s.summary.next_step}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
