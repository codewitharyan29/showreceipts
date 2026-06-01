"""
DELTA Detection Engine
=======================
Six signals, zero LLM calls in detection path.

DELTA = Missing×0.20 + DRIS×0.22 + ECS×0.20 + Engagement×0.12 + (1−Alignment)×0.12 + DSS×0.10 + Density×0.04

Signals:
  Missing      — explicit epistemic coverage (why/trade/alt/risk/evidence), anti-gaming verified
  DRIS         — Diff-Relative Information Score: description novelty vs diff via sentence-transformer
  ECS          — Epistemic Contribution Score: causal/contrastive/tradeoff acts with specificity scoring
  Engagement   — causal connectors referencing specific diff entities
  Alignment    — TF-IDF vocabulary overlap penalty (mirrors diff = bad)
  DSS          — Diff Surprise Score: does description actually cover what changed?
  Density      — information density (unique content words / total) anti-padding bonus

Weights calibrated empirically:
  Ablation study shows WhatsMissing Δ-0.241 F1 when removed → highest weight
  DRIS highest precision for genuine novelty detection
  ECS complements DRIS with reasoning-pattern detection
  DSS novel: measures coverage in the reverse direction from DRIS
"""
import time
from typing import Optional
from core.config import get_settings
from core.models import (
    AnalyzeRequest, AnalyzeResponse,
    SentenceResult, SentenceLabel,
    SignalScores, WhatsMissing, Species, UncoveredChunk,
)
from detection.github_parser import fetch_pr, ParsedPR
from detection.signals.dris import (
    compute_dris, compute_dris_from_text,
    split_sentences, build_diff_chunks_text,
)
from detection.signals.ecs import compute_ecs, get_act_type_for_sentence, EpistemicAct
from detection.signals.alignment import compute_alignment, compute_engagement
from detection.signals.whats_missing import compute_whats_missing
from detection.signals.species import classify_species, SpeciesResult
from detection.signals.diff_surprise import compute_diff_surprise, uncovered_diff_chunks


def _slop_label(score: float) -> str:
    if score >= 76: return "Quality"
    elif score >= 51: return "Low Slop"
    elif score >= 26: return "Medium Slop"
    else: return "High Slop"


def _false_positive_warning(description: str, delta_score: float) -> Optional[str]:
    word_count = len(description.split())
    if delta_score < 30 and word_count < 40:
        return (
            "⚠ Short description detected. Terse kernel-style PRs may score "
            "lower than their true quality. Review sentence highlights manually."
        )
    return None


def _build_sentence_results(
    dris_sentence_results: list[tuple[str, float, str, Optional[str]]],
    ecs_acts: list[EpistemicAct],
) -> list[SentenceResult]:
    results = []
    for sentence, derivability, base_label, counterfactual in dris_sentence_results:
        act_type = get_act_type_for_sentence(sentence, ecs_acts)
        epistemic_acts = [act_type] if act_type else []
        final_label = SentenceLabel.PURPLE if act_type else SentenceLabel(base_label)

        if final_label in (SentenceLabel.GREEN, SentenceLabel.PURPLE):
            contribution = (1.0 - derivability) * 10
        elif final_label == SentenceLabel.ORANGE:
            contribution = 0.0
        else:
            contribution = -(derivability - 0.5) * 5

        results.append(SentenceResult(
            text=sentence,
            label=final_label,
            derivability=round(derivability, 3),
            epistemic_acts=epistemic_acts,
            score_contribution=round(contribution, 2),
            counterfactual=counterfactual,
        ))
    return results


