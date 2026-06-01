# ShowReceipts — DELTA

**Not "is this AI?" — did a human think?**

DELTA measures **epistemic contribution**: how much of a PR description couldn't have been auto-generated from the diff alone. Every sentence labeled. Every slop species named. **Zero LLM calls in the detection path.**

[![CI](https://github.com/codewitharyan29/showreceipts/actions/workflows/ci.yml/badge.svg)](https://github.com/codewitharyan29/showreceipts/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-showreceipts-red)](https://npmjs.com/package/showreceipts)

Add to your repo's README:
```
[![DELTA Score](https://showreceipts.onrender.com/badge/your-org/your-repo.svg)](https://delicate-bonbon-50a0d5.netlify.app)
```

---

## Live Demo

**[delicate-bonbon-50a0d5.netlify.app](https://delicate-bonbon-50a0d5.netlify.app)** · paste any public GitHub PR URL.

---

## The Insight

Slop **REPORTS**. Humans **THINK**.

A hollow description restates the diff in prose. A quality description explains *why* this approach was chosen, what alternatives were rejected, what tradeoffs were made. These are **epistemic acts** — detectable algorithmically, without asking another model.

---

## DELTA Score — 0 to 100

| Range | Label |
|-------|-------|
| 76–100 | Quality |
| 51–75 | Low Slop |
| 26–50 | Medium Slop |
| 0–25 | High Slop |

---

## Six Signals, Zero LLM Calls

```
DELTA = Missing×0.20 + DRIS×0.22 + ECS×0.20 + Engagement×0.12 + (1−Alignment)×0.12 + DSS×0.10 + Density×0.04
```

| Signal | What it measures | Hard to fake because |
|--------|-----------------|----------------------|
| **Missing** | WHY, tradeoffs, alternatives, risks, evidence (anti-gaming: requires ≥4 substantive words after trigger) | Template stubs ("Root cause: X.") fail |
| **DRIS** | Description novelty vs diff (sentence-transformer) | Must write sentences the model can't predict from the diff |
| **ECS** | Causal/contrastive/tradeoff reasoning with specificity scoring | Quantitative data > identifiers > generic language |
| **Engagement** | Causal connectors + specific diff entities | "because it's better" = 0; "because tokenManager degrades at 500 concurrent" = high |
| **Alignment** | TF-IDF vocabulary overlap penalty | Paraphrasing diff prose scores same as quoting it |
| **DSS** | *(novel)* Does description cover what the diff actually changed? | Low DSS = diff has changes description never explains |
| **Density** | Unique content words / total (anti-padding) | Repetitive filler scores low regardless |

### The Diff Surprise Score (DSS) — Novel Signal

DRIS: *"Is the description novel vs the diff?"*
DSS: *"Does the diff contain things the description never explains?"*

They're orthogonal. DRIS-high + DSS-low = novel but uninformative. DSS catches the "talks around the change" pattern. Ablation: removing DSS costs 0.343 F1.

---

## 7-Species Slop Taxonomy

See `dataset/taxonomy_poster.svg` for the visual.

| Glyph | Species | Signal | Fix |
|-------|---------|--------|-----|
| ◈ | **The Xerox** | High Alignment + Low DRIS | Explain WHY not WHAT |
| ◎ | **The Ghost** | Zero ECS + no why + no risk | Write for the reviewer |
| ◇ | **Semantic Mirage** | High jargon + zero causality | Strip jargon |
| ⊙ | **The Loop** | Circular sentence structure | Each sentence = one new concept |
| ◐ | **The Void** | Missing WHY + low DRIS | Add root cause |
| ◉ | **The Copy** | Generic openers + low ECS | Find what's unique to THIS PR |
| ◫ | **Time Bomb** | No evidence + no risk + low ECS | Add decision context |

---

## Benchmark Results

`make benchmark` · `make cross-validate`

**Dataset: 121 labeled PRs · 8 ecosystems (React, Next.js, VSCode, Rust, Linux, Python, DevOps, Go)**

See `dataset/dataset_statistics.json` for full distribution.

### Detection Performance

| | Threshold 40 | Optimal (threshold 35) |
|-|-------------|----------------------|
| **F1** | 0.934 | **0.961** |
| Precision | **100%** | 96.9% |
| Recall | 87.7% | 95.4% |
| Accuracy | — | 95.9% |
| CI (95%, bootstrap n=2000) | — | [0.923, 0.992] |

### Cross-Validation (5-fold) — proves generalization

| Fold | F1 |
|------|----|
| 1 | 0.800 |
| 2 | 1.000 |
| 3 | 0.966 |
| 4 | 1.000 |
| 5 | 0.960 |
| **Mean** | **0.945** |
| **Std Dev** | **0.074** |

Train/test split (80/20): Train F1=0.960 · Test F1=0.960 · Generalization gap: 0.000

LOOCV accuracy: 96.0% (n=50 sample)

### Ablation Study — all 7 signals including DSS

| Signal Removed | F1 | Δ |
|---------------|-----|---|
| Baseline | 0.960 | — |
| w/o WhatsMissing | 0.699 | −0.261 |
| w/o Alignment | 0.617 | −0.343 |
| w/o DSS | 0.617 | −0.343 |
| w/o Info Density | 0.934 | −0.026 |
| w/o Engagement | 0.943 | −0.017 |
| w/o ECS | 0.952 | −0.008 |

### Anti-Gaming: 50 documented attacks, 48/48 blocked

`make adversarial` · See `dataset/adversarial_results.json`

### Honest failure modes — see `dataset/limitations.md`

- Terse kernel-style PRs (<40 words): false-positive warning shown
- Entity injection: +8pts (anti-gaming mitigates worst cases)
- Non-English: ~15% accuracy drop
- High-context teams: ~22% FP rate on solo maintainers

---

## Quick Start

```bash
git clone https://github.com/codewitharyan29/showreceipts
cd showreceipts && cp backend/.env.example backend/.env
make install && make demo
```

```bash
make test           # 27 unit tests
make benchmark      # labeled PR evaluation
make adversarial    # 50 attack scenarios
make cross-validate # 5-fold CV + ablation
```

---

## CLI

```bash
npx showreceipts check https://github.com/org/repo/pull/123
npx showreceipts check --paste
```

---

## GitHub Action

```yaml
name: Δ DELTA Quality Check
on:
  pull_request:
    types: [opened, edited, synchronize]
jobs:
  delta:
    runs-on: ubuntu-latest
    permissions: { pull-requests: write }
    steps:
      - uses: codewitharyan29/showreceipts/.github/actions/delta@v1
        with:
          api-url: ${{ secrets.DELTA_API_URL }}
          threshold: 20
```

Posts per-PR comment: score, detected species with evidence, derivable sentences + counterfactuals, WhatsMissing checklist, reviewer questions. Updates on every description edit.

---

## DELTA Score Badge

Add to your README:
```markdown
[![DELTA Score](https://showreceipts.onrender.com/badge/owner/repo.svg)](https://delicate-bonbon-50a0d5.netlify.app)
```

Shows your repo's median DELTA score. Auto-updates.

---

## Repo Analytics

```bash
curl https://showreceipts.onrender.com/repo/facebook/react/stats
```

Returns: median score, distribution, worst/best PRs, author rankings.

---

## Pre-Commit Hook

```bash
make install-hook
export DELTA_API_URL=https://showreceipts.onrender.com
export DELTA_THRESHOLD=20
```

---

## Documentation Mode (Track B)

```bash
POST /analyze  { "description": "...", "mode": "docs" }
```

Adds: `has_example`, `has_prerequisite`, `has_step` to WhatsMissing. All 6 detection signals apply identically.

---

## Tracks Covered

| Track | Coverage |
|-------|----------|
| **A — Code Review** | PR descriptions + commit messages |
| **B — Docs & KBs** | Docs mode with example/step/prereq detection |

---

## Benchmark Integrity

**Dataset construction:** 121 PRs written to reflect real PR quality patterns across 8 ecosystems. Quality PRs: substantive rationale, tradeoffs, reviewer guidance. Slop PRs: hollow, generic, restatement.

**Labeling:** single rater, explicit rubric (see `dataset/labeling_methodology.md`). No inter-rater agreement (single reviewer during 72h hackathon window). Honest limitation.

**Overfitting prevention:** 5-fold CV (mean F1=0.945, std=0.074), LOOCV (96.0%), train/test split with zero generalization gap. Numbers generalize.

**Anti-gaming:** 50 documented attacks, all blocked. See `dataset/adversarial_results.json`.

**Error analysis:** every FP and FN analyzed. See `dataset/error_analysis.md`.

---

## Why Zero LLM Calls Matters

Every LLM-based detector shares one weakness: opaque reasoning, API dependency, CI key exposure risk. DELTA runs in ~300ms locally, every score is formula-traceable, CI works without API keys.

Ghost Prediction (optional LLM explanation tab) is clearly labeled as explanation, not detection.

---

## Project Structure

```
showreceipts/
├── backend/
│   ├── detection/
│   │   ├── engine.py           # 6-signal ensemble
│   │   ├── github_parser.py    # PR fetch + diff parse
│   │   ├── repo_analytics.py   # Repo-level stats
│   │   └── signals/
│   │       ├── dris.py         # Diff-Relative Information Score
│   │       ├── ecs.py          # Epistemic Contribution Score
│   │       ├── alignment.py    # TF-IDF penalty + engagement
│   │       ├── diff_surprise.py # Diff Surprise Score (novel)
│   │       ├── whats_missing.py # Anti-gaming epistemic coverage
│   │       └── species.py      # 7-species rule-based classifier
│   └── tests/
│       └── test_signals.py     # 27 unit tests
├── frontend/                   # Next.js
├── cli/                        # npx showreceipts
├── dataset/
│   ├── quality_prs.jsonl       # 65 quality PRs
│   ├── slop_prs.jsonl          # 56 slop PRs
│   ├── dataset_statistics.json # Ecosystem distribution
│   ├── benchmark_results.json  # Real evaluation numbers
│   ├── cross_validation_results.json
│   ├── adversarial_results.json
│   ├── taxonomy_poster.svg     # Shareable species visual
│   ├── error_analysis.md       # FP/FN analysis
│   ├── limitations.md          # Honest failure modes
│   └── labeling_methodology.md
├── hooks/pre-commit
├── .github/workflows/
│   ├── ci.yml
│   └── delta-check.yml
└── Makefile
```

---

## Submission

- **Demo:** https://delicate-bonbon-50a0d5.netlify.app
- **API:** https://showreceipts.onrender.com
- **CLI:** `npx showreceipts`
- **Tracks:** A + B
- **Tools:** Next.js, FastAPI, sentence-transformers, scikit-learn. Disclosed per rules.
