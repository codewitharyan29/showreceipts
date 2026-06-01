'use client'
import { useState } from 'react'
import type { WhatsMissing } from '@/lib/api'

interface Props {
  whats_missing: WhatsMissing
  pr_title?: string
}

export default function TemplateGenerator({ whats_missing: m, pr_title }: Props) {
  const [copied, setCopied] = useState(false)

  const sections: string[] = []

  if (!m.has_why) sections.push(`## Why This Change Was Needed

<!-- Root cause or motivation. What was broken, missing, or suboptimal? -->
Root cause: `)

  if (!m.has_tradeoff) sections.push(`## Tradeoffs

<!-- What did you sacrifice for what gain? Speed vs memory? Simplicity vs flexibility? -->
This approach improves ___ but increases ___. `)

  if (!m.has_alternative) sections.push(`## Alternatives Considered

<!-- What else did you try or consider? Why did you reject it? -->
Considered ___ but rejected because ___.`)

  if (!m.has_risk) sections.push(`## Risks & Reviewer Guidance

<!-- What could break? What should reviewers specifically check? -->
Reviewers should scrutinize ___ at line ___. Edge case: ___.`)

  if (!m.has_evidence) sections.push(`## Testing & Verification

<!-- How do you know this works? Tests added, benchmarks run, manual steps? -->
Tested by ___. Before: ___. After: ___.`)

  if (m.has_example === false && sections.length > 0) {
    sections.push(`## Example

\`\`\`
// before
// after
\`\`\``)
  }

  if (sections.length === 0) return null

  const template = sections.join('\n\n')
  const full = pr_title ? `# ${pr_title}\n\n${template}` : template

  const copy = () => {
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div>
          <span className="font-mono text-xs font-bold text-[var(--sig-green)]">✍ PR TEMPLATE</span>
          <span className="ml-2 text-xs text-[var(--muted)]">Fill in the blanks — based on what DELTA found missing</span>
        </div>
        <button onClick={copy}
          className="text-xs font-mono px-3 py-1.5 rounded-lg border transition-all"
          style={{
            border: `1px solid ${copied ? 'rgba(0,232,122,0.5)' : 'var(--border2)'}`,
            color: copied ? 'var(--sig-green)' : 'var(--muted)',
          }}>
          {copied ? 'COPIED ✓' : 'COPY TEMPLATE'}
        </button>
      </div>
      <div className="p-4">
        <pre className="text-xs text-[var(--muted)] leading-relaxed whitespace-pre-wrap font-mono"
          style={{ background: '#080808', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          {full}
        </pre>
        <p className="text-xs text-[var(--muted)] mt-2">
          {sections.length} section{sections.length > 1 ? 's' : ''} generated from missing signals.
          Copy → paste into your PR → fill in the blanks.
        </p>
      </div>
    </div>
  )
}
