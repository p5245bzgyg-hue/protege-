# Protégé

**Teach it to understand it.** Protégé is a learning tool built on the Feynman technique: you teach a topic to an AI that plays a confused student, and it shows you exactly where your explanation broke down.

Live demo: https://feynman-loop.emergent.host

## What it does

1. Pick a topic and choose who you're teaching: a high schooler, a 10-year-old, a skeptical classmate, or a picky professor.
2. Explain the topic in your own words. Your explanation is split into numbered sentences.
3. The AI student replies with one follow-up question, a confusion score (0-100), four sub-scores (accuracy, clarity, missing steps, plain language), and the exact sentences that confused it, highlighted with a reason.
4. Answer the question or re-explain, and watch the confusion drop across rounds.
5. **Teach-back challenge:** the AI retells your explanation using only what you taught it, including honest misunderstandings. You tap the sentences that are wrong and write the fix, and it grades your corrections.
6. **How did I do?** gives an honest summary of what you did well, what you missed, and one next step.
7. **Share** creates a link to a one-page summary of the lesson.

## Why

Students often feel like they understand something until they have to explain it. Psychologists call this the *illusion of explanatory depth*. Protégé makes that gap visible before a test does.

## How it works

- The AI is prompted to act as a learner who does not know the topic, never explain the topic back, react only to what the student actually said, ask one question at a time, and not flatter.
- The model replies in strict JSON. The server parses it, clamps every score to its valid range, and drops any flagged sentence number that doesn't exist, so the UI never highlights the wrong line.
- Teach-back works by asking the model to retell the lesson using only what was taught and to plant 2-3 mistakes tied to gaps in the teaching. A second call grades the user's corrections against those known mistakes.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router
- **Backend:** Python, FastAPI, Pydantic
- **Database:** MongoDB (only used for shared lesson links)
- **AI:** Claude (Sonnet) through Emergent's LLM integration

## Repo layout

```
backend/
  server.py            FastAPI app and router wiring
  routers/teach.py     /api/teach, /api/summary, /api/teachback, /api/teachback/check
  routers/share.py     /api/share (create and fetch shared lessons)
  models/teach.py      Pydantic models
  lib/db.py            MongoDB connection and indexes
  .env.example         Environment variable names (no values)
frontend/
  index.html
  src/
    pages/Home.tsx     Main teaching screen
    pages/Shared.tsx   Shared lesson summary page
    components/        ConfusionMeter, SentenceBreakdown, TeachBackPanel, SummaryDialog, ShareDialog
    lib/               API client, types, personas and topic library
```

## Status of this repo

This repository contains the application source code. It was exported from the platform it was built on, and the generated shadcn/ui components (`frontend/src/components/ui/`) and project config files (`package.json`, `vite.config.ts`, `tsconfig*.json`, `backend/requirements.txt`) are not included here. The AI call in `backend/routers/teach.py` uses Emergent's `emergentintegrations` library and an `EMERGENT_LLM_KEY`; to run it elsewhere, replace `ask_llm()` with a call to the Anthropic API using your own key.

## Built with

The idea, the product design, and the learning science behind it are mine. I built it using AI coding tools and the Claude API.
