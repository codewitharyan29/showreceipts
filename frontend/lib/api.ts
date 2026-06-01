const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface SentenceResult {
  text: string
  label: 'red' | 'orange' | 'green' | 'purple'
  derivability: number
  epistemic_acts: string[]
  score_contribution: number
  counterfactual?: string
}

export interface SignalScores {
  dris: number
  ecs: number
  engagement: number
  alignment_penalty: number
  confidence: number
  diff_surprise?: number
  missing_score?: number
  info_density?: number
}

export interface Species {
  type: string
  glyph: string
  name: string
  confidence: number
  evidence?: string
  counterfactual: string
  fix: string
}

export interface WhatsMissing {
  has_why: boolean
  has_tradeoff: boolean
  has_alternative: boolean
  has_risk: boolean
  has_evidence: boolean
  has_example: boolean
  has_prerequisite: boolean
  has_step: boolean
  questions: string[]
}

export interface UncoveredChunk {
  chunk: string
  coverage: number
}

export interface AnalyzeRequest {
  pr_url?: string
  description?: string
  diff?: string
  mode?: 'pr' | 'docs'
}

export interface AnalyzeResponse {
  delta_score: number
  slop_label: string
  sentences: SentenceResult[]
  signals: SignalScores
  whats_missing: WhatsMissing
  species: Species[]
  uncovered_chunks?: UncoveredChunk[]
  pr_title?: string
  pr_url?: string
  diff_summary?: string
  false_positive_warning?: string
  processing_ms: number
}

export async function analyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'API error' }))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export async function getRepoStats(owner: string, repo: string): Promise<any> {
  const res = await fetch(`${API_BASE}/repo/${owner}/${repo}/stats`)
  if (!res.ok) throw new Error(`Repo stats error ${res.status}`)
  return res.json()
}

export interface UncoveredChunk {
  chunk: string
  coverage: number
}
