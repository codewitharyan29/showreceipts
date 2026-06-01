'use client'
import { useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const DEMO_DOCS = [
  {
    label: 'Bad Docs ↓',
    text: `# Authentication API

This guide covers authentication.

## Usage

Call the login endpoint to authenticate.

## Configuration

Update the configuration file.

## Notes

See the code for more details.`
  },
  {
    label: 'Good Docs ↑',
    text: `# Authentication API

## Why this exists

The auth service handles JWT token lifecycle. Tokens expire after 4 hours. The refresh mechanism fires at 80% of TTL to avoid the thundering herd pattern seen in v1 (where 3% of mobile sessions saw 401 errors).

## Prerequisites

- Node.js 18+
- Redis 6+ (for token blacklisting)
- Environment variable: AUTH_SECRET (min 32 chars)

## Quick start

\`\`\`bash
npm install @company/auth-client
export AUTH_SECRET=your-secret-here
\`\`\`

## When to use refresh tokens vs session tokens

Use refresh tokens when: sessions > 1 hour, mobile clients, offline support needed.
Use session tokens when: short-lived web sessions, no offline requirement.

Tradeoff: refresh tokens require Redis storage (O(tokens) memory). Session tokens are stateless but cannot be revoked before expiry.

## Common mistakes

- Setting token TTL < 5 minutes causes excessive refresh calls
- Not handling 401 responses with automatic retry causes poor UX`
  }
]

export default function DocsPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function analyze() {
    if (!input.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: input, mode: 'docs' }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (s: number) =>
    s >= 76 ? '#00E87A' : s >= 51 ? '#9AE030' : s >= 26 ? '#FF9020' : '#FF4040'

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
          <div className="flex items-center gap-4">
            <Link href="/analyze" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">PR Analyze</Link>
            <Link href="/species" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">Species</Link>
            <Link href="/leaderboard" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">Leaderboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-xs px-3 py-1 rounded-full mb-4"
            style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
            Track B — Documentation Mode
          </div>
          <h1 className="font-display text-3xl font-bold text-[var(--white)] mb-2">
            Docs Quality Analyzer
          </h1>
          <p className="text-[var(--muted)] text-sm">
            Same DELTA engine. Docs mode adds: example detection, prerequisite check, step-by-step verification.
            Paste any documentation, README, or knowledge base article.
          </p>
        </div>

        {/* What docs mode checks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '❓', label: 'WHY section', desc: 'Does it explain why this exists?' },
            { icon: '📝', label: 'Examples', desc: 'Concrete code or values?' },
            { icon: '⚠️', label: 'Gotchas', desc: 'Common mistakes flagged?' },
            { icon: '📋', label: 'Prerequisites', desc: 'What reader needs to know?' },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] p-3 text-center"
              style={{ background: 'var(--surface)' }}>
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs font-mono font-bold text-[var(--white)]">{item.label}</div>
              <div className="text-xs text-[var(--muted)] mt-1">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Demo buttons */}
        <div className="flex gap-2">
          {DEMO_DOCS.map((d, i) => (
            <button key={i} onClick={() => setInput(d.text)}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors"
              style={{ border: '1px solid var(--border2)', color: 'var(--muted)', background: 'transparent' }}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden"
          style={{ background: 'var(--surface)' }}>
          <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--muted)]">Paste documentation / README / KB article</span>
            <span className="font-mono text-xs text-[var(--muted)]">{input.length} chars</span>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder="Paste your documentation here..."
            rows={10}
            className="w-full p-4 text-sm font-mono text-[var(--text)] placeholder-[var(--muted)] outline-none resize-none"
            style={{ background: 'transparent' }} />
        </div>

        <button onClick={analyze} disabled={loading || !input.trim()}
          className="w-full py-3 rounded-xl font-mono text-sm font-bold disabled:opacity-40 transition-all"
          style={{ background: 'var(--sig-green)', color: 'var(--bg)' }}>
          {loading ? 'Analyzing...' : 'Analyze Documentation →'}
        </button>

        {error && (
          <div className="text-sm text-[var(--sig-red)] p-3 rounded-lg border border-[rgba(255,64,64,0.2)]"
            style={{ background: 'rgba(255,64,64,0.06)' }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Score */}
            <div className="rounded-xl border border-[var(--border)] p-5 flex items-center gap-6"
              style={{ background: 'var(--surface)' }}>
              <div className="text-center">
                <div className="font-mono text-5xl font-bold" style={{ color: scoreColor(result.delta_score) }}>
                  {Math.round(result.delta_score)}
                </div>
                <div className="text-xs font-mono text-[var(--muted)]">DELTA / 100</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold" style={{ color: scoreColor(result.delta_score) }}>
                  {result.slop_label}
                </div>
                <div className="text-xs text-[var(--muted)] mt-1">Track B — Documentation Mode</div>
              </div>
            </div>

            {/* WhatsMissing for docs */}
            {result.whats_missing && (
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3"
                style={{ background: 'var(--surface)' }}>
                <p className="font-mono text-xs text-[var(--muted)] uppercase tracking-widest">
                  Documentation Checklist
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'has_why',          label: 'WHY section' },
                    { key: 'has_tradeoff',     label: 'Tradeoffs/Limits' },
                    { key: 'has_alternative',  label: 'When NOT to use' },
                    { key: 'has_risk',         label: 'Gotchas/Warnings' },
                    { key: 'has_evidence',     label: 'Working Example' },
                    { key: 'has_example',      label: 'Code Example' },
                    { key: 'has_prerequisite', label: 'Prerequisites' },
                    { key: 'has_step',         label: 'Step-by-step' },
                  ].map(item => {
                    const val = result.whats_missing[item.key]
                    return (
                      <div key={item.key} className="flex items-center gap-2 text-xs">
                        <span style={{ color: val ? '#00E87A' : '#FF4040' }}>
                          {val ? '✓' : '✗'}
                        </span>
                        <span style={{ color: val ? 'var(--text)' : 'var(--muted)' }}>
                          {item.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {result.whats_missing.questions?.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                    <p className="text-xs font-mono text-[var(--muted)]">Missing sections:</p>
                    {result.whats_missing.questions.map((q: string, i: number) => (
                      <p key={i} className="text-xs text-[var(--sig-orange)]">→ {q}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sentences */}
            {result.sentences?.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden"
                style={{ background: 'var(--surface)' }}>
                <div className="px-4 py-2 border-b border-[var(--border)]">
                  <span className="font-mono text-xs text-[var(--muted)]">Sentence Analysis</span>
                </div>
                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                  {result.sentences.map((s: any, i: number) => {
                    const colors: any = {
                      red:    { bg: 'rgba(255,64,64,0.07)',   border: 'rgba(255,64,64,0.25)',   dot: '#FF4040' },
                      orange: { bg: 'rgba(255,144,32,0.07)',  border: 'rgba(255,144,32,0.25)',  dot: '#FF9020' },
                      green:  { bg: 'rgba(0,232,122,0.07)',   border: 'rgba(0,232,122,0.25)',   dot: '#00E87A' },
                      purple: { bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.25)', dot: '#A78BFA' },
                    }
                    const c = colors[s.label] || colors.orange
                    return (
                      <div key={i} className="rounded-lg px-3 py-2 flex items-start gap-2"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.dot }} />
                        <p className="text-xs text-[var(--text)] leading-relaxed">{s.text}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-[var(--muted)] text-center">
          Track B coverage: Documentation, READMEs, Knowledge Base articles, API guides.
          Same 6-signal DELTA engine. Zero LLM calls.
        </p>
      </div>
    </div>
  )
}
