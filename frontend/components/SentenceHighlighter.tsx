'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SentenceResult } from '@/lib/api'

const LABEL_CONFIG = {
  red: {
    bg: '#E85D3C18',
    border: '#E85D3C50',
    dot: '#E85D3C',
    text: '#E8967A',
    tooltip: 'Derivable from diff — adds nothing new',
  },
  orange: {
    bg: '#E8993C12',
    border: '#E8993C40',
    dot: '#E8993C',
    text: '#D4A066',
    tooltip: 'Partial overlap with diff',
  },
  green: {
    bg: '#2DB87A18',
    border: '#2DB87A50',
    dot: '#2DB87A',
    text: '#5DC49A',
    tooltip: 'Novel — genuinely adds information',
  },
  purple: {
    bg: '#7C6AF718',
    border: '#7C6AF750',
    dot: '#7C6AF7',
    text: '#A49AF8',
    tooltip: 'Epistemic act — evidence of human thought',
  },
}

const ACT_LABELS: Record<string, string> = {
  contrastive: 'contrasts alternatives',
  alternative: 'considers alternatives',
  causal:      'explains causality',
  tradeoff:    'acknowledges tradeoff',
  uncertainty: 'expresses uncertainty',
}

interface Props {
  sentences: SentenceResult[]
}

export default function SentenceHighlighter({ sentences }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const counts = {
    red:    sentences.filter(s => s.label === 'red').length,
    orange: sentences.filter(s => s.label === 'orange').length,
    green:  sentences.filter(s => s.label === 'green').length,
    purple: sentences.filter(s => s.label === 'purple').length,
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.entries(LABEL_CONFIG) as [keyof typeof LABEL_CONFIG, typeof LABEL_CONFIG['red']][]).map(([label, cfg]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
            <span style={{ color: cfg.text }}>
              {label === 'red' ? 'Derivable' : label === 'orange' ? 'Partial' : label === 'green' ? 'Novel' : 'Epistemic'}
              <span className="text-delta-muted ml-1">({counts[label]})</span>
            </span>
          </div>
        ))}
      </div>

      {/* Sentences */}
      <div className="space-y-2">
        {sentences.map((s, i) => {
          const cfg = LABEL_CONFIG[s.label]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="relative rounded-lg px-4 py-2.5 cursor-default transition-all"
              style={{
                backgroundColor: hovered === i ? `${cfg.bg}` : `${cfg.bg}`,
                border: `1px solid ${hovered === i ? cfg.border : cfg.border}`,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: cfg.dot }}
                />
                <p className="text-sm leading-relaxed text-white/80">{s.text}</p>
              </div>

              {/* Tooltip on hover */}
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute right-3 top-2 flex items-center gap-2"
                  >
                    {s.epistemic_acts.length > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: cfg.dot, backgroundColor: `${cfg.dot}20` }}
                      >
                        {ACT_LABELS[s.epistemic_acts[0]] || s.epistemic_acts[0]}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: cfg.text }}>
                      {cfg.tooltip}
                    </span>
                    <span className="text-xs text-delta-muted">
                      {Math.round(s.derivability * 100)}% match
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
