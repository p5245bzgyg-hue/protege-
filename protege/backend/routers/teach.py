import json
import logging
import os
import re
import uuid
from typing import List

from fastapi import APIRouter, HTTPException
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from models.teach import (
    CheckResult, FlaggedSentence, PlantedMistake, Round, Scores, SummaryRequest, SummaryResponse,
    TeachBackCheckRequest, TeachBackCheckResponse, TeachBackRequest, TeachBackResponse,
    TeachRequest, TeachResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)

MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-5-5"

PERSONAS = {
    "kid": "a curious 10-year-old who does NOT know this topic yet. You use simple kid words and get lost quickly when grown-up words appear",
    "student": "a curious high school student who does NOT know this topic yet",
    "skeptic": "a skeptical classmate who does NOT know this topic yet. You push back on claims that aren't backed up and ask 'but how do you know?'",
    "professor": "a picky professor role-playing a learner who does NOT know this topic yet. You demand precise definitions, correct terminology and rigorous cause-and-effect",
}

FRIENDLY_ERROR = "Your AI student got distracted for a moment. Please try again."


def split_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    return [p.strip() for p in parts if p and p.strip()]


def numbered(sentences: List[str]) -> str:
    return "\n".join(f"{i}. {s}" for i, s in enumerate(sentences, 1))


def extract_json(raw: str) -> dict:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise
        return json.loads(text[start:end + 1])


def clamp(value, lo: int, hi: int) -> int:
    try:
        return max(lo, min(hi, int(round(float(value)))))
    except (TypeError, ValueError):
        return lo


async def ask_llm(system: str, prompt: str) -> dict:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="The AI service is not configured yet.")
    chat = LlmChat(api_key=key, session_id=str(uuid.uuid4()), system_message=system).with_model(
        MODEL_PROVIDER, MODEL_NAME
    )
    chunks: List[str] = []
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            chunks.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return extract_json("".join(chunks))


def history_text(history: List[Round]) -> str:
    lines = []
    for i, r in enumerate(history, 1):
        lines.append(f"--- Round {i} ---\nTeacher said:\n{r.explanation}\nYou (student) asked: {r.question}\nYour confusion then: {r.confusion}")
    return "\n\n".join(lines)


