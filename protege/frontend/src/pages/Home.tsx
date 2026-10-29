import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Sparkles, RotateCcw, ClipboardCheck, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { PERSONAS, TOPIC_LIBRARY, personaLabel, slug } from "@/lib/library";
import type {
  ClientRound, Persona, Round, ShareCreate, SharedSession, SummaryRequest, SummaryResponse, TeachBack,
  TeachRequest, TeachResponse,
} from "@/lib/types";
import ConfusionMeter, { confusionColor } from "@/components/ConfusionMeter";
import SentenceBreakdown from "@/components/SentenceBreakdown";
import SummaryDialog, { ThinkingDots } from "@/components/SummaryDialog";
import TeachBackPanel from "@/components/TeachBackPanel";
import ShareDialog from "@/components/ShareDialog";

const toRound = (r: ClientRound): Round => ({
  explanation: r.explanation,
  question: r.question,
  confusion: r.confusion,
  scores: r.scores,
  flagged: r.flagged,
});

const SCORE_LABELS: { key: keyof Round["scores"]; label: string; id: string }[] = [
  { key: "accuracy", label: "Accuracy", id: "score-accuracy" },
  { key: "clarity", label: "Clarity", id: "score-clarity" },
  { key: "missing_steps", label: "No missing steps", id: "score-missing-steps" },
  { key: "jargon", label: "Plain language", id: "score-jargon" },
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [rounds, setRounds] = useState<ClientRound[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [persona, setPersona] = useState<Persona>("student");
  const [subject, setSubject] = useState(TOPIC_LIBRARY[0].subject);
  const [teachback, setTeachback] = useState<TeachBack | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const latest = rounds.at(-1);

  const teach = useMutation({
    mutationFn: (body: TeachRequest) => apiPost<TeachResponse>("/teach", body),
    onSuccess: (res, vars) => {
      setRounds((rs) => [...rs, { ...res, explanation: vars.explanation }]);
      setDraft("");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const share = useMutation({
    mutationFn: (body: ShareCreate) => apiPost<SharedSession>("/share", body),
  });

  const summary = useMutation({
    mutationFn: (body: SummaryRequest) => apiPost<SummaryResponse>("/summary", body),
  });

  const onTeach = () => {
    if (!topic.trim()) return toast.error("Pick a topic to teach first.");
    if (!draft.trim()) return toast.error("Write your explanation first.");
    teach.mutate({ topic: topic.trim(), explanation: draft.trim(), history: rounds.map(toRound), persona });
  };

  const onSummary = () => {
    setSummaryOpen(true);
    summary.mutate({ topic: topic.trim(), history: rounds.map(toRound), persona });
  };

  const onReset = () => {
    setRounds([]);
    setDraft("");
    summary.reset();
    share.reset();
    setTeachback(null);
  };

  const onShare = () => {
    setShareOpen(true);
    share.mutate({ topic: topic.trim(), persona, rounds, summary: summary.data ?? null, teachback });
  };

  const locked = rounds.length > 0;

  return (
    <div className="min-h-screen">
      <header data-testid="app-header" className="sticky top-0 z-20 border-b border-stone-200/70 bg-[#FAF8F5]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div data-testid="brand-logo" className="flex items-baseline gap-1.5">
            <span className="font-serif text-2xl font-medium tracking-tight">Protégé</span>
            <span className="size-1.5 rounded-full bg-[#0284C7]" />
          </div>
          <div className="flex items-center gap-2">
            {locked && (
              <Button data-testid="new-session-button" variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw className="size-3.5" /> New lesson
              </Button>
            )}
            <Button
              data-testid="share-button"
              variant="outline"
              size="sm"
              disabled={!locked || teach.isPending}
              onClick={onShare}
              className="transition-transform duration-150 active:scale-95"
            >
              <Share2 className="size-3.5" /> <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              data-testid="summary-trigger-button"
              size="sm"
              disabled={!locked || teach.isPending}
              onClick={onSummary}
              className="transition-transform duration-150 active:scale-95"
            >
              <ClipboardCheck className="size-3.5" /> How did I do?
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section className="max-w-2xl space-y-3">
          <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Teach it to understand it.
          </h1>
          <p className="text-base leading-relaxed text-stone-600 sm:text-lg">
            Explain a topic to a curious student who knows nothing about it. They'll ask what's unclear,
            score your clarity, and point at the exact sentences that lost them.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Left: teaching desk */}
          <div className="space-y-8">
            <section className="space-y-3">
              <label htmlFor="topic" className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Topic
              </label>
              <Input
                id="topic"
                data-testid="topic-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={locked}
                placeholder="What will you teach today?"
                className="h-12 rounded-xl bg-white px-4 text-base"
              />
              {!locked && (
                <div data-testid="topic-library" className="space-y-3 pt-1">
                  <div className="flex flex-wrap gap-1" role="tablist">
                    {TOPIC_LIBRARY.map((g) => (
                      <button
                        key={g.subject}
                        type="button"
                        role="tab"
                        aria-selected={subject === g.subject}
                        data-testid={`topic-subject-${slug(g.subject)}`}
                        onClick={() => setSubject(g.subject)}
                        className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-[background-color,color] duration-150 ${
                          subject === g.subject ? "bg-stone-900 text-stone-50" : "text-stone-500 hover:bg-stone-200/60 hover:text-stone-800"
                        }`}
                      >
                        {g.subject}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TOPIC_LIBRARY.find((g) => g.subject === subject)?.topics.map((q) => (
                      <button
                        key={q}
                        type="button"
                        aria-label={`Quick pick topic: ${q}`}
                        data-testid={q === "How neurons fire" ? "quick-pick-neurons" : `quick-pick-${slug(q)}`}
                        onClick={() => setTopic(q)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition-[background-color,border-color,transform] duration-150 active:scale-95 ${
                          topic === q ? "border-stone-900 bg-stone-900 text-stone-50" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-[#F5F2EC]"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Your learner {locked && <span className="normal-case tracking-normal text-stone-400">· set for this lesson</span>}
              </p>
              {locked ? (
                <p data-testid="persona-locked" className="text-sm text-stone-700">
                  You're teaching a <b className="font-semibold">{personaLabel(persona).toLowerCase()}</b>.
                </p>
              ) : (
                <div data-testid="persona-picker" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      data-testid={`persona-${p.id}`}
                      aria-pressed={persona === p.id}
                      onClick={() => setPersona(p.id)}
                      className={`rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-150 ${
                        persona === p.id ? "border-stone-900 bg-white shadow-sm ring-1 ring-stone-900" : "border-stone-200 bg-white/60 hover:border-stone-300 hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium text-stone-900">{p.label}</p>
                      <p className="mt-0.5 text-xs text-stone-500">{p.blurb}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Latest round result */}
            <AnimatePresence mode="wait">
              {latest && (
                <motion.section
                  key={rounds.length}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs sm:p-8">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                        What you said
                      </p>
                      <p data-testid="flagged-count" className="text-xs text-stone-500">
                        {latest.flagged.length === 0
                          ? "Nothing flagged"
                          : `${latest.flagged.length} confusing sentence${latest.flagged.length > 1 ? "s" : ""} · hover or tap`}
                      </p>
                    </div>
                    <SentenceBreakdown sentences={latest.sentences} flagged={latest.flagged} />
                  </div>

                  <div data-testid="ai-question-bubble" className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-900 font-serif text-sm text-stone-50">
                      {PERSONAS.find((p) => p.id === persona)?.initial}
                    </div>
                    <div className="max-w-xl rounded-2xl rounded-tl-sm border border-[#E7E2D8] bg-[#F4F1EA] px-5 py-4">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-xs font-semibold text-stone-700">Your {personaLabel(persona).toLowerCase()}</span>
                        <span data-testid="round-counter-badge" className="rounded-full bg-[#E8E2D5] px-2 py-0.5 font-mono text-[10px] text-stone-800">
                          Round {rounds.length}
                        </span>
                      </div>
                      <p data-testid="ai-question-text" className="font-serif text-lg italic leading-relaxed text-stone-900">
                        {latest.question}
                      </p>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Editor */}
            <section className="space-y-3">
              <label htmlFor="explanation" className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {locked ? "Answer your student" : "Your explanation"}
              </label>
              <Textarea
                id="explanation"
                data-testid="explanation-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={teach.isPending}
                placeholder={
                  locked
                    ? "Answer the question, or re-explain the confusing parts…"
                    : "Explain it like you're talking to a smart friend who's never heard of it…"
                }
                className="min-h-44 resize-y rounded-2xl bg-white p-5 text-base leading-relaxed"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-stone-500">
                  {draft.trim() ? `${draft.trim().split(/\s+/).length} words` : "Short, plain sentences work best."}
                </p>
                <Button
                  data-testid="teach-submit-button"
                  size="lg"
                  onClick={onTeach}
                  disabled={teach.isPending}
                  className="h-11 rounded-xl px-6 transition-transform duration-150 active:scale-95"
                >
                  {teach.isPending ? (
                    <span data-testid="teaching-loading-spinner" className="flex items-center gap-2">
                      <ThinkingDots /> Your student is thinking…
                    </span>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> {locked ? "Teach again" : "Teach it"}
                    </>
                  )}
                </Button>
              </div>
            </section>
            {locked && (
              <TeachBackPanel
                topic={topic.trim()}
                persona={persona}
                history={rounds.map(toRound)}
                value={teachback}
                onChange={setTeachback}
              />
            )}
          </div>

          {/* Right: meter, scores, history */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
              <ConfusionMeter value={latest ? latest.confusion : null} />
              <div className="mt-6 grid grid-cols-2 gap-3">
                {SCORE_LABELS.map((s) => (
                  <div key={s.key} data-testid={s.id} className="rounded-xl bg-[#F5F2EC] p-3">
                    <p className="text-xs text-stone-600">{s.label}</p>
                    <p className="mt-1 font-serif text-2xl tabular-nums">
                      {latest ? latest.scores[s.key] : "–"}
                      <span className="text-sm text-stone-400">/10</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div data-testid="round-history-section" className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
              <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Confusion across rounds
              </p>
              {rounds.length === 0 ? (
                <p className="text-sm text-stone-500">Your progress will show up here after each round.</p>
              ) : (
                <ol data-testid="confusion-history-trend" className="space-y-3">
                  {rounds.map((r, i) => {
                    const prev = i > 0 ? rounds[i - 1].confusion : null;
                    const delta = prev === null ? null : r.confusion - prev;
                    return (
                      <li key={i} data-testid="round-history-item" className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-600">Round {i + 1}</span>
                          <span data-testid="round-confusion-badge" className="font-mono tabular-nums text-stone-800">
                            {r.confusion}
                            {delta !== null && delta !== 0 && (
                              <span className={delta < 0 ? "ml-1.5 text-emerald-700" : "ml-1.5 text-rose-700"}>
                                {delta < 0 ? "↓" : "↑"}
                                {Math.abs(delta)}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(r.confusion, 2)}%`,
                              backgroundColor: confusionColor(r.confusion),
                              transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                            }}
                          />
                        </div>
                        <p className="line-clamp-1 text-xs text-stone-500" title={r.question}>
                          “{r.question}”
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </main>

      <SummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        data={summary.data}
        loading={summary.isPending}
        error={summary.isError ? errorMessage(summary.error) : null}
      />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={share.data ? `${window.location.origin}/s/${share.data.id}` : null}
        loading={share.isPending}
        error={share.isError ? errorMessage(share.error) : null}
      />
      <Toaster richColors />
    </div>
  );
}
