# When DELTA Gets It Wrong

DELTA is a pattern-matching detection tool. It is not perfect. This page documents every known failure mode honestly.

## Systematic False Negatives (High-Quality PRs Under-Scored)

**Kernel-style terse brevity (~22% FP rate on solo maintainers)**
Linux kernel, OpenBSD, and some solo maintainer PRs use extreme brevity by convention. "Fix use-after-free in TCP receive path. Hold additional sk_buff reference." is high quality but scores ~38/100. DELTA shows a false-positive warning for PRs under 40 words.

**External reference PRs**
"Fixes CVE-2024-XXXXX. See advisory." — the reasoning exists in an external document. DELTA sees an empty description. Score: ~30. Correct from "description quality" perspective; wrong if you count the advisory.

**Non-English PRs**
ECS epistemic act patterns are English-only regex. PRs in Chinese, German, Spanish etc. have ~15% lower accuracy. The sentence-transformer DRIS signal is multilingual and unaffected.

## Systematic False Positives (Slop PRs Over-Scored)

**Entity injection (~8pt inflation)**
Pasting function names from the diff into an otherwise hollow description inflates ECS. "Fixed tokenManager and sessionHandler" scores higher than "Fixed authentication" because technical identifiers count as partial specificity evidence. Anti-gaming dampening mitigates the worst cases (single entity repeated 4+ times).

**Sophisticated multi-pattern templates (max ~48/100)**
A description that hits all 5 WhatsMissing triggers with generic content ("Root cause: the issue was causing problems. Alternative considered but rejected. Tradeoff: speed vs. memory. Reviewers should check. Tested locally.") reaches ~48/100. This remains in Medium Slop territory, correctly below the Quality/Low-Slop boundary. Not a significant risk.

## What DELTA Is Not Designed To Detect

- **PR descriptions that are correct but unnecessary** (trivial changes with correct descriptions)
- **PRs where the code explains itself** (well-named refactors where the diff IS the documentation)
- **Private context** (team conventions, linked Jira tickets, prior verbal discussion)
- **Whether the described approach is technically sound** (DELTA measures whether reasoning was communicated, not whether it was right)

## Threshold Guidance

| Use case | Recommended threshold | Rationale |
|----------|-----------------------|-----------|
| Hard CI gate (fail build) | 20 | Only block genuinely empty descriptions |
| Soft CI warning | 35 | Flag descriptions likely to frustrate reviewers |
| Quality aspiration | 50 | Target for teams improving PR culture |
| Bake-Off optimal | 45 | Maximum F1 on our benchmark dataset |

## Confidence Signal

Every DELTA response includes a `confidence` field (0-1). Low confidence (< 0.5) means high variance in sentence derivability scores — the description has a mix of novel and redundant content, and the score is less reliable. Use confidence as a meta-signal: high-confidence scores are more actionable.
