'use client'
import { useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const SCORE_COLOR = (s: number) =>
  s >= 76 ? '#00E87A' : s >= 51 ? '#9AE030' : s >= 26 ? '#FF9020' : '#FF4040'

const SCORE_LABEL = (s: number) =>
  s >= 76 ? 'Quality' : s >= 51 ? 'Low Slop' : s >= 26 ? 'Medium Slop' : 'High Slop'

const SUGGESTED = [
  'microsoft/vscode',
  'django/django',
  'rust-lang/rust',
  'golang/go',
  'kubernetes/kubernetes',
  'prometheus/prometheus',
  'docker/compose',
  'pallets/flask',
  'facebook/react',
  'vercel/next.js',
]

interface RepoResult {
  repo: string
  median_score: number
  prs_analyzed: number
  distribution: {
    quality_pct: number
    low_slop_pct: number
    medium_slop_pct: number
    high_slop_pct: number
  }
  worst_prs: { title: string; url: string; delta_score: number }[]
  best_prs:  { title: string; url: string; delta_score: number }[]
  error?: string
}

function ScoreBar({ score }: { score: number }) {
  const color = SCORE_COLOR(score)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden" style={{ width: 100 }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color, boxShadow: `0 0 6px ${color}50` }} />
      </div>
      <span className="font-mono text-sm font-bold" style={{ color }}>{score}</span>
      <span className="text-xs" style={{ color }}>{SCORE_LABEL(score)}</span>
    </div>
  )
}