@router.post("/teach", response_model=TeachResponse)
async def teach(body: TeachRequest):
    sentences = split_sentences(body.explanation)
    if not sentences:
        raise HTTPException(status_code=400, detail="Please write at least one sentence to teach.")

    system = (
        f"You are {PERSONAS[body.persona]}. "
        f"The user is teaching you {body.topic}. Never explain the topic yourself or fill in gaps for them. "
        "React only to what they actually said. Ask ONE follow-up question at a time, like a real confused learner. "
        "Score the explanation honestly. Do not flatter.\n\n"
        "Reply with ONLY valid JSON, no prose and no code fences, in exactly this shape:\n"
        '{"question": "one follow-up question in the student\'s voice", '
        '"confusion": <number 0-100, 100 = totally lost>, '
        '"scores": {"accuracy": <0-10>, "clarity": <0-10>, "missing_steps": <0-10>, "jargon": <0-10>}, '
        '"flagged": [{"sentence_number": <number>, "reason": "short reason it was confusing"}]}\n'
        "Scores: higher is better for every field (missing_steps 10 = no steps missing, jargon 10 = no unexplained jargon). "
        "Only flag sentence numbers from the CURRENT explanation. Confusion reflects your overall understanding so far, across all rounds."
    )
    prior = history_text(body.history)
    prompt = (
        (f"Earlier in this lesson:\n{prior}\n\n" if prior else "")
        + f"The teacher's {'new answer' if prior else 'explanation'} (numbered sentences):\n{numbered(sentences)}"
    )

    try:
        data = await ask_llm(system, prompt)
        scores_raw = data.get("scores") or {}
        flagged = []
        for f in data.get("flagged") or []:
            n = clamp(f.get("sentence_number"), 0, len(sentences))
            if 1 <= n <= len(sentences):
                flagged.append(FlaggedSentence(sentence_number=n, reason=str(f.get("reason", "")).strip() or "This part was confusing."))
        return TeachResponse(
            sentences=sentences,
            question=str(data.get("question", "")).strip() or "Hmm, could you say that another way?",
            confusion=clamp(data.get("confusion"), 0, 100),
            scores=Scores(**{k: clamp(scores_raw.get(k), 0, 10) for k in ("accuracy", "clarity", "missing_steps", "jargon")}),
            flagged=flagged,
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.exception("teach failed: %s", e)
        raise HTTPException(status_code=502, detail=FRIENDLY_ERROR)


@router.post("/summary", response_model=SummaryResponse)
async def summary(body: SummaryRequest):
    system = (
        "You are an honest, encouraging learning coach reviewing how well a student taught a topic "
        "to a confused AI learner (the Feynman technique). Do not flatter. "
        "Reply with ONLY valid JSON, no prose and no code fences, in exactly this shape:\n"
        '{"did_well": ["short point", ...], "missed": ["short point", ...], "next_step": "one sentence"}\n'
        "Give 2-4 items for did_well and missed."
    )
    rounds = "\n\n".join(
        f"--- Round {i} ---\nTeacher said:\n{r.explanation}\nStudent asked: {r.question}\n"
        f"Confusion: {r.confusion}/100. Scores: accuracy {r.scores.accuracy}, clarity {r.scores.clarity}, "
        f"missing_steps {r.scores.missing_steps}, jargon {r.scores.jargon}."
        for i, r in enumerate(body.history, 1)
    )
    prompt = f"Topic: {body.topic}\n\nFull lesson:\n{rounds}"
    try:
        data = await ask_llm(system, prompt)
        return SummaryResponse(
            did_well=[str(x) for x in (data.get("did_well") or [])],
            missed=[str(x) for x in (data.get("missed") or [])],
            next_step=str(data.get("next_step", "")).strip() or "Try explaining it once more in simpler words.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("summary failed: %s", e)
        raise HTTPException(status_code=502, detail="Couldn't put your report together right now. Please try again.")


@router.post("/teachback", response_model=TeachBackResponse)
async def teachback(body: TeachBackRequest):
    system = (
        f"You are {PERSONAS[body.persona]}. The user has been teaching you {body.topic}. "
        "Now explain the topic BACK to them in your own words, in your own voice, using ONLY what they taught you. "
        "Never add facts they did not teach. Where their teaching was vague, missing steps or ambiguous, make the kind of "
        "honest misunderstanding a real learner would make. Include 2 or 3 such mistakes (never more than half of the sentences). "
        "Write 4 to 7 short sentences.\n\n"
        "Reply with ONLY valid JSON, no prose and no code fences, in exactly this shape:\n"
        '{"sentences": ["sentence 1", "sentence 2", ...], '
        '"mistakes": [{"sentence_number": <1-based index into sentences>, "issue": "what is wrong and which gap in the teaching caused it"}]}'
    )
    prompt = f"The full lesson so far:\n{history_text(body.history)}"
    try:
        data = await ask_llm(system, prompt)
        sentences = [str(x).strip() for x in (data.get("sentences") or []) if str(x).strip()]
        if not sentences:
            raise ValueError("empty retelling")
        mistakes = []
        for m in data.get("mistakes") or []:
            n = clamp(m.get("sentence_number"), 0, len(sentences))
            if 1 <= n <= len(sentences):
                mistakes.append(PlantedMistake(sentence_number=n, issue=str(m.get("issue", "")).strip()))
        return TeachBackResponse(sentences=sentences, mistakes=mistakes)
    except Exception as e:  # noqa: BLE001
        logger.exception("teachback failed: %s", e)
        raise HTTPException(status_code=502, detail="Your student couldn't put it into words just now. Please try again.")


@router.post("/teachback/check", response_model=TeachBackCheckResponse)
async def teachback_check(body: TeachBackCheckRequest):
    system = (
        f"You are a fair, honest tutor grading how well a teacher corrected a learner's retelling of {body.topic}. "
        "You are given the retelling (numbered), the mistakes that were actually in it, and the teacher's corrections. "
        "For EVERY real mistake give one result: verdict \"caught\" if the teacher corrected it accurately, \"partly\" if the "
        "correction is on the right track but incomplete or slightly wrong, \"missed\" if they did not correct it. "
        "For every correction on a sentence that had NO real mistake, give verdict \"false_alarm\" (or \"caught\" if it "
        "genuinely fixes a real error you see there). Notes are one short sentence. Score 0-100 for the overall correction quality. "
        "Do not flatter.\n\n"
        "Reply with ONLY valid JSON, no prose and no code fences, in exactly this shape:\n"
        '{"results": [{"sentence_number": <number>, "verdict": "caught|partly|missed|false_alarm", "note": "short"}], '
        '"score": <0-100>, "overall": "one or two sentences"}'
    )
    mistakes = "\n".join(f"- Sentence {m.sentence_number}: {m.issue}" for m in body.mistakes) or "- (none listed)"
    corrections = "\n".join(f"- Sentence {c.sentence_number}: {c.correction}" for c in body.corrections)
    prompt = (
        f"Retelling:\n{numbered(body.sentences)}\n\nReal mistakes:\n{mistakes}\n\nTeacher's corrections:\n{corrections}"
    )
    try:
        data = await ask_llm(system, prompt)
        results = []
        for r in data.get("results") or []:
            n = clamp(r.get("sentence_number"), 0, len(body.sentences))
            verdict = str(r.get("verdict", "")).strip().lower()
            if 1 <= n <= len(body.sentences) and verdict in ("caught", "partly", "missed", "false_alarm"):
                results.append(CheckResult(sentence_number=n, verdict=verdict, note=str(r.get("note", "")).strip()))
        return TeachBackCheckResponse(
            results=results,
            score=clamp(data.get("score"), 0, 100),
            overall=str(data.get("overall", "")).strip() or "Nice effort, keep going.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("teachback check failed: %s", e)
        raise HTTPException(status_code=502, detail="Couldn't check your corrections right now. Please try again.")
