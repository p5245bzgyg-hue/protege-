from datetime import datetime, timezone
from typing import List, Literal, Optional
import uuid

from pydantic import BaseModel, Field

Persona = Literal["kid", "student", "skeptic", "professor"]


class Scores(BaseModel):
    accuracy: int = 0
    clarity: int = 0
    missing_steps: int = 0
    jargon: int = 0


class FlaggedSentence(BaseModel):
    sentence_number: int
    reason: str


class Round(BaseModel):
    """One completed teaching round, kept client-side and sent back as history."""
    explanation: str
    question: str = ""
    confusion: int = 0
    scores: Scores = Field(default_factory=Scores)
    flagged: List[FlaggedSentence] = Field(default_factory=list)


class TeachRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    explanation: str = Field(min_length=1, max_length=8000)
    history: List[Round] = Field(default_factory=list)
    persona: Persona = "student"


class TeachResponse(BaseModel):
    sentences: List[str]
    question: str
    confusion: int
    scores: Scores
    flagged: List[FlaggedSentence]


class SummaryRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    history: List[Round] = Field(min_length=1)
    persona: Persona = "student"


class SummaryResponse(BaseModel):
    did_well: List[str]
    missed: List[str]
    next_step: str


# ---- Teach-back ----
class PlantedMistake(BaseModel):
    sentence_number: int
    issue: str


class TeachBackRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    history: List[Round] = Field(min_length=1)
    persona: Persona = "student"


class TeachBackResponse(BaseModel):
    sentences: List[str]
    mistakes: List[PlantedMistake]


class Correction(BaseModel):
    sentence_number: int
    correction: str = Field(min_length=1, max_length=2000)


class TeachBackCheckRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    sentences: List[str] = Field(min_length=1)
    mistakes: List[PlantedMistake]
    corrections: List[Correction] = Field(min_length=1)


class CheckResult(BaseModel):
    sentence_number: int
    verdict: Literal["caught", "partly", "missed", "false_alarm"]
    note: str


class TeachBackCheckResponse(BaseModel):
    results: List[CheckResult]
    score: int
    overall: str


class TeachBack(BaseModel):
    sentences: List[str]
    mistakes: List[PlantedMistake]
    corrections: List[Correction] = Field(default_factory=list)
    check: Optional[TeachBackCheckResponse] = None


# ---- Shareable sessions ----
class SharedRound(Round):
    sentences: List[str] = Field(default_factory=list)


class ShareCreate(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    persona: Persona = "student"
    rounds: List[SharedRound] = Field(min_length=1, max_length=50)
    summary: Optional[SummaryResponse] = None
    teachback: Optional[TeachBack] = None


class SharedSession(ShareCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
