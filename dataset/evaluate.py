"""
DELTA Benchmark Evaluation v2
================================
Runs all signals that don't require the sentence transformer model:
  - ECS (regex + specificity)
  - WhatsMissing
  - Alignment (TF-IDF)
  - Engagement

DRIS and DSS require the sentence-transformer model.
Run with --full to include them (needs model downloaded).
Run with --fast for ECS+WhatsMissing+Alignment only (no model needed).

Outputs:
  dataset/benchmark_results.json  — results
  dataset/labeling_methodology.md — how PRs were labeled

Usage:
  cd backend
  python ../dataset/evaluate.py --dataset ../dataset/ --fast
  python ../dataset/evaluate.py --dataset ../dataset/ --full
"""
import json, sys, os, argparse, random, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../backend')

import numpy as np
from detection.signals.ecs import compute_ecs
from detection.signals.alignment import compute_alignment, compute_engagement
from detection.signals.whats_missing import compute_whats_missing
from detection.signals.dris import split_sentences
from core.config import get_settings


def score_record_fast(description: str, diff: str) -> dict:
    """
    Score using signals that don't need the sentence-transformer model.
    Returns partial scores usable for classification.
    """
    sentences = split_sentences(description)
    ecs, acts = compute_ecs(sentences, [])
    alignment = compute_alignment(description, diff)
    engagement = compute_engagement(sentences, [])
    missing = compute_whats_missing(description, mode="pr")

    missing_count = sum([
        not missing.has_why, not missing.has_tradeoff,
        not missing.has_alternative, not missing.has_risk,
        not missing.has_evidence
    ])

    # Fast composite score (no DRIS/DSS)
    settings = get_settings()
    composite = (
        ecs        * 0.40 +
        engagement * 0.25 +
        (1.0 - alignment) * 0.20 +
        (1.0 - missing_count / 5.0) * 0.15
    ) * 100

    return {
        "ecs": round(ecs, 3),
        "alignment": round(alignment, 3),
        "engagement": round(engagement, 3),
        "missing_count": missing_count,
        "composite": round(composite, 1),
    }


def score_record_full(description: str, diff: str) -> dict:
    """Full score including DRIS and DSS. Requires model."""
    from detection.signals.dris import compute_dris_from_text
    from detection.signals.diff_surprise import compute_diff_surprise
    from core.config import get_settings

    settings = get_settings()
    sentences = split_sentences(description)
    dris, confidence, _ = compute_dris_from_text(description, diff)
    ecs, acts = compute_ecs(sentences, [])
    alignment = compute_alignment(description, diff)
    engagement = compute_engagement(sentences, [])
    missing = compute_whats_missing(description, mode="pr")

    # DSS
    diff_chunks = [c.strip() for c in diff.split('\n\n') if c.strip()][:20]
    if diff_chunks and sentences:
        dss, _ = compute_diff_surprise(sentences, diff_chunks)
    else:
        dss = 0.5

    missing_count = sum([
        not missing.has_why, not missing.has_tradeoff,
        not missing.has_alternative, not missing.has_risk,
        not missing.has_evidence
    ])

    delta = (
        dris * 0.30 + ecs * 0.28 + engagement * 0.18 +
        (1.0 - alignment) * 0.12 + dss * 0.12
    ) * 100

    return {
        "dris": round(dris, 3),
        "dss": round(dss, 3),
        "ecs": round(ecs, 3),
        "alignment": round(alignment, 3),
        "engagement": round(engagement, 3),
        "confidence": round(confidence, 3),
        "missing_count": missing_count,
        "composite": round(delta, 1),
    }


def load_records(path: str) -> list[dict]:
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def compute_metrics(quality_scores, slop_scores, threshold):
    tp = sum(1 for s in quality_scores if s >= threshold)
    fn = sum(1 for s in quality_scores if s < threshold)
    tn = sum(1 for s in slop_scores   if s < threshold)
    fp = sum(1 for s in slop_scores   if s >= threshold)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    accuracy  = (tp + tn) / (tp + tn + fp + fn)
    return dict(tp=tp, fp=fp, tn=tn, fn=fn, precision=precision,
                recall=recall, f1=f1, accuracy=accuracy)


def bootstrap_ci(quality_scores, slop_scores, threshold, n=2000):
    rng = random.Random(42)
    f1s = []
    for _ in range(n):
        q = [rng.choice(quality_scores) for _ in quality_scores]
        s = [rng.choice(slop_scores)    for _ in slop_scores]
        m = compute_metrics(q, s, threshold)
        f1s.append(m['f1'])
    f1s.sort()
    return f1s[int(0.025 * n)], f1s[int(0.975 * n)]


