"""
Epistemic Contribution Score (ECS) v3
========================================
Core question: "Does this content contain genuine human reasoning?"

Slop REPORTS.  Humans THINK.

Three-layer detection:

Layer 1 — Act detection (5 epistemic act types):
  CONTRASTIVE — "X instead of Y"
  ALTERNATIVE — "considered X but rejected because"
  CAUSAL      — "because [specific]" / "to avoid [specific]"
  TRADEOFF    — gain phrase + cost phrase in same sentence
  UNCERTAINTY — honest hedge + specific entity

Layer 2 — Clause specificity scoring (0-1):
  Each act is scored by the REASON CLAUSE, not the trigger word:
  - Quantitative data in reason clause (+0.40)
  - Named technical entity in reason clause (+0.30)
  - Reason clause length >= 6 words (+0.20)
  - Generic filler in reason clause (−0.50 multiplier)

Layer 3 — Anti-gaming:
  - Entity stuffing: >70% of acts cite same entity → 0.70× dampen
  - Trigger pattern monoculture: >80% of acts same type → 0.75× dampen
  - Verbosity bomb: repetition ratio > 2.5 → penalty
  - Template detection: matches known slop templates → subtract
  - Minimum reason clause: trigger word alone scores zero

ECS = sum(act_weight × clause_specificity) / sentence_count, norm 0-1.
"""
import re
from dataclasses import dataclass
from collections import Counter


ACT_WEIGHTS = {
    "contrastive":  0.30,
    "alternative":  0.25,
    "causal":       0.25,
    "tradeoff":     0.15,
    "uncertainty":  0.05,
}

CONTRASTIVE_TRIGGERS = [
    r"\binstead of\b", r"\brather than\b", r"\bas opposed to\b",
    r"\bover\s+\w+ing\b", r"\bin favor of\b", r"\bchose\b.{0,30}\bover\b",
    r"\bswitch(?:ed|ing)?\s+from\b", r"\breplace[sd]?\b.{0,20}\bwith\b",
    r"\bprefer(?:red|ring)?\b.{0,15}\bover\b",
]
UNCERTAINTY_TRIGGERS = [
    r"\bnot sure\b", r"\bunclear\b", r"\bnot certain\b",
    r"\bopen question\b", r"\bI'm not confident\b",
    r"\bneed(?:s)? more investigation\b", r"\bwonder(?:ed|ing)? if\b",
]
TRADEOFF_GAIN = [
    r"\bimprove[sd]?\b", r"\bfaster\b", r"\bmore efficient\b",
    r"\breduces?\b", r"\bbetter\b", r"\boptimize[sd]?\b",
    r"\bspeedup\b", r"\blower(?:s|ed)?\b", r"\bsave[sd]?\b", r"\bcuts?\b",
]
TRADEOFF_COST = [
    r"\bat the cost of\b", r"\btrade.?off\b", r"\bslower\b",
    r"\bmore complex\b", r"\bbreaking change\b", r"\boverhead\b",
    r"\bdownside\b", r"\bcaveat\b", r"\bincreases?\s+\w+\b",
]
ALTERNATIVE_TRIGGERS = [
    r"\bconsidered\b", r"\bcould have\b", r"\balternative\b",
    r"\btried\b", r"\binitially\b", r"\boriginally\b",
    r"\brejected\b", r"\bdecided against\b", r"\bwe explored\b",
    r"\banother approach\b", r"\bwe looked at\b",
]
CAUSAL_TRIGGERS = [
    r"\bbecause\b", r"\bsince\b", r"\bto avoid\b", r"\bin order to\b",
    r"\bwhich means\b", r"\bwhich causes?\b", r"\bso that\b",
    r"\botherwise\b", r"\bwithout this\b", r"\bthis ensures?\b",
    r"\bthis prevents?\b", r"\bthis allows?\b", r"\bto prevent\b",
    r"\broot cause\b", r"\bwas causing\b", r"\bfails? when\b",
    r"\bdue to\b", r"\bresults? in\b",
]

# Generic filler phrases that negate specificity
GENERIC_FILLER = [
    r"\bit(?:'s| is) (?:better|faster|cleaner|simpler|easier|more efficient)\b(?!.{0,40}\d)",
    r"\bbest practices?\b",
    r"\bcode (?:quality|cleanliness|readability|maintainability)\b",
    r"\bimprove[sd]? (?:the )?(?:codebase|code|performance|quality)\b(?!.{0,30}\d)",
    r"\bvarious (?:improvements?|changes?|fixes?)\b",
    r"\bminor (?:improvements?|changes?|fixes?)\b",
]

