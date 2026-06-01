'use client'
import { useState } from 'react'
import Link from 'next/link'

const SPECIES = [
  {
    glyph: '◈',
    name: 'The Xerox',
    color: '#FF4040',
    signal: 'High Alignment + Low DRIS',
    desc: 'Restates the diff in prose. Every sentence is predictable from the code changes. Adds zero information a reviewer couldn\'t get by reading the diff.',
    example: '"Updated the authentication middleware. Changed the session handler. Modified the login flow."',
    fix: 'Explain WHY not WHAT. Replace every sentence that describes what changed with one that explains why it needed to change.',
    counterfactual: '"Root cause: token refresh was firing 200ms after expiry, causing 3% of mobile sessions to see 401 errors. Fixed by triggering refresh at 80% of TTL."',
  },
  {
    glyph: '◎',
    name: 'The Ghost',
    color: '#FF851B',
    signal: 'Zero ECS + No WHY + No Risk',
    desc: 'Answers nothing a reviewer needs to know. No rationale, no tradeoffs, no risks flagged. Could have been written without reading the code at all.',
    example: '"This PR makes improvements to the system. Please review and approve."',
    fix: 'Write for the reviewer, not yourself. Answer: what would I need to know to review this confidently?',
    counterfactual: '"The rate limiter was using wall clock time, allowing 2x burst at minute boundaries. Replaced with sliding window. Reviewers: check the Redis memory usage at L89."',
  },
  {
    glyph: '◇',
    name: 'Semantic Mirage',
    color: '#FFDC00',
    signal: 'High Jargon + Zero Causality',
    desc: 'Dense with technical vocabulary but no causal reasoning. Sounds sophisticated but contains no transferable knowledge. Strip the jargon — if nothing remains, nothing was explained.',
    example: '"Refactored the modular architecture to improve scalability and maintainability through optimized codebase restructuring."',
    fix: 'Replace every abstract noun with a concrete claim. "Scalability" → what specifically scales, by how much, under what conditions.',
    counterfactual: '"Replaced the N+1 query in UserService.getWithRoles() with a single JOIN. Before: 47 DB calls per request. After: 1. Measured with pg_stat_statements."',
  },
  {
    glyph: '⊙',
    name: 'The Loop',
    color: '#B10DC9',
    signal: 'Circular Sentence Structure',
    desc: 'Each sentence restates the previous one with synonyms. High inter-sentence cosine similarity. The description circles without advancing.',
    example: '"Auth handles authentication. Authentication is managed by the auth layer. The auth layer handles the authentication process."',
    fix: 'Each sentence must introduce exactly one concept the previous paragraph didn\'t contain. Delete any sentence that paraphrases an earlier one.',
    counterfactual: '"Problem: concurrent logouts caused thundering herd. Solution: token rotation with 80% TTL refresh. Tradeoff: 20% more refresh calls. Mitigation: batch refresh queue."',
  },
  {
    glyph: '◐',
    name: 'The Void',
    color: '#01FF70',
    signal: 'Missing WHY + Low DRIS',
    desc: 'Accurately describes what changed but never explains why. Useful today, useless in 6 months when someone asks "why does this code exist?"',
    example: '"Changed the database query. Updated the pagination logic. Modified the user service."',
    fix: 'Add root cause: what was wrong before, and why does this fix it? The "why" is the institutional memory that survives the code change.',
    counterfactual: '"Root cause: OFFSET pagination degrades to O(n) at page 500, adding 3.2s to p99. Switched to cursor pagination using the created_at index."',
  },
  {
    glyph: '◉',
    name: 'The Copy',
    color: '#7FDBFF',
    signal: 'Generic Openers + Low ECS',
    desc: 'Interchangeable with any other PR of the same type. "Fixed the bug. Updated tests. Various improvements." could describe 10,000 other PRs.',
    example: '"Fixed the bug. Updated tests. Minor refactoring. Please merge."',
    fix: 'Find one thing about THIS specific change that no other PR of this type would say. That\'s the sentence that earns a purple label.',
    counterfactual: '"The specific bug: JWT validation cached the public key with a 6-hour TTL, but rotation happens every 4 hours. The 2-hour overlap caused 401s for ~2% of API calls."',
  },
  {
    glyph: '◫',
    name: 'Time Bomb',
    color: '#88D498',
    signal: 'No Evidence + No Risk + Low ECS',
    desc: 'Accurate today, useless in 30 days. No decision context. When the code changes again in 6 months, nobody will know why this approach was chosen.',
    example: '"Added error handling for edge cases. Improved stability and reliability."',
    fix: 'Add the decision context. Why this approach and not the alternatives? Decisions need context to outlive code changes.',
    counterfactual: '"Added retry with exponential backoff (max 3 attempts, 100ms base). Alternative: circuit breaker — rejected because the upstream recovers in <500ms, making circuit breaker overhead unjustified."',
  },
]