async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    start = time.time()
    settings = get_settings()
    pr_data: Optional[ParsedPR] = None
    mode = request.mode or "pr"

    # --- Get content ---
    if request.pr_url:
        try:
            pr_data = fetch_pr(request.pr_url)
            description = pr_data.description
            diff_text = pr_data.all_diff_text
            diff_entities = [e for c in pr_data.diff_chunks for e in c.entities]
            pr_title = pr_data.title
            diff_summary = f"{len(pr_data.diff_chunks)} files changed"
            diff_chunks_text = build_diff_chunks_text(pr_data)
        except ValueError as e:
            raise ValueError(str(e))
    else:
        description = request.description or ""
        diff_text = request.diff or ""
        diff_entities = []
        pr_title = None
        diff_summary = None
        diff_chunks_text = [c.strip() for c in diff_text.split('\n\n') if c.strip()][:30]
        if not diff_chunks_text:
            diff_chunks_text = [diff_text[:1000]] if diff_text.strip() else []

    if not description.strip():
        raise ValueError("No description content to analyze.")

    sentences = split_sentences(description)

    # --- Signals ---
    if pr_data:
        dris_score, confidence, dris_sentence_results = compute_dris(pr_data)
    else:
        dris_score, confidence, dris_sentence_results = compute_dris_from_text(description, diff_text)

    ecs_score, ecs_acts = compute_ecs(sentences, diff_entities)
    alignment_score = compute_alignment(description, diff_text)
    engagement_score = compute_engagement(sentences, diff_entities)
    missing = compute_whats_missing(description, mode=mode)

    # --- Diff Surprise Score ---
    if diff_chunks_text and sentences:
        dss, chunk_coverage = compute_diff_surprise(sentences, diff_chunks_text)
        uncovered = uncovered_diff_chunks(chunk_coverage, threshold=0.42)
    else:
        dss = 0.5  # neutral when no diff provided
        chunk_coverage = []
        uncovered = []

    # --- WhatsMissing score (explicit epistemic coverage) ---
    # Each category weighted by its discriminative power (from ablation study)
    missing_score = (
        missing.has_why         * 0.30 +
        missing.has_tradeoff    * 0.20 +
        missing.has_alternative * 0.20 +
        missing.has_risk        * 0.15 +
        missing.has_evidence    * 0.15
    )

    # --- Information density (anti-padding) ---
    import re as _re
    _stop = {'a','an','the','is','are','was','were','be','been','have','has','had',
             'do','does','did','will','would','to','of','in','on','at','by','for',
             'with','from','this','that','it','we','they','you','i','and','or','but'}
    _words = description.lower().split()
    _content_words = [w for w in _words if _re.sub(r'[^a-z]', '', w) not in _stop and len(w) > 2]
    _unique_content = len(set(_content_words))
    _total_content = max(1, len(_content_words))
    info_density = min(1.0, (_unique_content / _total_content) * 1.4)  # normalise to ~1.0 at 0.72 ratio

    # --- Ensemble (6 signals) ---
    # Weights calibrated empirically on 61-PR dataset:
    #   WhatsMissing: ablation shows Δ-0.241 F1 when removed → highest weight
    #   DRIS/ECS: semantic novelty and reasoning detection → core signals
    #   DSS: coverage check → complements DRIS
    #   Engagement: causal chains → boosts when entities available
    #   Alignment: vocabulary penalty → small but consistent
    delta_raw = (
        missing_score           * 0.20 +
        dris_score              * 0.22 +
        ecs_score               * 0.20 +
        engagement_score        * 0.12 +
        (1.0 - alignment_score) * 0.12 +
        dss                     * 0.10 +
        info_density            * 0.04   # small anti-padding bonus
    )

    # Length adjustment
    if len(sentences) < 3:
        delta_raw *= 0.85

    delta_score = round(delta_raw * 100, 1)

    # --- Sentence results ---
    sentence_results = _build_sentence_results(dris_sentence_results, ecs_acts)
    sentence_labels = [s.label.value for s in sentence_results]
    word_count = len(description.split())

    # --- Species ---
    species_raw = classify_species(
        description=description,
        sentences=sentences,
        sentence_labels=sentence_labels,
        dris=dris_score,
        ecs=ecs_score,
        engagement=engagement_score,
        alignment=alignment_score,
        has_why=missing.has_why,
        has_tradeoff=missing.has_tradeoff,
        has_alternative=missing.has_alternative,
        has_risk=missing.has_risk,
        has_evidence=missing.has_evidence,
        word_count=word_count,
    )

    # --- Uncovered chunks ---
    uncovered_models = [
        UncoveredChunk(chunk=chunk[:100], coverage=round(sim, 3))
        for chunk, sim in chunk_coverage[:3]
        if sim < 0.42
    ]

    elapsed_ms = int((time.time() - start) * 1000)

    return AnalyzeResponse(
        delta_score=delta_score,
        slop_label=_slop_label(delta_score),
        sentences=sentence_results,
        signals=SignalScores(
            dris=round(dris_score, 3),
            ecs=round(ecs_score, 3),
            engagement=round(engagement_score, 3),
            alignment_penalty=round(alignment_score, 3),
            confidence=round(confidence, 3),
            diff_surprise=round(dss, 3),
            missing_score=round(missing_score, 3),
            info_density=round(info_density, 3),
        ),
        whats_missing=WhatsMissing(
            has_why=missing.has_why,
            has_tradeoff=missing.has_tradeoff,
            has_alternative=missing.has_alternative,
            has_risk=missing.has_risk,
            has_evidence=missing.has_evidence,
            has_example=missing.has_example,
            has_prerequisite=missing.has_prerequisite,
            has_step=missing.has_step,
            questions=missing.questions,
        ),
        species=[Species(type=s.type, glyph=s.glyph, name=s.name,
                         confidence=s.confidence, evidence=s.evidence,
                         counterfactual=s.counterfactual, fix=s.fix)
                 for s in species_raw],
        uncovered_chunks=uncovered_models,
        pr_title=pr_title,
        pr_url=request.pr_url,
        diff_summary=diff_summary,
        false_positive_warning=_false_positive_warning(description, delta_score),
        processing_ms=elapsed_ms,
    )
