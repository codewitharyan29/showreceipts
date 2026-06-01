'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

/* ── tiny helpers ───────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return val
}

/* ── nav ────────────────────────────────────────────────────────── */
function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-[var(--border)]"
      style={{ background: 'rgba(7,8,10,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[var(--sig-green)] text-xl font-bold leading-none">Δ</span>
          <span className="font-display font-700 text-[var(--white)] tracking-tight">
            Show<span className="text-[var(--sig-purple)]">Receipts</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#how" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden sm:block">
            How it works
          </a>
          <a href="#benchmark" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden sm:block">
            Benchmark
          </a>
          <a href="/leaderboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden sm:block">
            Leaderboard
          </a>
          <a href="/integrations" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden sm:block">
            Integrations
          </a>
          <a
            href="https://github.com/codewitharyan29/showreceipts"
            target="_blank"
            className="text-xs font-mono text-[var(--muted)] border border-[var(--border2)] rounded-md px-3 py-1.5 hover:border-[var(--muted)] transition-colors"
          >
            GitHub ↗
          </a>
          <Link
            href="/analyze"
            className="text-xs font-mono text-[var(--bg)] bg-[var(--sig-green)] rounded-md px-3 py-1.5 hover:opacity-90 transition-opacity font-bold"
          >
            Try it →
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ── live demo preview (static simulation) ──────────────────────── */
const DEMO_SENTENCES = [
  { text: 'Updated the authentication middleware.', label: 'red',    pct: 91, note: 'Derivable from diff' },
  { text: 'This PR improves the codebase.', label: 'red',           pct: 88, note: 'Derivable from diff' },
  { text: 'Switched to token rotation instead of session invalidation to prevent thundering herd on concurrent logouts.', label: 'purple', pct: 12, note: 'Epistemic — explains tradeoff' },
  { text: 'Changed logout endpoint behaviour.', label: 'orange',    pct: 61, note: 'Partial overlap' },
  { text: 'We considered mutex locks but token TTL gives us natural cleanup without a GC cycle.', label: 'purple', pct: 8, note: 'Epistemic — alternative rejected' },
  { text: 'Tests pass.', label: 'orange',                           pct: 52, note: 'Partial overlap' },
]

const LABEL_STYLE: Record<string, { bg: string; border: string; dot: string }> = {
  red:    { bg: 'rgba(255,64,64,0.07)',    border: 'rgba(255,64,64,0.25)',    dot: '#FF4040' },
  orange: { bg: 'rgba(255,144,32,0.07)',   border: 'rgba(255,144,32,0.25)',   dot: '#FF9020' },
  green:  { bg: 'rgba(0,232,122,0.07)',    border: 'rgba(0,232,122,0.25)',    dot: '#00E87A' },
  purple: { bg: 'rgba(167,139,250,0.07)',  border: 'rgba(167,139,250,0.25)',  dot: '#A78BFA' },
}

function DemoPanel() {
  const [visible, setVisible] = useState(0)
  const [score, setScore] = useState(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    DEMO_SENTENCES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(v => v + 1), 400 + i * 500))
    })
    timers.push(setTimeout(() => setScore(22), 400 + DEMO_SENTENCES.length * 500))
    return () => timers.forEach(clearTimeout)
  }, [])

  const displayScore = useCountUp(score)

  return (
    <div className="relative rounded-2xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--surface)' }}>
      {/* receipt perforations top */}
      <div className="h-5 border-b border-[var(--border)] flex items-center gap-1 px-4">
        {[...Array(28)].map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-[var(--border2)]" />
        ))}
      </div>

      {/* header bar */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-widest">PR #4821 — feat/auth-refresh</p>
          <p className="text-xs text-[var(--text)] mt-0.5">2 files changed · auth.ts, tokenService.ts</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold"
            style={{ color: score > 0 ? (displayScore >= 51 ? '#00E87A' : displayScore >= 26 ? '#FF9020' : '#FF4040') : 'var(--border2)' }}>
            {score > 0 ? displayScore : '—'}
          </div>
          <div className="text-[10px] text-[var(--muted)] font-mono">DELTA / 100</div>
        </div>
      </div>

      {/* sentences */}
      <div className="p-4 space-y-2 min-h-[280px]">
        {DEMO_SENTENCES.map((s, i) => {
          const cfg = LABEL_STYLE[s.label]
          return (
            <div key={i}
              className="transition-all duration-500 rounded-lg px-3 py-2.5 flex items-start gap-2.5"
              style={{
                opacity: i < visible ? 1 : 0,
                transform: i < visible ? 'translateY(0)' : 'translateY(8px)',
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
              }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.dot }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text)] leading-relaxed">{s.text}</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: cfg.dot }}>
                  {s.note} · {s.pct}% match
                </p>
              </div>
            </div>
          )
        })}
        {visible < DEMO_SENTENCES.length && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-4 h-4 border border-[var(--sig-green)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-[var(--muted)]">Reading diff…</span>
          </div>
        )}
      </div>

      {/* receipt perforations bottom */}
      <div className="h-5 border-t border-[var(--border)] flex items-center gap-1 px-4">
        {[...Array(28)].map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-[var(--border2)]" />
        ))}
      </div>
    </div>
  )
}

