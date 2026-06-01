'use client'
import { useState } from 'react'
import type { AnalyzeResponse } from '@/lib/api'

interface Props {
  result: AnalyzeResponse
  originalDescription: string
}

async function generateRewrite(description: string, signals: AnalyzeResponse): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_KEY || ''
  if (!apiKey) throw new Error('Set NEXT_PUBLIC_GROQ_KEY to enable rewrite suggestions.')

  const missing = signals.whats_missing
  const missingList = [
    !missing.has_why         && '- Root cause / WHY this was needed',
    !missing.has_tradeoff    && '- Tradeoffs acknowledged',
    !missing.has_alternative && '- Alternatives considered',
    !missing.has_risk        && '- Risks and reviewer guidance',
    !missing.has_evidence    && '- Testing / verification evidence',
  ].filter(Boolean).join('\n')

  const species = signals.species.map(s => `${s.glyph} ${s.name}`).join(', ')

  const prompt = `You are a senior engineer helping improve a PR description.

CURRENT DESCRIPTION (DELTA score: ${signals.delta_score}/100 — ${signals.slop_label}):
${description}

DETECTED PROBLEMS:
${species ? `Species: ${species}` : ''}
Missing sections:
${missingList || 'None — description is fairly complete'}

TASK: Rewrite this PR description to score higher. Keep the same technical content but:
1. Add a "Root cause" or "Why" section explaining motivation
2. Acknowledge any tradeoffs made
3. Mention alternatives considered if relevant
4. Add reviewer guidance (what to check, edge cases)
5. Include testing evidence

Write ONLY the improved description. No preamble. No explanation. Just the better PR description.
Keep it concise — 150-250 words max.`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Groq API ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? 'Could not generate rewrite.'
}

export default function RewriteCoach({ result, originalDescription }: Props) {
  const [rewrite, setRewrite]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const [view, setView]         = useState<'before' | 'after'>('before')

  if (result.delta_score >= 70) return null // Already good

  const generate = async () => {
    setLoading(true); setError(null)
    try {
      const text = await generateRewrite(originalDescription, result)
      setRewrite(text)
      setView('after')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const copy = () => {
    if (!rewrite) return
    navigator.clipboard.writeText(rewrite).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ border: '1px solid rgba(0,232,122,0.25)', background: 'var(--surface)' }}>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold text-[var(--sig-green)]">🔄 REWRITE COACH</span>
          <span className="ml-2 text-xs text-[var(--muted)]">AI-suggested improved description</span>
        </div>
        {rewrite && (
          <div className="flex gap-1">
            {(['before', 'after'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-2.5 py-1 text-xs font-mono rounded transition-colors"
                style={{
                  background: view === v ? 'rgba(0,232,122,0.15)' : 'transparent',
                  color: view === v ? 'var(--sig-green)' : 'var(--muted)',
                  border: `1px solid ${view === v ? 'rgba(0,232,122,0.3)' : 'transparent'}`,
                }}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {!rewrite && !loading && (
          <>
            <p className="text-xs text-[var(--muted)]">
              DELTA detected your score is {Math.round(result.delta_score)}/100.
              Generate an improved version based on the missing signals.
            </p>
            <button onClick={generate}
              className="w-full py-2.5 rounded-xl font-mono text-sm font-bold transition-all"
              style={{ background: 'rgba(0,232,122,0.15)', color: 'var(--sig-green)', border: '1px solid rgba(0,232,122,0.3)' }}>
              Generate Improved Description →
            </button>
            <p className="text-xs text-[var(--muted)] text-center">Uses Groq API (free tier)</p>
          </>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-4 justify-center">
            <div className="w-4 h-4 border-2 border-[var(--sig-green)] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[var(--muted)]">Rewriting...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-[var(--sig-red)] bg-[rgba(255,64,64,0.06)] border border-[rgba(255,64,64,0.2)] rounded-lg p-3">
            {error}
          </div>
        )}

        {rewrite && (
          <>
            <div className="rounded-lg border border-[var(--border)] p-4" style={{ background: '#080808' }}>
              {view === 'before' ? (
                <pre className="text-xs text-[var(--muted)] whitespace-pre-wrap leading-relaxed">
                  {originalDescription}
                </pre>
              ) : (
                <pre className="text-xs text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                  {rewrite}
                </pre>
              )}
            </div>
            {view === 'after' && (
              <div className="flex gap-2">
                <button onClick={copy}
                  className="flex-1 py-2 rounded-lg font-mono text-xs border transition-all"
                  style={{
                    border: `1px solid ${copied ? 'rgba(0,232,122,0.4)' : 'var(--border2)'}`,
                    color: copied ? 'var(--sig-green)' : 'var(--muted)',
                  }}>
                  {copied ? 'COPIED ✓' : 'COPY REWRITE'}
                </button>
                <button onClick={generate}
                  className="px-4 py-2 rounded-lg font-mono text-xs border border-[var(--border2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                  Regenerate
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
