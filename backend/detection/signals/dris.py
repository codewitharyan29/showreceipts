"""
Diff-Relative Information Score (DRIS)
=======================================
Measures how novel description sentences are vs the diff.

Two modes:
1. Full mode: sentence-transformer cosine similarity (requires model)
2. Fast mode: TF-IDF based novelty (no model, works on free tier)

Auto-detects which mode is available.
"""
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from core.config import get_settings

# Try to import sentence-transformers
try:
    from sentence_transformers import SentenceTransformer
    from functools import lru_cache

    @lru_cache(maxsize=1)
    def get_model():
        settings = get_settings()
        return SentenceTransformer(settings.st_model)

    MODEL_AVAILABLE = True
except ImportError:
    MODEL_AVAILABLE = False


def split_sentences(text: str) -> list[str]:
    sentences = []
    paragraphs = re.split(r'\n\s*\n', text.strip())
    for para in paragraphs:
        for line in para.split('\n'):
            line = re.sub(r'^[-*+]\s+', '', line.strip())
            line = re.sub(r'^\d+\.\s+', '', line)
            line = re.sub(r'^#{1,6}\s+', '', line)
            if not line:
                continue
            parts = re.split(r'(?<=[.!?])\s+(?=[A-Z])', line)
            for part in parts:
                part = part.strip()
                if len(part.split()) >= 3:
                    sentences.append(part)
    return sentences


def _generate_counterfactual(sentence: str, derivability: float, label: str):
    if label not in ("red", "orange"):
        return None
    if re.search(r'\b(updated?|changed?|added?|fixed?|removed?)\b', sentence, re.IGNORECASE):
        return "Explain WHY this change was necessary, not just what was changed."
    if re.search(r'\b(this pr|this commit|this change)\b', sentence, re.IGNORECASE):
        return "Start with the problem this solves, not what this PR does."
    return "Add the reasoning or consequence that isn't visible in the diff."


def _tfidf_dris(sentences: list[str], diff_chunks: list[str]):
    """Fast TF-IDF based DRIS when sentence-transformer not available."""
    settings = get_settings()
    if not sentences:
        return 0.5, 0.5, []

    all_texts = sentences + diff_chunks
    try:
        vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        tfidf = vectorizer.fit_transform(all_texts)
        sent_vecs = tfidf[:len(sentences)]
        diff_vecs = tfidf[len(sentences):]

        if diff_vecs.shape[0] == 0:
            derivabilities = [0.3] * len(sentences)
        else:
            sim_matrix = cosine_similarity(sent_vecs, diff_vecs)
            derivabilities = sim_matrix.max(axis=1).tolist()
    except Exception:
        derivabilities = [0.3] * len(sentences)

    results = []
    for sentence, d in zip(sentences, derivabilities):
        d = float(d)
        if d >= settings.dris_red_threshold:
            label = "red"
        elif d >= settings.dris_green_threshold:
            label = "orange"
        else:
            label = "green"
        cf = _generate_counterfactual(sentence, d, label)
        results.append((sentence, d, label, cf))

    arr = np.array([r[1] for r in results])
    dris = float(1.0 - np.mean(arr))
    confidence = float(1.0 - np.std(arr))
    return max(0.0, min(1.0, dris)), max(0.0, min(1.0, confidence)), results


def build_diff_chunks_text(pr) -> list[str]:
    chunks = []
    for chunk in pr.diff_chunks:
        text_parts = [f"File: {chunk.filename}"]
        if chunk.added_lines:
            text_parts.append("Added: " + " | ".join(chunk.added_lines[:20]))
        if chunk.entities:
            text_parts.append("Identifiers: " + ", ".join(chunk.entities[:15]))
        chunks.append("\n".join(text_parts))
    if pr.changed_files:
        chunks.append("Changed files: " + ", ".join(pr.changed_files))
    return chunks if chunks else [pr.all_diff_text[:2000] or "No diff available"]


def compute_dris(pr):
    sentences = split_sentences(pr.description)
    diff_chunks_text = build_diff_chunks_text(pr)

    if MODEL_AVAILABLE:
        try:
            model = get_model()
            sent_emb = model.encode(sentences, convert_to_numpy=True)
            diff_emb = model.encode(diff_chunks_text, convert_to_numpy=True)
            sim_matrix = cosine_similarity(sent_emb, diff_emb)
            derivabilities = sim_matrix.max(axis=1)
            settings = get_settings()
            results = []
            for sentence, d in zip(sentences, derivabilities):
                d = float(d)
                label = "red" if d >= settings.dris_red_threshold else "orange" if d >= settings.dris_green_threshold else "green"
                cf = _generate_counterfactual(sentence, d, label)
                results.append((sentence, d, label, cf))
            arr = np.array([r[1] for r in results])
            return float(1.0 - np.mean(arr)), float(1.0 - np.std(arr)), results
        except Exception:
            pass

    return _tfidf_dris(sentences, diff_chunks_text)


def compute_dris_from_text(description: str, diff_text: str):
    sentences = split_sentences(description)
    diff_chunks = [c.strip() for c in diff_text.split('\n\n') if c.strip()][:50]
    if not diff_chunks:
        diff_chunks = [diff_text[:2000]] if diff_text.strip() else ["No diff provided"]
    return _tfidf_dris(sentences, diff_chunks)
