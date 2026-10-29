import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThinkingDots } from "@/components/SummaryDialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  url: string | null;
  loading: boolean;
  error: string | null;
}

export default function ShareDialog({ open, onOpenChange, url, loading, error }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="share-dialog" className="bg-white p-6 sm:max-w-md sm:p-8">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium">Share this lesson</DialogTitle>
          <DialogDescription>
            Anyone with the link can see a one-page summary of your rounds, teach-back and report.
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <p data-testid="share-loading" className="flex items-center gap-2 py-4 text-stone-600"><ThinkingDots /> Creating link…</p>
        )}
        {error && !loading && <p data-testid="share-error" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {url && !loading && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input data-testid="share-link-input" readOnly value={url} onFocus={(e) => e.target.select()} className="h-10 bg-stone-50 font-mono text-xs" />
              <Button data-testid="share-copy-button" onClick={copy} className="h-10 transition-transform duration-150 active:scale-95">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <a
              data-testid="share-open-link"
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] underline-offset-4 hover:underline"
            >
              Open summary page <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
