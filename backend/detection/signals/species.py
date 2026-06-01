"""
DELTA Species Classifier
=========================
Classifies PR descriptions into one or more of 7 slop species.
ZERO LLM delegation — pure rule-based classification on top of
signal outputs and sentence labels.

Each species maps to specific signal patterns, making the classification
auditable: "This PR scores as THE XEROX because DRIS<0.35 and Alignment>0.60."

Species (with DELTA brand names):
  ◈ XEROX       — Restates diff. High alignment, low DRIS.
  ◎ GHOST       — Answers nothing a reviewer needs. Zero ECS, no why.
  ◇ MIRAGE      — Jargon-dense but zero causal transfer.
  ⊙ LOOP        — Circular paragraphs. Ouroboros pattern.
  ◐ VOID        — Describes what. Never explains why.
  ◉ COPY        — Interchangeable with any other PR of same type.
  ◫ TIMEBOMB    — Accurate today, useless in 30 days. No rationale.
"""
import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class SpeciesResult:
    type: str
    glyph: str
    name: str
    confidence: float
    evidence: Optional[str]   # verbatim substring from description
    counterfactual: str       # what the fixed version would say
    fix: str


# ── Pattern libraries ──────────────────────────────────────────────

GENERIC_OPENERS = [
    r"^this pr\b", r"^this commit\b", r"^this change\b",
    r"^updated?\b", r"^fixed?\b", r"^added?\b", r"^refactored?\b",
    r"^improved?\b", r"^various\b", r"^minor\b", r"^cleanup\b",
]

FILLER_PHRASES = [
    r"\bvarious improvements\b", r"\bcode improvements\b",
    r"\bminor changes\b", r"\bcleanup\b", r"\bmiscellaneous\b",
    r"\bseveral improvements\b", r"\bsome changes\b",
    r"\bcode quality\b", r"\bbest practices\b",
]

JARGON_TOKENS = [
    r"\boptimize[sd]?\b", r"\brefactor\w*\b", r"\bmodulari\w+\b",
    r"\barchitecture\b", r"\bscalabilit\w+\b", r"\bperformance\b",
    r"\bcodebase\b", r"\bsystems?\b", r"\binfrastructure\b",
]

CIRCULAR_VERBS = [
    r"\bupdated?\s+\w+\s+to\s+\w+\b",
    r"\bchanged?\s+\w+\s+to\s+\w+\b",
    r"\bmodified?\s+\w+\s+to\s+\w+\b",
]


def _find_evidence(description: str, patterns: list[str]) -> Optional[str]:
    """Return first matching substring from description."""
    for p in patterns:
        m = re.search(p, description, re.IGNORECASE)
        if m:
            # Return surrounding context (up to 80 chars)
            start = max(0, m.start() - 10)
            end = min(len(description), m.end() + 30)
            return description[start:end].strip()
    return None


def _sentence_starts_with_generic(sentence: str) -> bool:
    s = sentence.strip().lower()
    return any(re.match(p, s) for p in GENERIC_OPENERS)


def _count_jargon(description: str) -> int:
    count = 0
    for p in JARGON_TOKENS:
        count += len(re.findall(p, description, re.IGNORECASE))
    return count


def _detect_circular(sentences: list[str]) -> bool:
    """
    Detect Ouroboros pattern: consecutive sentences share root noun
    with no new concept introduced. Simple heuristic: 3+ consecutive
    sentences that begin with "this", "the", or a repeated word.
    """
    if len(sentences) < 3:
        return False
    circular_count = 0
    for i in range(len(sentences) - 1):
        s1_words = set(re.findall(r'\b\w{4,}\b', sentences[i].lower()))
        s2_words = set(re.findall(r'\b\w{4,}\b', sentences[i+1].lower()))
        # High overlap with no new meaningful words
        if s1_words and len(s1_words & s2_words) / len(s1_words) > 0.55:
            circular_count += 1
    return circular_count >= 2


def _find_red_evidence(sentences: list[str], sentence_labels: list[str]) -> Optional[str]:
    """Return first RED sentence as evidence."""
    for s, label in zip(sentences, sentence_labels):
        if label == "red" and len(s) > 10:
            return s[:90] + ("..." if len(s) > 90 else "")
    return None


