'use client'
import { useState } from 'react'
import Link from 'next/link'

const SIGNAL_WEIGHTS = {
  why:         { label: 'Add WHY (root cause)',        points: 12, color: '#00E87A' },
  tradeoff:    { label: 'Add Tradeoff',                points: 8,  color: '#A78BFA' },
  alternative: { label: 'Add Alternative Considered',  points: 7,  color: '#38BDF8' },
  risk:        { label: 'Add Risk Assessment',         points: 6,  color: '#FF9020' },
  evidence:    { label: 'Add Testing Evidence',        points: 5,  color: '#FF4040' },
  specificity: { label: 'Add Specific Entities/Numbers', points: 9, color: '#FFDC00' },
  causal:      { label: 'Add Causal Reasoning',        points: 8,  color: '#01FF70' },
}

export default function SimulatorPage() {
  const [base, setBase] = useState(23)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})

  const bonus = Object.entries(enabled)
    .filter(([, v]) => v)
    .reduce((sum, [k]) => sum + SIGNAL_WEIGHTS[k as keyof typeof SIGNAL_WEIGHTS].points, 0)
  const predicted = Math.min(100, base + bonus)

  const scoreColor = (s: number) =>
    s >= 76 ? '#00E87A' : s >= 51 ? '#9AE030' : s >= 26 ? '#FF9020' : '#FF4040'

  const label = (s: number) =>
    s >= 76 ? 'Quality' : s >= 51 ? 'Low Slop' : s >= 26 ? 'Medium Slop' : 'High Slop'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <div className="sticky top-0 z-50 border-b border-[var(--border)]"
        style={{ background: 'rgba(7,8,10,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-[var(--sig-green)] text-xl font-bold">Δ</span>
            <span className="font-display font-bold text-[var(--white)]">ShowReceipts</span>
          </Link>
          <Link href="/analyze" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Analyzer</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--white)] mb-2">Score Simulator</h1>
          <p className="text-[var(--muted)] text-sm">See exactly how each improvement lifts your DELTA score.</p>
        </div>

        {/* Base score input */}
        <div className="rounded-2xl border border-[var(--border)] p-6" style={{ background: 'var(--surface)' }}>
          <label className="font-mono text-xs text-[var(--muted)] uppercase tracking-widest block mb-3">
            Your current DELTA score
          </label>
          <div className="flex items-center gap-4">
            <input type="range" min={0} max={80} value={base}
              onChange={e => setBase(Number(e.target.value))}
              className="flex-1 accent-[#00E87A]" />
            <span className="font-mono text-2xl font-bold w-12 text-right"
              style={{ color: scoreColor(base) }}>{base}</span>
          </div>
          <p className="font-mono text-xs mt-1" style={{ color: scoreColor(base) }}>{label(base)}</p>
        </div>

        {/* Signal toggles */}
        <div className="rounded-2xl border border-[var(--border)] p-6 space-y-3" style={{ background: 'var(--surface)' }}>
          <h2 className="font-mono text-xs text-[var(--muted)] uppercase tracking-widest mb-4">
            Toggle improvements
          </h2>
          {Object.entries(SIGNAL_WEIGHTS).map(([key, sig]) => (
            <div key={key}
              className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
              style={{
                borderColor: enabled[key] ? sig.color + '50' : 'var(--border)',
                background: enabled[key] ? sig.color + '08' : 'transparent',
              }}
              onClick={() => setEnabled(e => ({ ...e, [key]: !e[key] }))}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: enabled[key] ? sig.color : 'var(--border2)',
                           background: enabled[key] ? sig.color : 'transparent' }}>
                  {enabled[key] && <span className="text-[10px] text-black font-bold">✓</span>}
                </div>
                <span className="text-sm text-[var(--text)]">{sig.label}</span>
              </div>
              <span className="font-mono text-sm font-bold" style={{ color: sig.color }}>
                +{sig.points}
              </span>
            </div>
          ))}
        </div>

        {/* Result */}
        <div className="rounded-2xl border p-8 text-center space-y-4"
          style={{ borderColor: scoreColor(predicted) + '40', background: scoreColor(predicted) + '06' }}>
          <p className="font-mono text-xs text-[var(--muted)] uppercase tracking-widest">Predicted score</p>
          <div className="font-mono text-7xl font-bold" style={{ color: scoreColor(predicted) }}>
            {predicted}
          </div>
          <div className="font-mono text-lg" style={{ color: scoreColor(predicted) }}>{label(predicted)}</div>
          {bonus > 0 && (
            <p className="text-sm text-[var(--muted)]">
              +{bonus} points from {Object.values(enabled).filter(Boolean).length} improvement{Object.values(enabled).filter(Boolean).length !== 1 ? 's' : ''}
            </p>
          )}

          {/* Progress bar */}
          <div className="h-3 rounded-full bg-[var(--border)] overflow-hidden mt-4">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${predicted}%`, background: scoreColor(predicted),
                       boxShadow: `0 0 12px ${scoreColor(predicted)}60` }} />
          </div>
          <div className="flex justify-between font-mono text-xs text-[var(--muted)]">
            <span>0 — High Slop</span>
            <span>50 — Low Slop</span>
            <span>76+ — Quality</span>
          </div>
        </div>

        <div className="text-center">
          <Link href="/analyze"
            className="inline-block font-mono text-sm px-6 py-3 rounded-xl text-[var(--bg)] font-bold"
            style={{ background: 'var(--sig-green)' }}>
            Analyze your PR →
          </Link>
        </div>
      </div>
    </div>
  )
}
