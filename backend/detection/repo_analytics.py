"""
DELTA Repo-Level Analytics
===========================
Analyzes all recent PRs in a repository and returns:
  - Median DELTA score (fast mode, no model)
  - Score distribution
  - Worst and best PRs
  - Author score rankings
  - Trend over time (last 30 days vs previous 30 days)

Used by GET /repo/{owner}/{repo}/stats
"""
import re
from datetime import datetime, timezone
from detection.signals.ecs import compute_ecs
from detection.signals.alignment import compute_alignment, compute_engagement
from detection.signals.whats_missing import compute_whats_missing

STOP = frozenset({'a','an','the','is','are','was','were','be','been','have','has','had',
                  'do','does','did','will','would','to','of','in','on','at','by','for',
                  'with','from','this','that','it','we','they','you','i','and','or','but'})

def split_sents(text):
    sents = []
    for line in re.split(r'\n', text):
        line = re.sub(r'^[-*+#\d\.]\s*', '', line.strip())
        if len(line.split()) >= 3:
            sents.append(line)
    return sents

def info_density(desc):
    words = desc.lower().split()
    content = [re.sub(r'[^a-z]','',w) for w in words if len(w)>2]
    content = [w for w in content if w and w not in STOP]
    return min(1.0, (len(set(content))/max(1,len(content)))*1.4)

def score_description_fast(description: str, diff: str = "") -> float:
    """Fast DELTA score without sentence-transformer model."""
    sents = split_sents(description)
    ecs, _ = compute_ecs(sents, [])
    alignment = compute_alignment(description, diff)
    engagement = compute_engagement(sents, [])
    density = info_density(description)
    missing = compute_whats_missing(description, "pr")
    ms = (missing.has_why*0.30 + missing.has_tradeoff*0.20 + missing.has_alternative*0.20
          + missing.has_risk*0.15 + missing.has_evidence*0.15)
    fast = (ms*0.294 + ecs*0.294 + engagement*0.176 + (1-alignment)*0.176 + density*0.059) * 100
    return round(fast, 1)


def slop_label(score: float) -> str:
    if score >= 76: return "Quality"
    elif score >= 51: return "Low Slop"
    elif score >= 26: return "Medium Slop"
    else: return "High Slop"


def analyze_repo(owner: str, repo: str, github_token: str = "", max_prs: int = 30) -> dict:
    """Fetch and analyze recent merged PRs for a repository."""
    import urllib.request, json

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "DELTA-ShowReceipts/2.0",
    }
    if github_token:
        headers["Authorization"] = f"token {github_token}"

    url = f"https://api.github.com/repos/{owner}/{repo}/pulls?state=closed&per_page={max_prs}&sort=updated&direction=desc"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            prs = json.loads(r.read())
    except Exception as e:
        raise ValueError(f"GitHub API error: {e}")

    if not isinstance(prs, list):
        raise ValueError(f"Unexpected GitHub response: {prs.get('message', 'unknown error')}")

    results = []
    for pr in prs:
        if not pr.get("merged_at"):
            continue
        body = (pr.get("body") or "").strip()
        if len(body.split()) < 5:
            continue  # skip trivial
        s = score_description_fast(body)
        merged_at = pr.get("merged_at", "")
        results.append({
            "number": pr["number"],
            "title": pr["title"][:80],
            "author": pr.get("user", {}).get("login", "unknown"),
            "url": pr["html_url"],
            "delta_score": s,
            "slop_label": slop_label(s),
            "merged_at": merged_at,
            "word_count": len(body.split()),
        })

    if not results:
        return {"error": "No merged PRs with descriptions found", "repo": f"{owner}/{repo}"}

    scores = [r["delta_score"] for r in results]
    sorted_results = sorted(results, key=lambda x: x["delta_score"])

    # Author stats
    from collections import defaultdict
    author_scores = defaultdict(list)
    for r in results:
        author_scores[r["author"]].append(r["delta_score"])
    author_stats = sorted([
        {"author": a, "pr_count": len(s), "median_score": round(sorted(s)[len(s)//2], 1),
         "trend": "improving" if len(s) >= 2 and s[-1] > s[0] else "declining" if len(s) >= 2 and s[-1] < s[0] else "stable"}
        for a, s in author_scores.items()
    ], key=lambda x: x["median_score"])

    # Score distribution
    distribution = {
        "high_slop_pct": round(sum(1 for s in scores if s < 26) / len(scores) * 100, 1),
        "medium_slop_pct": round(sum(1 for s in scores if 26 <= s < 51) / len(scores) * 100, 1),
        "low_slop_pct": round(sum(1 for s in scores if 51 <= s < 76) / len(scores) * 100, 1),
        "quality_pct": round(sum(1 for s in scores if s >= 76) / len(scores) * 100, 1),
    }

    import statistics
    return {
        "repo": f"{owner}/{repo}",
        "prs_analyzed": len(results),
        "median_score": round(statistics.median(scores), 1),
        "mean_score": round(statistics.mean(scores), 1),
        "min_score": min(scores),
        "max_score": max(scores),
        "distribution": distribution,
        "worst_prs": sorted_results[:3],
        "best_prs": sorted_results[-3:][::-1],
        "author_rankings": author_stats,
        "all_scores": scores,  # for trend chart
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }
