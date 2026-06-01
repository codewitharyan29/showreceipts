'use client'
import { useState } from 'react'
import Link from 'next/link'

const CLI_OUTPUT = `  Δ DELTA — ShowReceipts
  ─────────────────────────────────────────
  PR: Fix authentication bug

  ██████░░░░░░░░░░░░░░░░░░░░░░░░  23/100  High Slop

  Signals:
  DRIS        18/100  novelty vs diff
  ECS          8/100  epistemic acts
  Confidence: 84%  |  LLM calls: 0  |  312ms

  ◈ The Xerox (89% confidence)
    evidence: "Updated the authentication service."
    fix: Replace diff restatements with reasoning.

  🔴 Derivable sentences:
    "Updated the authentication middleware."
    → Explain WHY not WHAT

  Missing: ✗ Rationale  ✗ Tradeoffs  ✗ Risks
  ─────────────────────────────────────────`

const ACTION_YAML = `name: Δ DELTA Quality Check
on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  delta:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Analyze PR with DELTA
        run: |
          RESPONSE=$(curl -sf -X POST "$\{{ secrets.DELTA_API_URL }}/analyze" \\
            -H "Content-Type: application/json" \\
            -d '{"pr_url":"$\{{ github.event.pull_request.html_url }}"}')
          echo "$RESPONSE"`

const ACTION_COMMENT = `## 🔴 Δ DELTA Score: 23/100 — High Slop

\`██████░░░░░░░░░░░░░░\` 23/100

**Detected:** ◈ The Xerox (89%)

**🔴 Derivable sentences:**
  "Updated the authentication service."
  → Explain WHY not WHAT

**Missing:**
- ❌ Rationale (WHY)
- ❌ Tradeoffs
- ❌ Risks

[View full breakdown →](https://delicate-bonbon-50a0d5.netlify.app)`

const HOOK_OUTPUT = `DELTA: analyzing commit message...
DELTA score: 19/100 — High Slop

⚠ Score 19 is below threshold 20
Consider explaining WHY this change was needed.
(Set DELTA_THRESHOLD=0 to disable)`

