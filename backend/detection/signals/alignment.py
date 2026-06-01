"""
Alignment Signal
================
Measures vocabulary overlap between PR description and diff.
High alignment = description just restates diff terminology.
Used as a PENALTY in the ensemble (high alignment → lower DELTA score).

Engagement Signal
=================
Measures causal chain density — sentences containing causal connectors
that also reference specific diff entities.
High engagement = author explaining WHY, not just WHAT.
"""
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# --- ALIGNMENT ---

def compute_alignment(description: str, diff_text: str) -> float:
    """
    TF-IDF cosine similarity between description and diff.
    Returns 0-1. Higher = description vocabulary mirrors diff closely.
    This is a PENALTY signal — high alignment means less original content.
    """
    if not description.strip() or not diff_text.strip():
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words="english",
            ngram_range=(1, 2),
        )
        texts = [description, diff_text]
        tfidf_matrix = vectorizer.fit_transform(texts)
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        return float(sim[0][0])
    except Exception:
        return 0.0


# --- ENGAGEMENT ---

CAUSAL_CONNECTORS = [
    r"\bbecause\b", r"\bsince\b", r"\bto avoid\b", r"\bin order to\b",
    r"\bwhich means\b", r"\botherwise\b", r"\bso that\b",
    r"\bthis prevents?\b", r"\bthis ensures?\b", r"\bthis allows?\b",
    r"\bto prevent\b", r"\bto ensure\b", r"\bwithout this\b",
]

HEDGE_PHRASES = [
    r"\binstead of\b", r"\brather than\b", r"\bconsidered\b",
    r"\bcould have\b", r"\balternatively\b", r"\bapproach\b",
    r"\btrade.?off\b",
]


def _sentence_has_causal(sentence: str) -> bool:
    return any(re.search(p, sentence, re.IGNORECASE) for p in CAUSAL_CONNECTORS)


def _sentence_has_specific(sentence: str, entities: list[str]) -> bool:
    if not entities:
        return bool(re.search(r'\b[a-z]+[A-Z]\w+\b|\b\w+_\w+\b', sentence))
    s = sentence.lower()
    return any(e.lower() in s for e in entities if len(e) > 3)


def compute_engagement(
    sentences: list[str],
    diff_entities: list[str],
) -> float:
    """
    Returns 0-1. Higher = more sentences contain causal reasoning
    that references specific diff entities.
    """
    if not sentences:
        return 0.0

    engaged_count = 0
    for s in sentences:
        causal = _sentence_has_causal(s)
        specific = _sentence_has_specific(s, diff_entities)
        if causal and specific:
            engaged_count += 2  # Double weight: both causal AND specific
        elif causal:
            engaged_count += 1  # Causal without specific: partial credit
        elif specific and any(
            re.search(p, s, re.IGNORECASE) for p in HEDGE_PHRASES
        ):
            engaged_count += 1  # Hedge + specific: also counts

    # Normalise: 1 engaged sentence per 4 total = score 0.5
    score = engaged_count / (len(sentences) * 0.5)
    return float(min(1.0, score))
