from pydantic import BaseModel
from typing import Optional
from enum import Enum

class SentenceLabel(str, Enum):
    RED    = "red"
    ORANGE = "orange"
    GREEN  = "green"
    PURPLE = "purple"

class SentenceResult(BaseModel):
    text: str
    label: SentenceLabel
    derivability: float
    epistemic_acts: list[str]
    score_contribution: float
    counterfactual: Optional[str] = None

class SignalScores(BaseModel):
    dris: float
    ecs: float
    engagement: float
    alignment_penalty: float
    confidence: float
    diff_surprise: float = 0.5      # how well description covers the diff
    missing_score: float = 0.0      # explicit epistemic coverage (why/trade/alt/risk/evidence)
    info_density: float = 0.5       # unique content words / total content words

class UncoveredChunk(BaseModel):
    chunk: str      # short diff chunk text
    coverage: float # 0-1, how well description addresses it

class Species(BaseModel):
    type: str
    glyph: str
    name: str
    confidence: float
    evidence: Optional[str]
    counterfactual: str
    fix: str

class WhatsMissing(BaseModel):
    has_why: bool
    has_tradeoff: bool
    has_alternative: bool
    has_risk: bool
    has_evidence: bool
    has_example: bool = False
    has_prerequisite: bool = False
    has_step: bool = False
    questions: list[str]

class AnalyzeRequest(BaseModel):
    pr_url: Optional[str] = None
    description: Optional[str] = None
    diff: Optional[str] = None
    mode: str = "pr"

class AnalyzeResponse(BaseModel):
    delta_score: float
    slop_label: str
    sentences: list[SentenceResult]
    signals: SignalScores
    whats_missing: WhatsMissing
    species: list[Species] = []
    uncovered_chunks: list[UncoveredChunk] = []  # NEW: diff areas description misses
    pr_title: Optional[str] = None
    pr_url: Optional[str] = None
    diff_summary: Optional[str] = None
    false_positive_warning: Optional[str] = None
    processing_ms: int = 0