function RepoCard({ result, rank }: { result: RepoResult; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const color = SCORE_COLOR(result.median_score)

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden transition-all"
      style={{ background: 'var(--surface)' }}>
      <div className="px-4 py-3 flex items-center gap-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}>
        <span className="font-mono text-sm text-[var(--muted)] w-6">{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm text-[var(--white)]">{result.repo}</div>
          <div className="text-xs text-[var(--muted)] mt-0.5">
            {result.prs_analyzed} PRs · {result.distribution.quality_pct}% quality · {result.distribution.high_slop_pct}% high slop
          </div>
        </div>
        <ScoreBar score={result.median_score} />
        <span className="text-xs text-[var(--muted)]">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--border)] space-y-3">
          {/* Distribution bar */}
          <div className="space-y-1">
            <div className="text-xs text-[var(--muted)] font-mono">Score distribution</div>
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
              <div style={{ width: `${result.distribution.quality_pct}%`, background: '#00E87A' }} />
              <div style={{ width: `${result.distribution.low_slop_pct}%`, background: '#9AE030' }} />
              <div style={{ width: `${result.distribution.medium_slop_pct}%`, background: '#FF9020' }} />
              <div style={{ width: `${result.distribution.high_slop_pct}%`, background: '#FF4040' }} />
            </div>
            <div className="flex gap-3 text-xs text-[var(--muted)]">
              <span style={{ color: '#00E87A' }}>■ {result.distribution.quality_pct}% Quality</span>
              <span style={{ color: '#FF9020' }}>■ {result.distribution.medium_slop_pct}% Medium</span>
              <span style={{ color: '#FF4040' }}>■ {result.distribution.high_slop_pct}% High Slop</span>
            </div>
          </div>

          {/* Best PR */}
          {result.best_prs?.[0] && (
            <div>
              <div className="text-xs text-[var(--muted)] font-mono mb-1">Best PR</div>
              <a href={result.best_prs[0].url} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ color: '#00E87A' }}>
                {result.best_prs[0].title.slice(0, 70)} — {result.best_prs[0].delta_score}/100
              </a>
            </div>
          )}

          {/* Worst PR */}
          {result.worst_prs?.[0] && (
            <div>
              <div className="text-xs text-[var(--muted)] font-mono mb-1">Lowest scoring PR</div>
              <a href={result.worst_prs[0].url} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ color: '#FF4040' }}>
                {result.worst_prs[0].title.slice(0, 70)} — {result.worst_prs[0].delta_score}/100
              </a>
            </div>
          )}

          <a href={`/analyze?pr=${encodeURIComponent(`https://github.com/${result.repo}/pull/1`)}`}
            className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            → Analyze individual PRs from this repo
          </a>
        </div>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const [input, setInput]     = useState('')
  const [results, setResults] = useState<RepoResult[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState('')

  async function scanRepo(repoInput: string) {
    const raw = repoInput.replace('https://github.com/', '').replace(/\/$/, '').trim()
    const parts = raw.split('/')
    if (parts.length < 2) { setError('Format: owner/repo'); return }
    const repo = `${parts[0]}/${parts[1]}`

    if (results.find(r => r.repo === repo)) {
      setError(`${repo} already scanned`); return
    }

    setLoading(repo); setError('')
    try {
      const res = await fetch(`${API}/repo/${parts[0]}/${parts[1]}/stats`)
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(prev => [...prev, { ...data, repo }].sort((a, b) => b.median_score - a.median_score))
    } catch (e: any) {
      setError(`${repo}: ${e.message}`)
    } finally {
      setLoading(null)
    }
  }

  const handleScan = () => { if (input.trim()) { scanRepo(input); setInput('') } }

  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + r.median_score, 0) / results.length)
    : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <div className="sticky top-0 z-50 border-b border-[var(--border)]"
        style={{ background: 'rgba(7,8,10,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-[var(--sig-green)] text-xl font-bold">Δ</span>
            <span className="font-display font-bold text-[var(--white)] tracking-tight">
              Show<span className="text-[var(--sig-purple)]">Receipts</span>
            </span>
          </Link>
          <Link href="/analyze"
            className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            Analyze PR →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--white)] mb-2">Repo Leaderboard</h1>
          <p className="text-[var(--muted)] text-sm">
            Scan any public GitHub repo. Compare PR quality across teams and projects.
            All scores are live — computed in real time from recent merged PRs.
          </p>
        </div>

        {/* Input */}
        <div className="rounded-xl border border-[var(--border)] p-5 space-y-3"
          style={{ background: 'var(--surface)' }}>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="owner/repo or https://github.com/owner/repo"
              className="flex-1 rounded-xl border border-[var(--border2)] px-4 py-2.5 text-sm font-mono text-[var(--white)] placeholder-[var(--muted)] outline-none focus:border-[var(--sig-green)] transition-colors"
              style={{ background: 'var(--bg)' }} />
            <button onClick={handleScan}
              disabled={loading !== null || !input.trim()}
              className="px-5 py-2.5 rounded-xl font-mono text-sm font-bold disabled:opacity-40 transition-all"
              style={{ background: 'var(--sig-green)', color: 'var(--bg)' }}>
              {loading ? '...' : 'Scan'}
            </button>
          </div>

          {error && <p className="text-xs text-[var(--sig-red)]">{error}</p>}

          {/* Suggested repos */}
          <div>
            <p className="text-xs text-[var(--muted)] mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.filter(r => !results.find(x => x.repo === r)).map(r => (
                <button key={r} onClick={() => scanRepo(r)}
                  disabled={loading !== null}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg border border-[var(--border2)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--sig-green)] transition-all disabled:opacity-40">
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)]"
            style={{ background: 'var(--surface)' }}>
            <div className="w-4 h-4 border-2 border-[var(--sig-green)] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[var(--muted)] font-mono">Scanning {loading}...</span>
          </div>
        )}

        {/* Summary bar */}
        {results.length > 1 && avgScore !== null && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: avgScore,                             l: 'Average scanned',   c: SCORE_COLOR(avgScore) },
              { v: Math.max(...results.map(r=>r.median_score)), l: 'Highest repo', c: '#00E87A' },
              { v: Math.min(...results.map(r=>r.median_score)), l: 'Lowest repo',  c: '#FF4040' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] p-3 text-center"
                style={{ background: 'var(--surface)' }}>
                <div className="font-mono text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
                <div className="text-xs text-[var(--muted)] mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="font-mono text-xs text-[var(--muted)] uppercase tracking-widest">
                {results.length} repo{results.length > 1 ? 's' : ''} scanned — sorted by median score
              </div>
              <button onClick={() => setResults([])}
                className="text-xs font-mono text-[var(--muted)] hover:text-[var(--sig-red)] transition-colors">
                ✕ Reset
              </button>
            </div>
            {results.map((r, i) => (
              <RepoCard key={r.repo} result={r} rank={i + 1} />
            ))}
          </div>
        )}

        {results.length === 0 && !loading && (
          <div className="text-center py-12 space-y-3">
            <div className="text-4xl">Δ</div>
            <p className="text-[var(--muted)] text-sm">
              Scan your first repo above, or click a quick-add button.
            </p>
            <p className="text-xs text-[var(--muted)]">
              Requires GitHub token in backend for best results (5000 req/hr vs 60).
            </p>
          </div>
        )}

        <p className="text-xs text-[var(--muted)] text-center pb-4">
          Scores use DELTA fast mode — ECS + WhatsMissing + Alignment.
          Full model (DRIS + DSS) available via API after backend deployment.
          All scores are live from real recent PRs.
        </p>
      </div>
    </div>
  )
}