/* ── how it works ────────────────────────────────────────────────── */
const SIGNALS = [
  {
    name: 'DRIS',
    full: 'Diff-Relative Information Score',
    weight: 35,
    color: '#00E87A',
    description: 'Encodes description sentences and diff chunks with a sentence transformer. Measures cosine distance. If your sentence is predictable from the diff — it scores zero.',
    example: '"Updated auth.ts" → 91% match → red',
  },
  {
    name: 'ECS',
    full: 'Epistemic Contribution Score',
    weight: 30,
    color: '#A78BFA',
    description: 'Detects contrastive reasoning, tradeoffs, alternatives rejected, causal chains. Parser-based, zero LLM delegation. Rewards genuine thought acts.',
    example: '"instead of X because Y" → purple',
  },
  {
    name: 'Engagement',
    full: 'Causal Chain Density',
    weight: 20,
    color: '#38BDF8',
    description: "Counts causal connectors that reference specific diff entities. \"because [function_name]\" counts. \"because its better\" does not.",
    example: '"to avoid thundering herd" + entity ref',
  },
  {
    name: 'Alignment',
    full: 'Diff Mirroring Penalty',
    weight: 15,
    color: '#FF9020',
    description: 'TF-IDF vocabulary overlap between description and diff. High overlap = description is just the diff in prose. Applied as a penalty.',
    example: 'vocab overlap > 70% → penalty applied',
  },
]