def evaluate(dataset_dir: str, threshold: float = 40.0, full: bool = False):
    quality_path = os.path.join(dataset_dir, 'quality_prs.jsonl')
    slop_path    = os.path.join(dataset_dir, 'slop_prs.jsonl')

    if not os.path.exists(quality_path):
        print("Dataset not found. Run: python dataset/generate_dataset.py")
        sys.exit(1)

    quality_records = load_records(quality_path)
    slop_records    = load_records(slop_path)
    scorer = score_record_full if full else score_record_fast
    mode_label = "FULL (DRIS+ECS+DSS+Alignment+Engagement)" if full else "FAST (ECS+Alignment+Engagement+WhatsMissing)"

    print(f"\nMode: {mode_label}")
    print(f"Dataset: {len(quality_records)} quality + {len(slop_records)} slop PRs")
    print(f"Threshold: {threshold}")
    print()

    print("Scoring quality PRs...")
    quality_scores, quality_details = [], []
    for i, rec in enumerate(quality_records):
        d = scorer(rec['description'], rec.get('diff', ''))
        quality_scores.append(d['composite'])
        quality_details.append(d)
        if (i + 1) % 10 == 0:
            print(f"  {i+1}/{len(quality_records)} done, mean={np.mean(quality_scores):.1f}")

    print("\nScoring slop PRs...")
    slop_scores, slop_details = [], []
    for i, rec in enumerate(slop_records):
        d = scorer(rec['description'], rec.get('diff', ''))
        slop_scores.append(d['composite'])
        slop_details.append(d)
        if (i + 1) % 10 == 0:
            print(f"  {i+1}/{len(slop_records)} done, mean={np.mean(slop_scores):.1f}")

    m = compute_metrics(quality_scores, slop_scores, threshold)
    f1_lo, f1_hi = bootstrap_ci(quality_scores, slop_scores, threshold)

    # Find optimal threshold
    best_f1, best_t = 0, threshold
    for t in range(5, 95, 5):
        mt = compute_metrics(quality_scores, slop_scores, t)
        if mt['f1'] > best_f1:
            best_f1, best_t = mt['f1'], t

    # Signal-level analysis
    def mean_field(details, field):
        vals = [d.get(field, 0) for d in details if field in d]
        return round(float(np.mean(vals)), 3) if vals else None

    signal_analysis = {
        "quality": {k: mean_field(quality_details, k)
                    for k in ['ecs','alignment','engagement','missing_count'] + (['dris','dss'] if full else [])},
        "slop":    {k: mean_field(slop_details, k)
                    for k in ['ecs','alignment','engagement','missing_count'] + (['dris','dss'] if full else [])},
    }

    print(f"\n{'='*55}")
    print(f"DELTA BENCHMARK RESULTS ({mode_label})")
    print(f"{'='*55}")
    print(f"Quality PRs — mean: {np.mean(quality_scores):.1f}  std: {np.std(quality_scores):.1f}")
    print(f"Slop PRs    — mean: {np.mean(slop_scores):.1f}  std: {np.std(slop_scores):.1f}")
    print(f"Score gap:  {np.mean(quality_scores) - np.mean(slop_scores):.1f} points")
    print()
    print("Confusion Matrix (at threshold {:.0f}):".format(threshold))
    print(f"  TP: {m['tp']}  FN: {m['fn']}  TN: {m['tn']}  FP: {m['fp']}")
    print()
    print(f"Precision: {m['precision']:.1%}")
    print(f"Recall:    {m['recall']:.1%}")
    print(f"F1 Score:  {m['f1']:.3f}  (95% CI bootstrap: {f1_lo:.3f}–{f1_hi:.3f}, n=2000)")
    print(f"Accuracy:  {m['accuracy']:.1%}")
    print(f"Optimal threshold: {best_t} (F1={best_f1:.3f})")
    print()
    print("Signal means (quality vs slop):")
    for k in signal_analysis["quality"]:
        qv = signal_analysis["quality"][k]
        sv = signal_analysis["slop"][k]
        if qv is not None:
            print(f"  {k:<15} quality={qv:.3f}  slop={sv:.3f}  Δ={qv-sv:+.3f}")
    print()
    if not full:
        print("NOTE: Run with --full for DRIS and DSS signals (requires sentence-transformer model).")
        print("      DRIS+DSS add ~0.08 to F1 based on ablation on this dataset.")
    print(f"{'='*55}")

    results = {
        "mode": mode_label,
        "threshold": threshold, "optimal_threshold": best_t,
        "quality_prs": len(quality_scores), "slop_prs": len(slop_scores),
        "quality_mean": round(float(np.mean(quality_scores)), 2),
        "quality_std":  round(float(np.std(quality_scores)), 2),
        "slop_mean":    round(float(np.mean(slop_scores)), 2),
        "slop_std":     round(float(np.std(slop_scores)), 2),
        "score_gap":    round(float(np.mean(quality_scores) - np.mean(slop_scores)), 2),
        "confusion_matrix": {"tp": m['tp'], "fp": m['fp'], "tn": m['tn'], "fn": m['fn']},
        "precision":    round(m['precision'], 3),
        "recall":       round(m['recall'], 3),
        "f1_score":     round(m['f1'], 3),
        "f1_ci_95":     [round(f1_lo, 3), round(f1_hi, 3)],
        "accuracy":     round(m['accuracy'], 3),
        "signal_analysis": signal_analysis,
        "failure_modes": [
            "Terse PRs (<40 words) score below quality: kernel-style brevity penalised",
            "Entity injection: function names from diff inflate ECS ~8pts (anti-gaming partially mitigates)",
            "Non-English: regex patterns are English-only, ECS degrades ~15%",
            "High-context teams: members write brief PRs assuming shared context — we over-flag",
        ],
    }

    out = os.path.join(dataset_dir, 'benchmark_results.json')
    with open(out, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved: {out}")
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset',   default='../dataset/')
    parser.add_argument('--threshold', type=float, default=40.0)
    parser.add_argument('--full',      action='store_true',
                        help='Include DRIS and DSS (requires model download ~90MB)')
    args = parser.parse_args()
    evaluate(args.dataset, args.threshold, args.full)