# Quantitative markers in the reason clause
QUANTITATIVE = [
    r"\b\d+\s*(?:ms|s|sec|second|minute|hour|day|week|month)s?\b",
    r"\b\d+\s*(?:%|percent)\b",
    r"\b\d+\s*[x×]\s*(?:faster|slower|more|less|increase|decrease)?\b",
    r"\b\d+\s*(?:mb|gb|kb|byte)s?\b",
    r"\bp\d{2}\b",
    r"\b\d+\s*(?:req|request|query|call|conn)s?\b",
    r"\bO\([n\d\s\*\^\+]+\)\b",
    r"\b(?:triples?|doubles?|halves?|quadruples?)\b",   # word multipliers
    r"\b\d+\s*(?:line|file|class|function|method|endpoint)s?\b",
]

# Known slop templates that score zero even if they contain trigger words
SLOP_TEMPLATES = [
    r"^this pr (?:fixes|adds|updates|improves|changes|refactors)\b",
    r"^fix(?:es|ed)? (?:a )?(?:bug|issue|problem|error)\b",
    r"^various (?:improvements?|changes?|updates?)\b",
    r"^(?:update|add|fix|change|improve|refactor) \w+\s*$",
    r"please review (?:and (?:merge|approve))?\b",
    r"^all tests? pass(?:ed)?\b",
    r"minor (?:bug fix|improvement|change|cleanup)\b",
]

# Stop words for reason clause evaluation
STOP_WORDS = {
    'a','an','the','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','could',
    'should','may','might','shall','can','to','of','in','on',
    'at','by','for','with','from','this','that','these','those',
    'it','its','we','our','they','their','you','your','i','my',
}


@dataclass
class EpistemicAct:
    act_type: str
    sentence: str
    weight: float
    specific: bool
    specificity_score: float
    entity_hit: str = ""
    reason_clause: str = ""   # the part after the trigger


def _matches_any(text: str, patterns: list[str]) -> bool:
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def _extract_reason_clause(sentence: str, trigger_pattern: str) -> str:
    """Extract the text AFTER the trigger word — the actual reason."""
    m = re.search(trigger_pattern, sentence, re.IGNORECASE)
    if not m:
        return ""
    return sentence[m.end():].strip()


def _clause_specificity(clause: str, diff_entities: list[str],
                        full_sentence: str = "") -> float:
    """
    Score the specificity of content around an epistemic act trigger (0-1).
    Evaluates the reason clause; falls back to full sentence if clause is thin.
    Generic filler → 0. Quantitative / entity-specific → high.
    """
    # Use full sentence as fallback context when clause is short
    context = clause if len(clause.split()) >= 5 else (full_sentence + " " + clause)
    context = context.strip()

    if not context:
        return 0.0

    # Generic filler → 0
    if _matches_any(context, GENERIC_FILLER):
        return 0.0

    content_words = [w for w in context.lower().split() if w not in STOP_WORDS]
    if len(content_words) < 3:
        return 0.0

    score = 0.0

    # Quantitative specificity (strongest signal)
    if _matches_any(context, QUANTITATIVE):
        score += 0.40

    # Named diff entity — checks both exact lowercase and camelCase → space-separated form
    if diff_entities:
        ctx_lower = context.lower()
        for e in diff_entities:
            if len(e) <= 3:
                continue
            # Direct match
            if e.lower() in ctx_lower:
                score += 0.30
                break
            # camelCase → "token rotation" style match
            normalized = re.sub(r'([a-z])([A-Z])', r'\1 \2', e).lower().replace('_', ' ')
            if normalized in ctx_lower:
                score += 0.30
                break

    # Technical identifier (camelCase, snake_case)
    tech = re.findall(r'\b([a-z][a-zA-Z0-9]{3,}[A-Z]\w*|[a-z]+_[a-z]+\w*|\w+\.\w+\(\))\b', context)
    if tech:
        score += min(0.20, len(tech) * 0.07)

    # Meaningful length with technical content (specific file path, function name, etc.)
    file_ref = re.findall(r'\b\w+\.(?:ts|js|py|go|rs|java|rb|cs)\b', context)
    if file_ref:
        score += 0.15

    # Baseline for long, non-generic clauses
    if len(content_words) >= 8 and score < 0.10:
        score = 0.10

    return min(1.0, score)


def _is_slop_template(sentence: str) -> bool:
    s = sentence.strip().lower()
    return any(re.match(p, s, re.IGNORECASE) for p in SLOP_TEMPLATES)


def _repetition_penalty(sentences: list[str]) -> float:
    """
    Penalise verbosity bombs: many sentences with high word overlap.
    Returns multiplier 0.5-1.0.
    """
    if len(sentences) < 5:
        return 1.0
    all_words = " ".join(sentences).lower().split()
    unique = len(set(w for w in all_words if w not in STOP_WORDS))
    total = len([w for w in all_words if w not in STOP_WORDS])
    if total == 0:
        return 1.0
    ratio = unique / total
    # High ratio = diverse vocabulary = no penalty
    # Low ratio (< 0.35) = repetitive = penalty
    if ratio < 0.30:
        return 0.50
    elif ratio < 0.40:
        return 0.75
    return 1.0


