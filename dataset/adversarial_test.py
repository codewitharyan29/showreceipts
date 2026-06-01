"""
DELTA Adversarial Test Suite
==============================
Documents 50 gaming attempts against DELTA and verifies each fails.
Run: cd backend && python ../dataset/adversarial_test.py

A passing adversarial test means DELTA correctly resists the attack
(scores the gaming attempt LOW, as Medium/High Slop).

Expected: all 50 attacks score < 55 (below "Low Slop" threshold).
A gaming attempt that scores >= 55 is a vulnerability.
"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../backend')

from detection.signals.ecs import compute_ecs
from detection.signals.alignment import compute_alignment, compute_engagement
from detection.signals.whats_missing import compute_whats_missing
import numpy as np

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

def info_density(description):
    words = description.lower().split()
    content = [re.sub(r'[^a-z]', '', w) for w in words if len(w) > 2]
    content = [w for w in content if w and w not in STOP]
    unique = len(set(content))
    total = max(1, len(content))
    return min(1.0, (unique / total) * 1.4)

def score(description, diff="auth.py tokenManager.ts"):
    sents = split_sents(description)
    ecs, _ = compute_ecs(sents, [])
    alignment = compute_alignment(description, diff)
    engagement = compute_engagement(sents, [])
    missing = compute_whats_missing(description, "pr")
    density = info_density(description)
    missing_score = (
        missing.has_why*0.30 + missing.has_tradeoff*0.20 +
        missing.has_alternative*0.20 + missing.has_risk*0.15 + missing.has_evidence*0.15
    )
    fast = (missing_score*0.294 + ecs*0.294 + engagement*0.176 +
            (1-alignment)*0.176 + density*0.059) * 100
    return round(fast * 0.68 + 50 * 0.32, 1)

ATTACKS = [
    # ── Category 1: Keyword Stuffing ──────────────────────────────
    ("KW-01 bare triggers",
     "This PR fixes the issue because. Alternative: something. Risk: none. Tested."),
    ("KW-02 single-word template",
     "Root cause: bug. Tradeoff: speed. Alternative: other. Risk: regression. Evidence: yes."),
    ("KW-03 because + single word",
     "Updated auth because performance. Fixed token because issues."),
    ("KW-04 why phrase minimal",
     "The reason we changed this is performance."),
    ("KW-05 filler causal",
     "We made this change because it is better and more efficient than before."),
    ("KW-06 generic rationale",
     "This was done because best practices require it. Code quality improved."),
    ("KW-07 empty alternative",
     "We considered other approaches but chose this one."),
    ("KW-08 vague risk",
     "Reviewers should check this. There may be some risk involved."),
    ("KW-09 one-word evidence",
     "Tested. CI passed. Verified."),
    ("KW-10 padded template",
     "Root cause: the existing code had issues that needed to be addressed. "
     "Alternative: we could have done something different but chose not to. "
     "Risk: there might be some edge cases. Tested locally."),

    # ── Category 2: Verbosity Attacks ─────────────────────────────
    ("VB-01 long repetitive",
     "This PR updates the authentication module. The authentication module has been updated. "
     "We have made changes to the authentication module. The authentication module changes are included. "
     "The authentication module update is ready for review."),
    ("VB-02 padding paragraphs",
     "This change improves the codebase. The improvement makes the code better. Better code leads to "
     "better software. Better software benefits the team. The team benefits from this improvement."),
    ("VB-03 filler sentences",
     "We have carefully reviewed the existing implementation. After thorough analysis we made changes. "
     "The changes were reviewed again. The review confirmed the changes are correct. Correct changes were merged."),
    ("VB-04 long generic pr",
     " ".join(["This PR makes various improvements to the codebase."] * 8)),

    # ── Category 3: Entity Injection ──────────────────────────────
    ("EI-01 paste function names",
     "Updated tokenManager, sessionHandler, authService, refreshToken, validateCredentials. "
     "Modified userCache, permissionCheck, loginFlow, logoutHandler, tokenValidator."),
    ("EI-02 technical jargon dump",
     "Changes to JWT, HMAC, SHA-256, RSA-2048, PKCE, OAuth2, OIDC, mTLS, RBAC, ABAC."),
    ("EI-03 entity + because no context",
     "Changed tokenManager because sessionHandler. Updated authService because refreshToken."),
    ("EI-04 single entity stuffing (anti-gaming target)",
     "We changed tokenManager because tokenManager had issues. tokenManager was causing tokenManager "
     "problems. tokenManager was chosen instead of tokenManager alternatives. tokenManager risk: tokenManager."),

    # ── Category 4: Template Attacks ──────────────────────────────
    ("TP-01 fill-in-blank template",
     "Root cause: [X was causing Y]. We chose [approach] instead of [alternative] because [reason]. "
     "Reviewers should check [location]. Tested by [method]."),
    ("TP-02 structured template bare",
     "**Root cause:** X\n**Alternative:** Y\n**Tradeoff:** speed vs memory\n**Risk:** regression\n**Tested:** yes"),
    ("TP-03 PR template auto-fill",
     "## What does this PR do?\nFixes the bug.\n## Why?\nBecause it was broken.\n## Testing\nTested locally.\n## Risk\nLow risk."),
    ("TP-04 changelog style",
     "- Fix authentication\n- Update session handling\n- Improve error messages\n- Add unit tests\n- Refactor code"),
    ("TP-05 copy-paste doc header",
     "This PR addresses issue #123. Changes include updates to core functionality. "
     "All tests pass. Ready for review."),

    # ── Category 5: Score Inflation ────────────────────────────────
    ("SI-01 contrastive without specifics",
     "We chose approach A over approach B. Method X instead of method Y. C rather than D."),
    ("SI-02 fake quantitative",
     "Performance improved by X%. Latency reduced by Y ms. Memory usage: Z MB."),
    ("SI-03 causal chain generic",
     "Because this, therefore that. Since X, we did Y. In order to achieve A, we did B."),
    ("SI-04 uncertainty hedging",
     "I'm not sure if this is the best approach. Might work, could break something, unclear about edge cases."),
    ("SI-05 tradeoff keywords no content",
     "This has tradeoffs. Better performance but more complex. Faster but uses more memory."),

    # ── Category 6: Benchmark Attacks ─────────────────────────────
    ("BM-01 training data mimicry",
     "Root cause: the N+1 query in service was causing 47 DB calls. Replaced with JOIN."),  # should actually score OK - this is real content
    ("BM-02 copy good PR structure",
     "Root cause: X causes Y. We chose Z instead of W because of Q. Reviewers check P. Tested by M."),

    # ── Category 7: Semantic Fog ───────────────────────────────────
    ("SF-01 circular paragraphs",
     "The authentication handles authentication. Authentication is handled by the authentication layer. "
     "The layer for authentication authenticates. Authentication authentication handles auth."),
    ("SF-02 jargon without meaning",
     "This refactors the modular architecture to improve scalability and maintainability through "
     "optimized codebase restructuring for better performance and code quality improvement."),
    ("SF-03 passive voice everything",
     "Changes have been made. Code has been updated. Tests have been written. "
     "Reviews have been conducted. Improvements have been implemented."),

    # ── Category 8: Specificity Spoofing ──────────────────────────
    ("SS-01 fake file references",
     "Changed tokenManager.ts:L89. Updated auth.py:L142. Modified session.go:L23."),
    ("SS-02 fake benchmark numbers",
     "Performance: X ms before, Y ms after. Memory: A MB. Latency: B ms."),
    ("SS-03 fake pr number",
     "Fixes #2891. Closes #1234. Resolves #5678. Addresses #9012."),
    ("SS-04 placeholders",
     "Root cause: [FILL IN]. Alternative: [FILL IN]. Risk: [FILL IN]. Evidence: [FILL IN]."),

    # ── Category 9: Length Manipulation ────────────────────────────
    ("LM-01 one sentence",
     "Fixed the bug."),
    ("LM-02 two sentences",
     "Updated auth.py. Tests pass."),
    ("LM-03 extreme length padding",
     ("This change is very important and necessary for the application. " * 20).strip()),

    # ── Category 10: Composite Attacks ────────────────────────────
    ("CM-01 keyword + entities + structure",
     "Root cause: tokenManager had refreshToken issue. Alternative: sessionHandler approach considered "
     "but tokenManager chosen instead because authService. Risk: tokenManager edge case. "
     "Tested tokenManager with refreshToken validation."),
    ("CM-02 technical terms + causal",
     "Used JWT instead of session cookies because HMAC verification is faster. "
     "Chose RSA-2048 rather than Ed25519 since broader library support. "
     "Tradeoff: key size vs compatibility. Risk: none. Tested: yes."),
    ("CM-03 all patterns minimal content",
     "Because performance. Instead of old way. Considered alternatives. Risk exists. CI passed."),
    ("CM-04 sophisticated template",
     "We identified a root cause involving the interaction between the component and its dependencies. "
     "The alternative approach was evaluated but rejected due to compatibility considerations. "
     "The primary tradeoff involves balancing performance with maintainability. "
     "Reviewers should be aware of potential edge cases in the implementation. "
     "Validation was performed through standard testing procedures."),

    # ── Category 11: Genuine High-Quality PRs (should score > 55) ─
    # These are POSITIVE controls — attacks that should NOT be resisted
    ("POSITIVE-01 real quality PR",
     "Root cause: token refresh fires 200ms after the expiring token is consumed. "
     "On iOS with clock drift >30s (common after airplane mode), the expiry check uses server time "
     "but refresh scheduler uses client time. Token appears valid client-side, rejected server-side. "
     "Affected ~3% of mobile sessions per Datadog.\n\n"
     "Fixed by triggering refresh at 80% of TTL instead of on-expiry. "
     "Alternative considered: reduce token TTL to 5min — rejected because that triples refresh rate for all clients.\n"
     "Reviewers should scrutinize queue flush logic at L89 under rapid concurrent requests.\n"
     "Tested on iOS 16 Safari with 45-second artificial clock offset via Charles proxy."),

    ("POSITIVE-02 real quality doc",
     "The rate limiter uses a sliding window algorithm implemented with Redis sorted sets. "
     "For each request, we store a member with Unix timestamp as score. "
     "We remove all members older than 60 seconds before counting. "
     "Tradeoff: O(log n) per request instead of O(1) for fixed window, "
     "but the sliding window prevents the 2x burst at window boundaries. "
     "Alternative considered: token bucket — rejected because it requires a separate TTL maintenance process. "
     "Memory usage: measured at <2MB additional under peak load of 10k req/min."),

    # ── Category 12: Edge Cases ────────────────────────────────────
    ("EC-01 non-english keywords",
     "Dies ändert die Authentifizierung weil der Token abgelaufen war. "
     "Alternative: JWT statt Session. Risiko: Migration."),
    ("EC-02 code only",
     "```python\ndef refresh_token(token):\n    return new_token\n```"),
    ("EC-03 links only",
     "See: https://example.com/docs. Fixed: https://jira.example.com/PROJ-123."),
    ("EC-04 all caps",
     "FIXED THE BUG BECAUSE IT WAS BROKEN. TESTED LOCALLY. RISK IS LOW."),
    ("EC-05 mixed quality",
     "Fixed auth bug.\n\nRoot cause: the JWT validation was using a cached public key "
     "that expired 6 hours after rotation, causing 401 errors for ~2% of API calls. "
     "We now fetch the public key on each validation with a 5-minute TTL cache."),
]

SLOP_THRESHOLD = 55  # Attacks should score below this

print("DELTA Adversarial Test Suite")
print(f"{'='*60}")
print(f"Testing {len(ATTACKS)} scenarios")
print(f"Attack success threshold: score < {SLOP_THRESHOLD}")
print()

vulnerabilities = []
positive_controls = []
results = []

for name, desc in ATTACKS:
    s = score(desc)
    is_positive = name.startswith("POSITIVE")
    is_edge = name.startswith("EC-05")  # mixed quality - grey area

    if is_positive:
        ok = s >= SLOP_THRESHOLD
        status = "OK" if ok else "FAIL"
        positive_controls.append((name, s, ok))
        print(f"  {status} [POSITIVE] {name}: {s}/100 (should be ≥{SLOP_THRESHOLD})")
    elif is_edge:
        print(f"  -- [EDGE CASE] {name}: {s}/100 (grey area)")
    else:
        ok = s < SLOP_THRESHOLD
        if not ok:
            vulnerabilities.append((name, s))
            print(f"  VULNERABILITY {name}: {s}/100 (attack succeeded!)")
        else:
            results.append((name, s))
            print(f"  OK {name}: {s}/100 ✓")

print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"{'='*60}")
attacks = [a for a in ATTACKS if not a[0].startswith("POSITIVE") and not a[0].startswith("EC-05")]
print(f"Attacks tested:        {len(attacks)}")
print(f"Attacks blocked:       {len(results)}")
print(f"Vulnerabilities found: {len(vulnerabilities)}")
print(f"Positive controls OK:  {sum(1 for _,_,ok in positive_controls if ok)}/{len(positive_controls)}")

if vulnerabilities:
    print(f"\nVulnerabilities (score ≥ {SLOP_THRESHOLD}):")
    for name, s in vulnerabilities:
        print(f"  {name}: {s}/100")

attack_scores = [score(desc) for name, desc in ATTACKS if not name.startswith("POSITIVE")]
print(f"\nAttack score distribution:")
print(f"  Mean: {sum(attack_scores)/len(attack_scores):.1f}")
print(f"  Max:  {max(attack_scores):.1f}")
print(f"  Min:  {min(attack_scores):.1f}")

# Save results
out_dir = os.path.dirname(os.path.abspath(__file__))
report = {
    "attacks_tested": len(attacks),
    "attacks_blocked": len(results),
    "vulnerabilities": len(vulnerabilities),
    "vulnerability_details": [{"name": n, "score": s} for n, s in vulnerabilities],
    "positive_controls_passed": sum(1 for _,_,ok in positive_controls if ok),
    "attack_score_stats": {
        "mean": round(sum(attack_scores)/len(attack_scores), 1),
        "max": max(attack_scores),
        "min": min(attack_scores),
    }
}
with open(os.path.join(out_dir, 'adversarial_results.json'), 'w') as f:
    json.dump(report, f, indent=2)
print(f"\nSaved: dataset/adversarial_results.json")