export default function IntegrationsPage() {
  const [tab, setTab] = useState<'cli'|'action'|'hook'|'badge'>('cli')

  const tabs = [
    { id: 'cli'    as const, label: '⌘ CLI',            sub: 'Terminal' },
    { id: 'action' as const, label: '⚡ GitHub Action',  sub: 'CI/CD' },
    { id: 'hook'   as const, label: '🔗 Pre-commit Hook',sub: 'Git' },
    { id: 'badge'  as const, label: '🏷 Badge',          sub: 'README' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="sticky top-0 z-50 border-b border-[var(--border)]"
        style={{ background: 'rgba(7,8,10,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-[var(--sig-green)] text-xl font-bold">Δ</span>
            <span className="font-display font-bold text-[var(--white)] tracking-tight">
              Show<span className="text-[var(--sig-purple)]">Receipts</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/analyze"     className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">Analyze</Link>
            <Link href="/leaderboard" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">Leaderboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--white)] mb-2">Integrations</h1>
          <p className="text-[var(--muted)] text-sm">
            Use DELTA in your terminal, CI pipeline, git workflow, or README.
            Zero LLM calls. Fast. Auditable.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="pb-3 px-3 text-left"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid var(--sig-green)' : '2px solid transparent',
              }}>
              <div className="text-sm font-mono" style={{ color: tab === t.id ? 'var(--white)' : 'var(--muted)' }}>
                {t.label}
              </div>
              <div className="text-xs text-[var(--muted)]">{t.sub}</div>
            </button>
          ))}
        </div>

        {/* CLI */}
        {tab === 'cli' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--border)] p-5 space-y-4" style={{ background: 'var(--surface)' }}>
              <h2 className="font-mono text-sm font-bold text-[var(--white)]">Install & Run</h2>
              {[
                { label: 'Analyze a GitHub PR:', code: 'npx showreceipts check https://github.com/owner/repo/pull/123', color: '#00E87A' },
                { label: 'Paste description from stdin:', code: 'npx showreceipts check --paste\n# Paste text → Ctrl+Z (Windows) / Ctrl+D (Mac)', color: '#00E87A' },
                { label: 'Set backend URL (Windows):', code: '$env:DELTA_API_URL = "https://showreceipts.onrender.com"\nnpx showreceipts check <pr-url>', color: '#9AE030' },
              ].map((s, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs text-[var(--muted)]">{s.label}</p>
                  <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto"
                    style={{ background: '#080808', border: '1px solid var(--border)', color: s.color }}>
                    {s.code}
                  </pre>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
              <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF4040]" />
                <div className="w-3 h-3 rounded-full bg-[#FF9020]" />
                <div className="w-3 h-3 rounded-full bg-[#00E87A]" />
                <span className="ml-3 text-xs font-mono text-[var(--muted)]">terminal output</span>
              </div>
              <pre className="text-xs font-mono p-4 leading-relaxed" style={{ color: '#777' }}>{CLI_OUTPUT}</pre>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { title: '0 LLM calls', desc: 'Pure signal analysis. No API key needed for detection.' },
                { title: '~300ms', desc: 'Typical response time on cached model.' },
                { title: 'CI-safe', desc: 'No secrets exposed in logs or build output.' },
                { title: 'Pipeable', desc: 'Compose with grep, jq, or any Unix tool.' },
              ].map((s, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] p-3" style={{ background: '#080808' }}>
                  <div className="font-mono text-xs font-bold text-[var(--sig-green)]">{s.title}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GITHUB ACTION */}
        {tab === 'action' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--border)] p-5 space-y-4" style={{ background: 'var(--surface)' }}>
              <h2 className="font-mono text-sm font-bold text-[var(--white)]">3-step setup</h2>
              {[
                { n:'1', t:'Add secret', d:'GitHub repo → Settings → Secrets → Actions', code:'DELTA_API_URL = https://showreceipts.onrender.com' },
                { n:'2', t:'Copy workflow file', d:'Create .github/workflows/delta-check.yml in your repo', code:null },
                { n:'3', t:'Open a PR', d:'DELTA comments automatically on every PR open or edit', code:null },
              ].map(s => (
                <div key={s.n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                    style={{ background: 'rgba(0,232,122,0.15)', color: 'var(--sig-green)' }}>{s.n}</div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm text-[var(--white)]">{s.t}</p>
                    <p className="text-xs text-[var(--muted)]">{s.d}</p>
                    {s.code && (
                      <pre className="text-xs font-mono p-2 rounded mt-1"
                        style={{ background: '#080808', color: '#00E87A', border: '1px solid var(--border)' }}>
                        {s.code}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
              <div className="px-4 py-2 border-b border-[var(--border)]">
                <span className="text-xs font-mono text-[var(--muted)]">.github/workflows/delta-check.yml</span>
              </div>
              <pre className="text-xs font-mono p-4 overflow-x-auto leading-relaxed" style={{ color: '#9AE030' }}>
                {ACTION_YAML}
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest">PR comment preview:</p>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
                <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[var(--border)]" />
                  <span className="text-xs font-mono text-[var(--muted)]">github-actions[bot] commented</span>
                </div>
                <pre className="text-xs font-mono p-4 whitespace-pre-wrap leading-relaxed" style={{ color: '#888' }}>
                  {ACTION_COMMENT}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* PRE-COMMIT */}
        {tab === 'hook' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--border)] p-5 space-y-4" style={{ background: 'var(--surface)' }}>
              <h2 className="font-mono text-sm font-bold text-[var(--white)]">Install hook</h2>
              <pre className="text-xs font-mono p-3 rounded-lg" style={{ background: '#080808', border: '1px solid var(--border)', color: '#00E87A' }}>
{`# From your repo root (Windows)
copy hooks\\pre-commit .git\\hooks\\pre-commit

# Set backend + threshold
$env:DELTA_API_URL = "https://showreceipts.onrender.com"
$env:DELTA_THRESHOLD = "20"

# Now every commit checks message quality
git commit -m "Fix auth bug"`}
              </pre>
            </div>

            <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
              <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF4040]" />
                <div className="w-3 h-3 rounded-full bg-[#FF9020]" />
                <div className="w-3 h-3 rounded-full bg-[#00E87A]" />
                <span className="ml-3 text-xs font-mono text-[var(--muted)]">git commit -m "Fix auth bug"</span>
              </div>
              <pre className="text-xs font-mono p-4 leading-relaxed" style={{ color: '#FF9020' }}>{HOOK_OUTPUT}</pre>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { title: 'Non-blocking option', desc: 'Set DELTA_THRESHOLD=0 to warn only, never block commits.' },
                { title: 'Safe fallback', desc: 'Skips silently if backend is unreachable.' },
                { title: 'Instant feedback', desc: 'Catch slop before it reaches reviewers.' },
                { title: 'Team adoption', desc: 'Each developer installs once. Gradual culture change.' },
              ].map((s, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] p-3" style={{ background: '#080808' }}>
                  <div className="font-mono text-xs font-bold text-[var(--sig-green)]">{s.title}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BADGE */}
        {tab === 'badge' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--border)] p-5 space-y-4" style={{ background: 'var(--surface)' }}>
              <h2 className="font-mono text-sm font-bold text-[var(--white)]">Add to README</h2>
              <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto"
                style={{ background: '#080808', border: '1px solid var(--border)', color: '#9AE030' }}>
{`[![DELTA Score](https://showreceipts.onrender.com/badge/owner/repo.svg)](https://delicate-bonbon-50a0d5.netlify.app)`}
              </pre>

              <div className="space-y-2">
                <p className="text-xs text-[var(--muted)]">Badge styles by score:</p>
                <div className="flex gap-3 flex-wrap items-center">
                  {[
                    { score: 82, label: 'Quality',     color: '#2ea44f' },
                    { score: 58, label: 'Low Slop',    color: '#e3b341' },
                    { score: 34, label: 'Medium Slop', color: '#cf7200' },
                    { score: 19, label: 'High Slop',   color: '#d73a49' },
                  ].map(b => (
                    <svg key={b.score} xmlns="http://www.w3.org/2000/svg" width="160" height="20" style={{ display: 'block' }}>
                      <clipPath id={`rr${b.score}`}><rect width="160" height="20" rx="3" fill="#fff"/></clipPath>
                      <g clipPath={`url(#rr${b.score})`}>
                        <rect width="90" height="20" fill="#555"/>
                        <rect x="90" width="70" height="20" fill={b.color}/>
                      </g>
                      <g fill="#fff" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="11">
                        <text x="45" y="14">Δ DELTA {b.score}</text>
                        <text x="125" y="14">{b.label}</text>
                      </g>
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-5 space-y-3" style={{ background: 'var(--surface)' }}>
              <h2 className="font-mono text-sm font-bold text-[var(--white)]">API endpoints</h2>
              <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto"
                style={{ background: '#080808', border: '1px solid var(--border)', color: '#9AE030' }}>
{`# Repo stats JSON
GET /repo/{owner}/{repo}/stats

# Badge SVG (auto-updates)
GET /badge/{owner}/{repo}.svg

# Single PR analysis
POST /analyze  { "pr_url": "..." }`}
              </pre>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/analyze"
            className="flex-1 py-3 rounded-xl font-mono text-sm font-bold text-center"
            style={{ background: 'var(--sig-green)', color: 'var(--bg)' }}>
            Analyze a PR →
          </Link>
          <Link href="/leaderboard"
            className="flex-1 py-3 rounded-xl font-mono text-sm font-bold text-center border border-[var(--border2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            View Leaderboard →
          </Link>
        </div>
      </div>
    </div>
  )
}
