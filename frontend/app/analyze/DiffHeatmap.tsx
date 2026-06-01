'use client'
import type { UncoveredChunk } from '@/lib/api'

interface Props {
  uncovered_chunks: UncoveredChunk[]
  diff_summary?: string
  dss_score: number
}

export default function DiffHeatmap({ uncovered_chunks, diff_summary, dss_score }: Props) {
  const covered_pct = Math.round(dss_score * 100)
  const uncovered_pct = 100 - covered_pct

  if (!diff_summary && uncovered_chunks.length === 0) return null

  const dssColor = dss_score >= 0.65 ? '#00E87A' : dss_score >= 0.40 ? '#FF9020' : '#FF4040'

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <span className="font-mono text-xs font-bold" style={{ color: dssColor }}>◈ DIFF HEATMAP</span>
        <span className="ml-2 text-xs text-[var(--muted)]">How well does your description cover what changed?</span>
      </div>
      <div className="p-4 space-y-4">
        {/* DSS bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[var(--muted)]">Diff Coverage Score (DSS)</span>
            <span style={{ color: dssColor }}>{covered_pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-[var(--border)] overflow-hidden flex">
            <div className="h-full rounded-l-full transition-all duration-700"
              style={{ width: `${covered_pct}%`, background: dssColor, boxShadow: `0 0 8px ${dssColor}60` }} />
            <div className="h-full flex-1 rounded-r-full" style={{ background: '#1a1a1a' }} />
          </div>
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span style={{ color: dssColor }}>■ Explained by description</span>
            <span style={{ color: '#FF4040' }}>■ Not mentioned</span>
          </div>
        </div>

        {/* Uncovered chunks */}
        {uncovered_chunks.length > 0 && (
          <div className="space-y-2">
            <div className="font-mono text-xs text-[var(--muted)] uppercase tracking-widest">
              Diff areas your description never explains:
            </div>
            {uncovered_chunks.map((chunk, i) => (
              <div key={i} className="rounded-lg p-3 border border-[rgba(255,64,64,0.2)]"
                style={{ background: 'rgba(255,64,64,0.04)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1.5 rounded-full flex-1 bg-[var(--border)]">
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.round(chunk.coverage * 100)}%`, background: '#FF4040' }} />
                  </div>
                  <span className="font-mono text-xs text-[var(--sig-red)]">{Math.round(chunk.coverage * 100)}%</span>
                </div>
                <p className="text-xs text-[var(--muted)] font-mono truncate">{chunk.chunk}</p>
              </div>
            ))}
          </div>
        )}

        {uncovered_chunks.length === 0 && dss_score >= 0.6 && (
          <div className="text-center py-3 text-xs text-[var(--sig-green)]">
            ✓ Description covers the diff well. DSS is high.
          </div>
        )}

        <p className="text-xs text-[var(--muted)]">
          DSS measures whether the diff contains things your description never mentions.
          Low DSS = code changed but description never explains what or why.
        </p>
      </div>
    </div>
  )
}