def classify_species(
    description: str,
    sentences: list[str],
    sentence_labels: list[str],  # list of "red"/"orange"/"green"/"purple"
    dris: float,
    ecs: float,
    engagement: float,
    alignment: float,
    has_why: bool,
    has_tradeoff: bool,
    has_alternative: bool,
    has_risk: bool,
    has_evidence: bool,
    word_count: int,
) -> list[SpeciesResult]:
    """
    Returns list of detected species, sorted by confidence.
    A PR can have multiple species simultaneously.
    """
    results = []
    red_count = sentence_labels.count("red")
    purple_count = sentence_labels.count("purple")
    total = max(len(sentences), 1)
    red_ratio = red_count / total
    jargon_count = _count_jargon(description)

    # ── ◈ XEROX ────────────────────────────────────────────────────
    # High alignment + Low DRIS + many red sentences
    if alignment > 0.55 and dris < 0.40 and red_ratio > 0.50:
        conf = min(1.0, alignment * 1.3 + (1 - dris) * 0.5)
        evidence = _find_red_evidence(sentences, sentence_labels)
        results.append(SpeciesResult(
            type="XEROX", glyph="◈", name="The Xerox",
            confidence=round(conf, 2),
            evidence=evidence,
            counterfactual="Explain WHY this approach was chosen, not what the diff already shows.",
            fix="Replace diff restatements with the reasoning that isn't visible in the code.",
        ))

    # ── ◎ GHOST ────────────────────────────────────────────────────
    # Zero ECS + zero engagement + no why + low word count signals nothing for reviewer
    if ecs < 0.05 and engagement < 0.10 and not has_why and not has_risk:
        conf = min(1.0, 0.6 + (0.1 if not has_alternative else 0) + (0.1 if not has_evidence else 0))
        evidence = _find_evidence(description, FILLER_PHRASES) or description[:80]
        results.append(SpeciesResult(
            type="GHOST", glyph="◎", name="The Ghost",
            confidence=round(conf, 2),
            evidence=evidence,
            counterfactual="What would a teammate need to know to review this confidently without asking you anything?",
            fix="Write the description for the reviewer, not for yourself.",
        ))

    # ── ◇ MIRAGE ───────────────────────────────────────────────────
    # High jargon, low engagement (uses technical terms without explaining them)
    if jargon_count >= 4 and engagement < 0.15 and ecs < 0.20:
        conf = min(1.0, 0.5 + jargon_count * 0.05)
        evidence = _find_evidence(description, JARGON_TOKENS)
        results.append(SpeciesResult(
            type="MIRAGE", glyph="◇", name="Semantic Mirage",
            confidence=round(conf, 2),
            evidence=evidence,
            counterfactual="Replace technical terms with what they actually DO in this specific context.",
            fix="Strip jargon — if nothing remains, you haven't explained anything.",
        ))

    # ── ⊙ LOOP ─────────────────────────────────────────────────────
    # Circular sentences with high word overlap, low DRIS
    if _detect_circular(sentences) and dris < 0.45:
        conf = 0.75
        results.append(SpeciesResult(
            type="LOOP", glyph="⊙", name="The Loop",
            confidence=conf,
            evidence=sentences[0][:80] if sentences else None,
            counterfactual="Each paragraph must introduce one idea the previous paragraph did not contain.",
            fix="Delete every sentence that doesn't add a concept not already stated.",
        ))

    # ── ◐ VOID ─────────────────────────────────────────────────────
    # has_why=False + low DRIS (describes what, never why)
    if not has_why and dris < 0.45 and not has_tradeoff:
        conf = min(1.0, 0.65 + (0.15 if not has_alternative else 0))
        # Find a sentence that describes what without why
        what_evidence = None
        for s, lbl in zip(sentences, sentence_labels):
            if lbl in ("red", "orange") and any(re.search(p, s, re.IGNORECASE) for p in CIRCULAR_VERBS):
                what_evidence = s[:90]
                break
        results.append(SpeciesResult(
            type="VOID", glyph="◐", name="The Void",
            confidence=round(conf, 2),
            evidence=what_evidence,
            counterfactual="What was broken before this? What would happen if this PR wasn't merged?",
            fix="Add a root cause section: what was wrong, and why does this fix it.",
        ))

    # ── ◉ COPY ─────────────────────────────────────────────────────
    # Generic openers + low uniqueness (interchangeable with any similar PR)
    generic_sentence_count = sum(1 for s in sentences if _sentence_starts_with_generic(s))
    generic_ratio = generic_sentence_count / total
    if generic_ratio > 0.40 and ecs < 0.15:
        conf = min(1.0, 0.55 + generic_ratio * 0.5)
        evidence = _find_evidence(description, GENERIC_OPENERS)
        results.append(SpeciesResult(
            type="COPY", glyph="◉", name="The Copy",
            confidence=round(conf, 2),
            evidence=evidence,
            counterfactual="Find one thing about THIS specific change that differs from any other change of this type.",
            fix="Replace every generic sentence with something that only applies to this PR.",
        ))

    # ── ◫ TIMEBOMB ─────────────────────────────────────────────────
    # No evidence + no risk + low ECS = accurate today, useless in 30 days
    if not has_evidence and not has_risk and ecs < 0.15 and word_count > 20:
        conf = 0.65
        results.append(SpeciesResult(
            type="TIMEBOMB", glyph="◫", name="Time Bomb",
            confidence=conf,
            evidence=None,
            counterfactual="Add the rationale and tradeoffs. Code changes; decisions need context to survive.",
            fix="Add: how was this tested, and what should reviewers watch for?",
        ))

    # Sort by confidence, return top 3
    results.sort(key=lambda r: r.confidence, reverse=True)
    return results[:3]
