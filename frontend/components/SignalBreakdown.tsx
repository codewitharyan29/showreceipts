'use client'
import { motion } from 'framer-motion'
import type { SignalScores, WhatsMissing } from '@/lib/api'

interface Props {
  signals: SignalScores
  missing: WhatsMissing
  falsePositiveWarning: string | null
}

const SIGNALS = [
  {
    key: 'dris' as const,
    label: 'Novelty vs diff',
    description: 'How much description couldn\'t be generated from the diff alone',
    invert: false,
    weight: 35,
  },
  {
    key: 'ecs' as const,
    label: 'Epistemic acts',
    description: 'Contrastive reasoning, tradeoffs, alternatives, causal chains',
    invert: false,
    weight: 30,
  },
  {
    key: 'engagement' as const,
    label: 'Causal engagement',
    description: 'Sentences explaining WHY using specific diff entities',
    invert: false,
    weight: 20,
  },
  {
    key: 'alignment_penalty' as const,
    label: 'Diff mirroring',
    description: 'Vocabulary overlap with diff (high = penalty)',
    invert: true,
    weight: 15,
  },
]

const MISSING_CHECKS = [
  { key: 'has_why' as const,          label: 'Rationale (why)' },
  { key: 'has_tradeoff' as const,     label: 'Tradeoff acknowledged' },
  { key: 'has_alternative' as const,  label: 'Alternatives considered' },
  { key: 'has_risk' as const,         label: 'Risks flagged' },
  { key: 'has_evidence' as const,     label: 'Evidence of testing' },
]

function Bar({ value, invert }: { value: number; invert: boolean }) {
  const effective = invert ? 1 - value : value
  const color = effective > 0.6 ? '#2DB87A' : effective > 0.35 ? '#E8993C' : '#E85D3C'
  return (
    <div className="h-1.5 bg-delta-border rounded-full overflow-hidden w-full">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${effective * 100}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

export default function SignalBreakdown({ signals, missing, falsePositiveWarning }: Props) {
  return (
    <div className="space-y-6">
      {/* Signal bars */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-delta-muted uppercase tracking-wider">
          Signal breakdown
        </h3>
        {SIGNALS.map(sig => {
          const raw = signals[sig.key]
          const effective = sig.invert ? 1 - raw : raw
          return (
            <div key={sig.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white/80">{sig.label}</span>
                  <span className="text-xs text-delta-muted ml-2">{sig.weight}%</span>
                </div>
                <span className="text-xs font-mono text-delta-muted">
                  {Math.round(effective * 100)}/100
                </span>
              </div>
              <Bar value={raw} invert={sig.invert} />
              <p className="text-xs text-delta-muted">{sig.description}</p>
            </div>
          )
        })}
      </div>

      {/* What's missing checklist */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-delta-muted uppercase tracking-wider">
          What's in the description
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {MISSING_CHECKS.map(check => {
            const present = missing[check.key]
            return (
              <div key={check.key} className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0 ${
                  present
                    ? 'bg-delta-green/20 text-delta-green'
                    : 'bg-delta-red/20 text-delta-red'
                }`}>
                  {present ? '✓' : '✗'}
                </div>
                <span className={`text-sm ${present ? 'text-white/70' : 'text-delta-muted'}`}>
                  {check.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Questions to answer */}
      {missing.questions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-delta-muted uppercase tracking-wider">
            Questions the author should answer
          </h3>
          <div className="space-y-2">
            {missing.questions.map((q, i) => (
              <div
                key={i}
                className="text-sm text-white/60 pl-3 border-l border-delta-border py-0.5"
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* False positive warning */}
      {falsePositiveWarning && (
        <div className="text-xs text-delta-orange bg-delta-orange/10 border border-delta-orange/30 rounded-lg p-3">
          {falsePositiveWarning}
        </div>
      )}
    </div>
  )
}
