'use client'
import { useState, useMemo } from 'react'
import type { AnalyzeResponse } from '@/lib/api'

interface Props {
  result: AnalyzeResponse
}

const SIGNAL_WEIGHTS = {
  missing: 0.20,
  dris:    0.22,
  ecs:     0.20,
  engagement: 0.12,
  alignment: 0.12,
  dss:     0.10,
  density: 0.04,
}

const MISSING_WEIGHTS = { why: 0.30, tradeoff: 0.20, alternative: 0.20, risk: 0.15, evidence: 0.15 }
const MISSING_BOOST = { why: 12, tradeoff: 8, alternative: 7, risk: 5, evidence: 5 }

export default function ScoreSimulator({ result }: Props) {
  const m = result.whats_missing
  const s = result.signals

  const [addWhy,         setAddWhy]         = useState(false)
  const [addTradeoff,    setAddTradeoff]     = useState(false)
  const [addAlternative, setAddAlternative] = useState(false)
  const [addRisk,        setAddRisk]         = useState(false)
  const [addEvidence,    setAddEvidence]     = useState(false)

  const simulatedScore = useMemo(() => {
    const missing_score =
      ((m.has_why         || addWhy)         ? MISSING_WEIGHTS.why         : 0) +
      ((m.has_tradeoff    || addTradeoff)    ? MISSING_WEIGHTS.tradeoff    : 0) +
      ((m.has_alternative || addAlternative) ? MISSING_WEIGHTS.alternative : 0) +
      ((m.has_risk        || addRisk)        ? MISSING_WEIGHTS.risk        : 0) +
      ((m.has_evidence    || addEvidence)    ? MISSING_WEIGHTS.evidence    : 0)
    const delta = (
      missing_score      * SIGNAL_WEIGHTS.missing +
      s.dris             * SIGNAL_WEIGHTS.dris +
      s.ecs              * SIGNAL_WEIGHTS.ecs +
      s.engagement       * SIGNAL_WEIGHTS.engagement +
      (1-s.alignment_penalty) * SIGNAL_WEIGHTS.alignment +
      (s.diff_surprise ?? 0.5)  * SIGNAL_WEIGHTS.dss +
      (s.info_density  ?? 0.5)  * SIGNAL_WEIGHTS.density
    ) * 100
    return Math.min(100, Math.round(delta))
  }, [addWhy, addTradeoff, addAlternative, addRisk, addEvidence, m, s])

  const gain = simulatedScore - Math.round(result.delta_score)
  const color = (v: number) => v >= 76 ? '#00E87A' : v >= 51 ? '#9AE030' : v >= 26 ? '#FF9020' : '#FF4040'

  const toggles = [
    { key: 'why',         label: 'Add WHY rationale',         already: m.has_why,         set: setAddWhy,         val: addWhy,         pts: MISSING_BOOST.why },
    { key: 'tradeoff',    label: 'Add Tradeoff',              already: m.has_tradeoff,    set: setAddTradeoff,    val: addTradeoff,    pts: MISSING_BOOST.tradeoff },
    { key: 'alternative', label: 'Add Alternative considered',already: m.has_alternative, set: setAddAlternative, val: addAlternative, pts: MISSING_BOOST.alternative },
    { key: 'risk',        label: 'Add Risk / Reviewer guidance', already: m.has_risk,     set: setAddRisk,        val: addRisk,        pts: MISSING_BOOST.risk },
    { key: 'evidence',    label: 'Add Testing evidence',      already: m.has_evidence,    set: setAddEvidence,    val: addEvidence,    pts: MISSING_BOOST.evidence },
  ]

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <span className="font-mono text-xs font-bold text-[var(--sig-purple)]">⚡ SCORE SIMULATOR</span>
        <span className="ml-2 text-xs text-[var(--muted)]">What would your score be if you added these sections?</span>
      </div>
      <div className="p-4 space-y-4">
        {/* Score display */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="font-mono text-3xl font-bold" style={{ color: color(result.delta_score) }}>
              {Math.round(result.delta_score)}
            </div>
            <div className="text-xs text-[var(--muted)] font-mono">current</div>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--border)]">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${simulatedScore}%`, background: color(simulatedScore) }} />
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-3xl font-bold transition-all duration-300" style={{ color: color(simulatedScore) }}>
              {simulatedScore}
            </div>
            <div className="text-xs font-mono" style={{ color: gain > 0 ? '#00E87A' : 'var(--muted)' }}>
              {gain > 0 ? `+${gain}` : 'simulated'}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          {toggles.map(t => (
            <button key={t.key}
              onClick={() => !t.already && t.set((v: boolean) => !v)}
              disabled={t.already}
              className="w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left"
              style={{
                border: `1px solid ${t.already ? 'rgba(0,232,122,0.3)' : t.val ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`,
                background: t.already ? 'rgba(0,232,122,0.04)' : t.val ? 'rgba(167,139,250,0.06)' : 'transparent',
                cursor: t.already ? 'default' : 'pointer',
                opacity: t.already ? 0.7 : 1,
              }}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border flex items-center justify-center text-xs"
                  style={{
                    border: `1px solid ${t.already ? '#00E87A' : t.val ? '#A78BFA' : 'var(--border2)'}`,
                    background: t.already ? 'rgba(0,232,122,0.2)' : t.val ? 'rgba(167,139,250,0.2)' : 'transparent',
                    color: t.already ? '#00E87A' : '#A78BFA',
                  }}>
                  {(t.already || t.val) ? '✓' : ''}
                </div>
                <span className="text-xs" style={{ color: t.already ? 'var(--muted)' : 'var(--text)' }}>
                  {t.label}
                </span>
                {t.already && <span className="text-xs text-[var(--sig-green)]">already present</span>}
              </div>
              <span className="text-xs font-mono" style={{ color: t.already ? 'var(--muted)' : '#A78BFA' }}>
                {t.already ? '' : `+~${t.pts} pts`}
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-[var(--muted)]">
          Estimates based on signal weights. Actual improvement depends on content quality, not just presence.
        </p>
      </div>
    </div>
  )
}
