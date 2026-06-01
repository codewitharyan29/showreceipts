"""
Diff Surprise Score (DSS)
==========================
Does description cover what the diff actually changes?

Uses TF-IDF when sentence-transformer model unavailable (free tier).
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from sentence_transformers import SentenceTransformer
    from functools import lru_cache
    from core.config import get_settings

    @lru_cache(maxsize=1)
    def _get_model():
        return SentenceTransformer(get_settings().st_model)

    MODEL_AVAILABLE = True
except ImportError:
    MODEL_AVAILABLE = False


def compute_diff_surprise(
    description_sentences: list[str],
    diff_chunks_text: list[str],
) -> tuple[float, list[tuple[str, float]]]:
    if not description_sentences or not diff_chunks_text:
        return 0.5, []

    if MODEL_AVAILABLE:
        try:
            model = _get_model()
            desc_emb = model.encode(description_sentences, convert_to_numpy=True)
            diff_emb = model.encode(diff_chunks_text, convert_to_numpy=True)
            sim_matrix = cosine_similarity(diff_emb, desc_emb)
            max_sims = sim_matrix.max(axis=1)
            dss = float(np.mean(max_sims))
            chunk_coverage = [(chunk[:120], float(sim)) for chunk, sim in zip(diff_chunks_text, max_sims)]
            chunk_coverage.sort(key=lambda x: x[1])
            return max(0.0, min(1.0, dss)), chunk_coverage
        except Exception:
            pass

    # TF-IDF fallback
    try:
        all_texts = description_sentences + diff_chunks_text
        vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
        tfidf = vectorizer.fit_transform(all_texts)
        desc_vecs = tfidf[:len(description_sentences)]
        diff_vecs = tfidf[len(description_sentences):]
        sim_matrix = cosine_similarity(diff_vecs, desc_vecs)
        max_sims = sim_matrix.max(axis=1)
        dss = float(np.mean(max_sims))
        chunk_coverage = [(chunk[:120], float(sim)) for chunk, sim in zip(diff_chunks_text, max_sims)]
        chunk_coverage.sort(key=lambda x: x[1])
        return max(0.0, min(1.0, dss)), chunk_coverage
    except Exception:
        return 0.5, []


def uncovered_diff_chunks(chunk_coverage: list[tuple[str, float]], threshold: float = 0.42) -> list[str]:
    return [chunk for chunk, sim in chunk_coverage if sim < threshold]
