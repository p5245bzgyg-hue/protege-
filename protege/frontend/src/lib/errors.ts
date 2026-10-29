import { ApiError } from "@/lib/api";

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const d = (e.body as { detail?: unknown } | null)?.detail;
    if (typeof d === "string") return d;
    if (e.status === 422) return "Please add a topic and an explanation first.";
  }
  return "Couldn't reach your AI student. Check your connection and try again.";
}
