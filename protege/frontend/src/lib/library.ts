import type { Persona } from "@/lib/types";

export const PERSONAS: { id: Persona; label: string; blurb: string; initial: string }[] = [
  { id: "student", label: "High schooler", blurb: "Curious, a little confused", initial: "H" },
  { id: "kid", label: "10-year-old", blurb: "Needs simple words", initial: "K" },
  { id: "skeptic", label: "Skeptical classmate", blurb: "Asks “how do you know?”", initial: "S" },
  { id: "professor", label: "Picky professor", blurb: "Wants precise terms", initial: "P" },
];

export const personaLabel = (p: Persona) => PERSONAS.find((x) => x.id === p)?.label ?? "Student";

export const TOPIC_LIBRARY: { subject: string; topics: string[] }[] = [
  { subject: "Biology", topics: ["How neurons fire", "How vaccines work", "Photosynthesis", "How DNA copies itself"] },
  { subject: "Physics", topics: ["Why the sky is blue", "How gravity works", "Why ice floats", "How electricity flows"] },
  { subject: "Money", topics: ["How compound interest works", "What inflation is", "How credit scores work", "Why stocks go up and down"] },
  { subject: "Tech", topics: ["How the internet sends data", "How passwords are stored", "What an algorithm is"] },
];

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