def detect_epistemic_acts(
    sentences: list[str],
    diff_entities: list[str],
) -> list[EpistemicAct]:
    acts = []
    for sentence in sentences:
        s_lower = sentence.lower()

        # Skip known slop templates even if they contain trigger words
        if _is_slop_template(sentence):
            continue

        act_type = None
        trigger_pattern = None

        if _matches_any(s_lower, CONTRASTIVE_TRIGGERS):
            act_type = "contrastive"
            trigger_pattern = CONTRASTIVE_TRIGGERS[0]
            for p in CONTRASTIVE_TRIGGERS:
                if re.search(p, s_lower):
                    trigger_pattern = p; break
        elif _matches_any(s_lower, ALTERNATIVE_TRIGGERS):
            act_type = "alternative"
            for p in ALTERNATIVE_TRIGGERS:
                if re.search(p, s_lower):
                    trigger_pattern = p; break
        elif _matches_any(s_lower, CAUSAL_TRIGGERS):
            act_type = "causal"
            for p in CAUSAL_TRIGGERS:
                if re.search(p, s_lower):
                    trigger_pattern = p; break
        elif _matches_any(s_lower, TRADEOFF_GAIN) and _matches_any(s_lower, TRADEOFF_COST):
            act_type = "tradeoff"
            trigger_pattern = TRADEOFF_GAIN[0]
        elif _matches_any(s_lower, UNCERTAINTY_TRIGGERS):
            act_type = "uncertainty"
            for p in UNCERTAINTY_TRIGGERS:
                if re.search(p, s_lower):
                    trigger_pattern = p; break

        if act_type and trigger_pattern:
            reason = _extract_reason_clause(sentence, trigger_pattern) if trigger_pattern else ""
            spec = _clause_specificity(reason, diff_entities, full_sentence=sentence)
            entity_hit = ""
            if diff_entities:
                r_lower = reason.lower()
                for e in diff_entities:
                    if len(e) > 3 and e.lower() in r_lower:
                        entity_hit = e; break
            if not entity_hit:
                tech = re.findall(r'\b([a-z][a-zA-Z0-9]{3,}[A-Z]\w*|[a-z]+_[a-z]+\w*)\b', reason)
                entity_hit = tech[0] if tech else ""

            acts.append(EpistemicAct(
                act_type=act_type,
                sentence=sentence,
                weight=ACT_WEIGHTS[act_type],
                specific=spec > 0.15,
                specificity_score=spec,
                entity_hit=entity_hit,
                reason_clause=reason[:80],
            ))
    return acts


def _anti_gaming_factor(acts: list[EpistemicAct], sentences: list[str]) -> float:
    factor = 1.0

    # Entity stuffing: same entity cited in >70% of specific acts
    specific_with_entity = [a for a in acts if a.entity_hit]
    if len(specific_with_entity) >= 3:
        counts = Counter(a.entity_hit.lower() for a in specific_with_entity)
        top_ratio = counts.most_common(1)[0][1] / len(specific_with_entity)
        if top_ratio > 0.70:
            factor *= 0.70

    # Act type monoculture: >80% same type
    if len(acts) >= 3:
        type_counts = Counter(a.act_type for a in acts)
        top_type_ratio = type_counts.most_common(1)[0][1] / len(acts)
        if top_type_ratio > 0.80:
            factor *= 0.75

    # Verbosity bomb
    factor *= _repetition_penalty(sentences)

    return factor


def compute_ecs(
    sentences: list[str],
    diff_entities: list[str],
) -> tuple[float, list[EpistemicAct]]:
    if not sentences:
        return 0.0, []

    acts = detect_epistemic_acts(sentences, diff_entities)
    if not acts:
        return 0.0, []

    anti_gaming = _anti_gaming_factor(acts, sentences)

    # Weight each act by its clause specificity (not just binary specific/not)
    # No baseline credit for trigger word alone.
    # An epistemic act with zero clause specificity scores zero.
    weighted_sum = sum(a.weight * a.specificity_score for a in acts)

    normalised = weighted_sum / max(1, len(sentences)) * 3.0  # ~1.0 for 1 strong act per 3 sentences
    ecs = min(1.0, normalised) * anti_gaming

    return float(ecs), acts


def get_act_type_for_sentence(sentence: str, acts: list[EpistemicAct]) -> str | None:
    for act in acts:
        if act.sentence == sentence:
            return act.act_type
    return None
