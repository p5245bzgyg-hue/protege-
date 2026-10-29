// Mirrors backend/models/teach.py — keep in sync by hand.
export interface Scores {
  accuracy: number;
  clarity: number;
  missing_steps: number;
  jargon: number;
}

export interface FlaggedSentence {
  sentence_number: number;
  reason: string;
}

export interface Round {
  explanation: string;
  question: string;
  confusion: number;
  scores: Scores;
  flagged: FlaggedSentence[];
}

export interface TeachRequest {
  topic: string;
  explanation: string;
  history: Round[];
  persona: Persona;
}

export interface TeachResponse {
  sentences: string[];
  question: string;
  confusion: number;
  scores: Scores;
  flagged: FlaggedSentence[];
}

export interface SummaryRequest {
  topic: string;
  history: Round[];
  persona: Persona;
}

export interface SummaryResponse {
  did_well: string[];
  missed: string[];
  next_step: string;
}

// Client-only: a round plus the server's sentence split for display.
export interface ClientRound extends Round {
  sentences: string[];
}

export type Persona = "kid" | "student" | "skeptic" | "professor";

export interface PlantedMistake {
  sentence_number: number;
  issue: string;
}

export interface TeachBackRequest {
  topic: string;
  history: Round[];
  persona: Persona;
}

export interface TeachBackResponse {
  sentences: string[];
  mistakes: PlantedMistake[];
}

export interface Correction {
  sentence_number: number;
  correction: string;
}

export interface TeachBackCheckRequest {
  topic: string;
  sentences: string[];
  mistakes: PlantedMistake[];
  corrections: Correction[];
}

export interface CheckResult {
  sentence_number: number;
  verdict: "caught" | "partly" | "missed" | "false_alarm";
  note: string;
}

export interface TeachBackCheckResponse {
  results: CheckResult[];
  score: number;
  overall: string;
}

export interface TeachBack {
  sentences: string[];
  mistakes: PlantedMistake[];
  corrections: Correction[];
  check: TeachBackCheckResponse | null;
}

export interface ShareCreate {
  topic: string;
  persona: Persona;
  rounds: ClientRound[];
  summary: SummaryResponse | null;
  teachback: TeachBack | null;
}

export interface SharedSession extends ShareCreate {
  id: string;
  created_at: string;
}
