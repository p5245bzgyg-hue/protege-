import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Repeat2, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type {
  CheckResult, Persona, Round, TeachBack, TeachBackCheckRequest, TeachBackCheckResponse,
  TeachBackRequest, TeachBackResponse,
} from "@/lib/types";
import { ThinkingDots } from "@/components/SummaryDialog";

const VERDICT: Record<CheckResult["verdict"], { label: string; cls: string }> = {
  caught: { label: "Caught it", cls: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  partly: { label: "Partly", cls: "border-amber-200 bg-amber-50 text-amber-900" },
  missed: { label: "Missed", cls: "border-rose-200 bg-rose-50 text-rose-900" },
  false_alarm: { label: "Was fine", cls: "border-stone-200 bg-stone-50 text-stone-700" },
};

interface Props {
  topic: string;
  persona: Persona;
  history: Round[];
  value: TeachBack | null;
  onChange: (tb: TeachBack | null) => void;
}

export default function TeachBackPanel({ topic, persona, history, value, onChange }: Props) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<number | null>(null);

  const start = useMutation({
    mutationFn: (b: TeachBackRequest) => apiPost<TeachBackResponse>("/teachback", b),
    onSuccess: (r) => {
      setDrafts({});
      setEditing(null);
      onChange({ ...r, corrections: [], check: null });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const check = useMutation({
    mutationFn: (b: TeachBackCheckRequest) => apiPost<TeachBackCheckResponse>("/teachback/check", b),
    onSuccess: (r, vars) => value && onChange({ ...value, corrections: vars.corrections, check: r }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const corrections = Object.entries(drafts)
    .filter(([, t]) => t.trim())
    .map(([n, t]) => ({ sentence_number: Number(n), correction: t.trim() }));

  const onStart = () => start.mutate({ topic, persona, history });
  const onCheck = () => {
    if (!value) return;
    if (corrections.length === 0) return toast.error("Tap a sentence you think is wrong and write the fix.");
    check.mutate({ topic, sentences: value.sentences, mistakes: value.mistakes, corrections });
  };

  const checked = value?.check ?? null;
  const resultFor = (n: number) => checked?.results.find((r) => r.sentence_number === n);

  return (
    <section data-testid="teachback-section" className="rounded-2xl border border-stone-900/10 bg-stone-900 p-6 text-stone-50 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-md">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-yellow-300">Teach-back challenge</p>
          <h2 className="mt-1.5 font-serif text-2xl font-medium">Now I'll explain it back to you.</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            I'll retell it using only what you taught me, gaps and all. Find my mistakes and fix them.
          </p>
        </div>
        <Button
          data-testid="teachback-start-button"
          variant="secondary"
          onClick={onStart}
          disabled={start.isPending || check.isPending}
          className="transition-transform duration-150 active:scale-95"
        >
          {start.isPending ? (
            <span data-testid="teachback-loading" className="flex items-center gap-2"><ThinkingDots /> Retelling…</span>
          ) : (
            <><Repeat2 className="size-4" /> {value ? "Retell again" : "Start teach-back"}</>
          )}
        </Button>
      </div>

      {value && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-6 space-y-3">
          <ol data-testid="teachback-sentences" className="space-y-2.5">
            {value.sentences.map((s, i) => {
              const n = i + 1;
              const res = resultFor(n);
              const planted = value.mistakes.find((m) => m.sentence_number === n);
              const draft = drafts[n] ?? "";
              const hasDraft = !!draft.trim();
              return (
                <li key={n} className="rounded-xl bg-white/[0.04] ring-1 ring-white/10">
                  <button
                    type="button"
                    data-testid={`teachback-sentence-${n}`}
                    disabled={!!checked}
                    onClick={() => setEditing(editing === n ? null : n)}
                    className={`flex w-full gap-3 rounded-xl p-3.5 text-left transition-[background-color] duration-200 enabled:hover:bg-white/[0.06] ${hasDraft ? "bg-yellow-300/10" : ""}`}
                  >
                    <span className="mt-0.5 font-mono text-[11px] text-stone-400">{n}</span>
                    <span className="flex-1 font-serif text-[17px] italic leading-relaxed">{s}</span>
                    {!checked && (hasDraft ? <PenLine className="mt-1 size-4 shrink-0 text-yellow-300" /> : null)}
                  </button>
                  {!checked && editing === n && (
                    <div className="flex gap-2 px-3.5 pb-3.5">
                      <Textarea
                        autoFocus
                        data-testid={`teachback-correction-input-${n}`}
                        value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [n]: e.target.value }))}
                        placeholder="What's wrong here, and what's actually true?"
                        className="min-h-16 border-white/15 bg-white/95 text-sm text-stone-900"
                      />
                      {hasDraft && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Clear correction"
                          data-testid={`teachback-correction-clear-${n}`}
                          onClick={() => setDrafts((d) => ({ ...d, [n]: "" }))}
                          className="text-stone-300 hover:text-white"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  {checked && (res || planted) && (
                    <div data-testid={`teachback-result-${n}`} className="space-y-2 px-3.5 pb-3.5 text-sm">
                      {value.corrections.find((c) => c.sentence_number === n) && (
                        <p className="text-stone-300">
                          <span className="text-stone-400">Your fix: </span>
                          {value.corrections.find((c) => c.sentence_number === n)?.correction}
                        </p>
                      )}
                      {res && (
                        <div className={`rounded-lg border px-3 py-2 ${VERDICT[res.verdict].cls}`}>
                          <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-wider">{VERDICT[res.verdict].label}</span>
                          {res.note}
                        </div>
                      )}
                      {planted && (
                        <p className="text-yellow-200/90"><span className="text-stone-400">The mistake: </span>{planted.issue}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {!checked ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p data-testid="teachback-correction-count" className="text-xs text-stone-400">
                Tap a sentence to correct it · {corrections.length} correction{corrections.length === 1 ? "" : "s"}
              </p>
              <Button
                data-testid="teachback-check-button"
                onClick={onCheck}
                disabled={check.isPending}
                className="bg-yellow-300 text-stone-900 transition-transform duration-150 hover:bg-yellow-200 active:scale-95"
              >
                {check.isPending ? <span className="flex items-center gap-2"><ThinkingDots /> Checking…</span> : "Check my corrections"}
              </Button>
            </div>
          ) : (
            <div data-testid="teachback-score" className="flex flex-wrap items-center gap-4 rounded-xl bg-white/[0.06] p-4">
              <p className="font-serif text-3xl tabular-nums">{checked.score}<span className="text-base text-stone-400">/100</span></p>
              <p className="flex-1 text-sm leading-relaxed text-stone-200">
                {checked.results.filter((r) => r.verdict === "caught").length} of {value.mistakes.length} mistakes caught. {checked.overall}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
}