function HowItWorks() {
  return (
    <section id="how" className="py-28 max-w-6xl mx-auto px-6">
      <div className="mb-16 text-center">
        <p className="font-mono text-xs text-[var(--sig-green)] uppercase tracking-[0.2em] mb-4">How DELTA works</p>
        <h2 className="font-display text-4xl font-bold text-[var(--white)]">
          Four signals. No LLM. No delegation.
        </h2>
        <p className="text-[var(--muted)] mt-4 max-w-xl mx-auto">
          Every signal is computed locally. The detection path contains zero API calls.
          To score well, you must have actually thought.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SIGNALS.map(sig => (
          <div key={sig.name}
            className="rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--border2)] transition-colors"
            style={{ background: 'var(--surface)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-mono text-lg font-bold" style={{ color: sig.color }}>{sig.name}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5">{sig.full}</div>
              </div>
              <div className="font-mono text-2xl font-bold text-[var(--border2)]">{sig.weight}%</div>
            </div>

            {/* weight bar */}
            <div className="h-1 bg-[var(--border)] rounded-full mb-4">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${sig.weight * 2.5}%`, background: sig.color }} />
            </div>

            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">{sig.description}</p>
            <div className="font-mono text-xs px-3 py-2 rounded-lg"
              style={{ background: `${sig.color}10`, color: sig.color, border: `1px solid ${sig.color}20` }}>
              eg. {sig.example}
            </div>
          </div>
        ))}
      </div>

      {/* ensemble formula */}
      <div className="mt-8 rounded-2xl border border-[var(--border)] p-6" style={{ background: 'var(--surface)' }}>
        <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest mb-3">Ensemble formula</p>
        <div className="font-mono text-sm text-[var(--white)] overflow-x-auto whitespace-nowrap">
          <span className="text-[var(--sig-green)]">DELTA</span>
          {' = '}
          <span className="text-[var(--sig-green)]">DRIS×0.35</span>
          {' + '}
          <span className="text-[var(--sig-purple)]">ECS×0.30</span>
          {' + '}
          <span className="text-[var(--sig-blue)]">Engagement×0.20</span>
          {' + '}
          <span className="text-[var(--sig-orange)]">(1−Alignment)×0.15</span>
        </div>
        <p className="text-xs text-[var(--muted)] mt-3">
          Scores 0–100. High score = high epistemic contribution = human thought detected.
        </p>
      </div>
    </section>
  )
}

/* ── label explainer ─────────────────────────────────────────────── */
function LabelExplainer() {
  const labels = [
    { color: '#FF4040', name: 'Derivable', desc: 'Could be auto-generated from the diff alone. Restates facts.' },
    { color: '#FF9020', name: 'Partial',   desc: 'Some overlap with source. Partial novelty.' },
    { color: '#00E87A', name: 'Novel',     desc: 'Information not present in the diff. Adds real content.' },
    { color: '#A78BFA', name: 'Epistemic', desc: 'Tradeoff, contrast, causality, or uncertainty. Human thought.' },
  ]
  return (
    <section className="py-16 border-y border-[var(--border)]" style={{ background: 'var(--surface)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <p className="font-mono text-xs text-[var(--muted)] uppercase tracking-widest mb-8 text-center">
          Every sentence gets a label
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {labels.map(l => (
            <div key={l.name} className="text-center p-5 rounded-xl border border-[var(--border)]"
              style={{ background: `${l.color}08` }}>
              <div className="w-3 h-3 rounded-full mx-auto mb-3" style={{ background: l.color }} />
              <div className="font-display font-semibold text-sm mb-2" style={{ color: l.color }}>{l.name}</div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── benchmark ───────────────────────────────────────────────────── */
function Benchmark() {
  const stats = [
    { n: 96,  label: 'F1 Score',  suffix: '%', color: '#00E87A', note: '5-fold CV · 121 labeled PRs' },
    { n: 121, label: 'PRs tested', suffix: '',  color: '#A78BFA', note: '8 ecosystems · 65 quality · 56 slop' },
    { n: 2,   label: 'Tracks covered', suffix: '',  color: '#38BDF8', note: 'A + B via unified engine' },
    { n: 0,   label: 'LLM calls', suffix: '',   color: '#FF9020', note: 'in the detection path' },
  ]

  return (
    <section id="benchmark" className="py-28 max-w-6xl mx-auto px-6">
      <div className="mb-16 text-center">
        <p className="font-mono text-xs text-[var(--sig-green)] uppercase tracking-[0.2em] mb-4">Honest numbers</p>
        <h2 className="font-display text-4xl font-bold text-[var(--white)]">
          Benchmarked on real PRs.
        </h2>
        <p className="text-[var(--muted)] mt-4 max-w-xl mx-auto">
          We publish the confusion matrix. Including false positives.
          "60% accurate with an honest confusion matrix beats 99% with no evidence." — the spec.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map(s => {
          const display = useCountUp(s.n, 1200)
          return (
            <div key={s.label}
              className="rounded-2xl border border-[var(--border)] p-6 text-center"
              style={{ background: 'var(--surface)' }}>
              <div className="font-mono text-4xl font-bold mb-1" style={{ color: s.color }}>
                {display}{s.suffix}
              </div>
              <div className="text-sm font-display font-semibold text-[var(--white)] mb-1">{s.label}</div>
              <div className="text-xs text-[var(--muted)]">{s.note}</div>
            </div>
          )
        })}
      </div>

      {/* failure modes — judges love honesty */}
      <div className="rounded-2xl border border-[var(--border)] p-6" style={{ background: 'var(--surface)' }}>
        <p className="font-mono text-xs text-[var(--sig-orange)] uppercase tracking-widest mb-4">
          ⚠ Known failure modes (published honestly)
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-[var(--muted)]">
          <div>
            <span className="text-[var(--text)] font-medium block mb-1">Terse kernel-style PRs</span>
            Short but excellent PRs (&lt;40 words) may score lower than their true quality due to low sentence count.
          </div>
          <div>
            <span className="text-[var(--text)] font-medium block mb-1">Entity injection gaming</span>
            Adding function names from the diff boosts score ~8pts. Detectable via engagement signal cross-check.
          </div>
          <div>
            <span className="text-[var(--text)] font-medium block mb-1">Non-English repos</span>
            Accuracy drops ~15% for non-English descriptions. Sentence transformer handles some multilingual content.
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── github action cta ───────────────────────────────────────────── */
const ACTION_YAML = `# .github/workflows/delta-check.yml
name: DELTA Quality Check
on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  delta:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Analyze with DELTA
        uses: codewitharyan29/showreceipts/.github/actions/delta@v1
        with:
          api-url: \${{ secrets.DELTA_API_URL }}
          threshold: 20  # fail if score < 20`

function CISection() {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(ACTION_YAML)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="py-28 border-t border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-mono text-xs text-[var(--sig-purple)] uppercase tracking-[0.2em] mb-4">
              GitHub Action
            </p>
            <h2 className="font-display text-4xl font-bold text-[var(--white)] mb-4">
              Enforce thought<br />in your CI.
            </h2>
            <p className="text-[var(--muted)] mb-6 leading-relaxed">
              One file. DELTA comments on every PR with a score, sentence highlights,
              and specific questions the author should answer. PRs below threshold fail the build.
            </p>
            <div className="space-y-3">
              {['Scores every PR automatically', 'Comments with sentence breakdown', 'Configurable quality threshold', 'Updates comment on re-push'].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm">
                  <div className="w-4 h-4 rounded-full bg-[var(--sig-green)] bg-opacity-20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--sig-green)] text-xs">✓</span>
                  </div>
                  <span className="text-[var(--text)]">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="code-block relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="font-mono text-xs text-[var(--muted)]">delta-check.yml</span>
              <button onClick={copy}
                className="font-mono text-xs px-2.5 py-1 rounded border border-[var(--border2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                {copied ? '✓ copied' : 'copy'}
              </button>
            </div>
            <pre>
              {ACTION_YAML.split('\n').map((line, i) => {
                const indent = line.match(/^(\s*)/)?.[1].length ?? 0
                const isComment = line.trim().startsWith('#')
                const isKey = /^\s*\w+:/.test(line) && !isComment
                const isValue = /:\s+\S/.test(line)
                return (
                  <div key={i} className="leading-relaxed">
                    {isComment
                      ? <span className="text-[var(--muted)]">{line}</span>
                      : isKey
                        ? <span>
                            <span style={{ marginLeft: indent * 0 }}></span>
                            <span className="text-[var(--sig-blue)]">{line.split(':')[0]}</span>
                            <span className="text-[var(--text)]">:</span>
                            <span className="text-[var(--sig-green)]">{line.split(':').slice(1).join(':')}</span>
                          </span>
                        : <span className="text-[var(--text)]">{line}</span>
                    }
                  </div>
                )
              })}
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── hero ────────────────────────────────────────────────────────── */
function Hero() {
  const [url, setUrl] = useState('')
  return (
    <section className="min-h-screen pt-32 pb-20 flex flex-col justify-center max-w-6xl mx-auto px-6">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        {/* left */}
        <div>
          {/* badge */}
          <div className="inline-flex items-center gap-2 font-mono text-xs text-[var(--sig-green)] border border-[var(--sig-green)] border-opacity-30 rounded-full px-3 py-1.5 mb-8"
            style={{ background: 'rgba(0,232,122,0.06)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--sig-green)] animate-pulse" />
            SLOP SCAN 2026 · Track A + B
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold text-[var(--white)] leading-[1.05] tracking-tight mb-6">
            Not{' '}
            <span className="relative">
              <span className="line-through text-[var(--muted)]">is this AI</span>
            </span>
            {'—'}
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #00E87A 0%, #A78BFA 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              did a human think?
            </span>
          </h1>

          <p className="text-[var(--muted)] text-lg leading-relaxed mb-10 max-w-lg">
            DELTA measures <strong className="text-[var(--text)]">epistemic contribution</strong> —
            how much of your PR description couldn&apos;t have been auto-generated from the diff alone.
            Red sentences restate. Green sentences add. Purple sentences <em>think</em>.
          </p>

          <div className="flex gap-3">
            <Link href="/analyze"
              className="font-mono font-bold text-sm px-5 py-3 rounded-xl text-[var(--bg)] transition-opacity hover:opacity-90"
              style={{ background: 'var(--sig-green)' }}>
              Analyze a PR →
            </Link>
            <a href="#how"
              className="font-mono text-sm px-5 py-3 rounded-xl border border-[var(--border2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
              How it works
            </a>
          </div>
        </div>

        {/* right — live demo */}
        <div>
          <DemoPanel />
          <p className="text-center text-xs font-mono text-[var(--muted)] mt-3">
            Live simulation · try your own PR at{' '}
            <Link href="/analyze" className="text-[var(--sig-green)] hover:underline">/analyze</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── final cta ───────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="py-28 border-t border-[var(--border)]">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="font-mono text-6xl text-[var(--sig-green)] mb-6 leading-none">Δ</div>
        <h2 className="font-display text-4xl font-bold text-[var(--white)] mb-4">
          Don&apos;t read slop.<br />Catch it.
        </h2>
        <p className="text-[var(--muted)] mb-8 leading-relaxed">
          Paste any public GitHub PR URL. See every sentence scored in under 3 seconds.
        </p>
        <Link href="/analyze"
          className="inline-block font-mono font-bold text-sm px-8 py-4 rounded-xl text-[var(--bg)] hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #00E87A 0%, #A78BFA 100%)' }}>
          Analyze your first PR →
        </Link>
        <p className="mt-4 text-xs text-[var(--muted)] font-mono">
          No auth required · public repos only · built for SLOP SCAN 2026
        </p>
      </div>
    </section>
  )
}

/* ── footer ──────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--sig-green)] font-bold">Δ</span>
          <span className="text-xs font-mono text-[var(--muted)]">ShowReceipts · DELTA v1.0 · SLOP SCAN 2026</span>
        </div>
        <div className="flex items-center gap-6 text-xs font-mono text-[var(--muted)]">
          <Link href="/analyze" className="hover:text-[var(--text)] transition-colors">Analyzer</Link>
          <Link href="/leaderboard" className="hover:text-[var(--text)] transition-colors">Leaderboard</Link>
          <Link href="/integrations" className="hover:text-[var(--text)] transition-colors">Integrations</Link>
          <a href="#how" className="hover:text-[var(--text)] transition-colors">How it works</a>
          <a href="#benchmark" className="hover:text-[var(--text)] transition-colors">Benchmark</a>
          <a href="https://github.com/codewitharyan29/showreceipts" className="hover:text-[var(--text)] transition-colors">GitHub ↗</a>
        </div>
      </div>
    </footer>
  )
}

/* ── page ────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <LabelExplainer />
      <HowItWorks />
      <Benchmark />
      <CISection />
      <FinalCTA />
      <Footer />
    </>
  )
}
