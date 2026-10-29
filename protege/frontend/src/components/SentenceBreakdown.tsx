import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FlaggedSentence } from "@/lib/types";

interface Props {
  sentences: string[];
  flagged: FlaggedSentence[];
}

export default function SentenceBreakdown({ sentences, flagged }: Props) {
  const reasons = new Map(flagged.map((f) => [f.sentence_number, f.reason]));
  return (
    <div data-testid="sentence-breakdown-container" className="leading-[1.9] text-[17px] text-stone-800">
      {sentences.map((s, i) => {
        const n = i + 1;
        const reason = reasons.get(n);
        if (!reason) {
          return (
            <span key={n} data-testid="sentence-item" className="mr-1">
              {s}{" "}
            </span>
          );
        }
        return (
          <Popover key={n}>
            <PopoverTrigger
              openOnHover
              delay={80}
              data-testid="flagged-sentence-highlight"
              className="mr-1 inline cursor-pointer rounded-md bg-[#FEF08A] px-1 py-0.5 text-left text-[#713F12] decoration-[#FACC15] decoration-2 underline-offset-4 transition-[background-color,box-shadow] duration-200 hover:bg-[#FDE047] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 [box-decoration-break:clone]"
            >
              <sup className="mr-0.5 font-mono text-[10px] font-semibold text-[#854D0E]">{n}</sup>
              {s}
            </PopoverTrigger>
            <PopoverContent
              data-testid="flag-reason-tooltip"
              className="max-w-xs border-0 bg-stone-900 p-4 text-sm text-stone-50 shadow-xl"
            >
              <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-yellow-300">
                Why this confused me
              </p>
              <p className="leading-relaxed">{reason}</p>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