export default function SpeciesPage() {
  const [selected, setSelected] = useState<number | null>(null)

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
            <Link href="/analyze" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">Analyze</Link>
            <Link href="/leaderboard" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">Leaderboard</Link>
            <Link href="/integrations" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">Integrations</Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--white)] mb-2">
            7-Species Slop Taxonomy
          </h1>
          <p className="text-[var(--muted)] text-sm">
            Every low-scoring PR is classified into one of seven slop species.
            Rule-based detection. Zero LLM calls. Click any species to see evidence, counterfactual, and fix.
          </p>
        </div>

        {/* Species grid */}
        <div className="space-y-3">
          {SPECIES.map((s, i) => (
            <div key={i}
              className="rounded-xl border overflow-hidden cursor-pointer transition-all"
              style={{
                border: `1px solid ${selected === i ? s.color + '60' : 'var(--border)'}`,
                background: selected === i ? s.color + '08' : 'var(--surface)',
              }}
              onClick={() => setSelected(selected === i ? null : i)}>

              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="font-mono text-2xl" style={{ color: s.color }}>{s.glyph}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold" style={{ color: s.color }}>
                      {s.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                      {s.signal}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{s.desc}</p>
                </div>
                <span className="text-xs text-[var(--muted)]">{selected === i ? '▲' : '▼'}</span>
              </div>

              {/* Expanded content */}
              {selected === i && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--border)] space-y-4">
                  {/* Example */}
                  <div>
                    <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest mb-2">
                      🔴 Example (slop)
                    </p>
                    <div className="rounded-lg p-3 border border-[rgba(255,64,64,0.2)]"
                      style={{ background: 'rgba(255,64,64,0.04)' }}>
                      <p className="text-xs text-[var(--text)] italic">{s.example}</p>
                    </div>
                  </div>

                  {/* Counterfactual */}
                  <div>
                    <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest mb-2">
                      🟣 Counterfactual (what quality looks like)
                    </p>
                    <div className="rounded-lg p-3 border border-[rgba(167,139,250,0.2)]"
                      style={{ background: 'rgba(167,139,250,0.04)' }}>
                      <p className="text-xs text-[var(--text)] italic">{s.counterfactual}</p>
                    </div>
                  </div>

                  {/* Fix */}
                  <div className="rounded-lg p-3 border border-[rgba(0,232,122,0.2)]"
                    style={{ background: 'rgba(0,232,122,0.04)' }}>
                    <p className="text-xs font-mono text-[var(--sig-green)] mb-1">Fix:</p>
                    <p className="text-xs text-[var(--text)]">{s.fix}</p>
                  </div>

                  <Link href="/analyze"
                    className="inline-block text-xs font-mono px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(0,232,122,0.1)', color: 'var(--sig-green)', border: '1px solid rgba(0,232,122,0.2)' }}>
                    → Analyze a PR to detect this species
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center py-4">
          <Link href="/analyze"
            className="inline-block font-mono font-bold text-sm px-6 py-3 rounded-xl"
            style={{ background: 'var(--sig-green)', color: 'var(--bg)' }}>
            Analyze a PR → Detect Species
          </Link>
        </div>
      </div>
    </div>
  )
}
