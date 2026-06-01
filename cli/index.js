#!/usr/bin/env node
/**
 * ShowReceipts DELTA CLI
 * npx showreceipts check <github-pr-url>
 * npx showreceipts check --paste   (interactive mode)
 */
const https = require('https')
const http = require('http')
const readline = require('readline')

const API_URL = process.env.DELTA_API_URL || 'https://showreceipts.onrender.com'

const COLORS = {
  red:    '\x1b[31m', orange: '\x1b[33m', green: '\x1b[32m',
  purple: '\x1b[35m', reset: '\x1b[0m',  bold: '\x1b[1m',
  dim:    '\x1b[2m',  cyan:  '\x1b[36m',
}

const LABEL_COLORS = {
  'Quality':     '\x1b[32m',
  'Low Slop':    '\x1b[33m',
  'Medium Slop': '\x1b[33m',
  'High Slop':   '\x1b[31m',
}

function bar(score, width = 30) {
  const filled = Math.round((score / 100) * width)
  const empty = width - filled
  const color = score >= 76 ? COLORS.green : score >= 51 ? COLORS.orange : COLORS.red
  return color + '█'.repeat(filled) + COLORS.dim + '░'.repeat(empty) + COLORS.reset
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL)
    const isHttps = url.protocol === 'https:'
    const lib = isHttps ? https : http
    const data = JSON.stringify(body)
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }
    const req = lib.request(opts, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) }
        catch (e) { reject(new Error(`Invalid JSON from API: ${raw.slice(0, 200)}`)) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function printResult(data) {
  const c = COLORS
  const labelColor = LABEL_COLORS[data.slop_label] || c.red

  console.log()
  console.log(c.bold + '  Δ DELTA — ShowReceipts' + c.reset)
  console.log(c.dim + '  ─────────────────────────────────────────' + c.reset)

  if (data.pr_title) {
    console.log(c.dim + '  PR: ' + c.reset + data.pr_title)
    if (data.diff_summary) console.log(c.dim + '      ' + data.diff_summary + c.reset)
    console.log()
  }

  // Score bar
  console.log('  ' + bar(data.delta_score) + '  ' + c.bold + labelColor + data.delta_score + '/100' + c.reset + '  ' + labelColor + data.slop_label + c.reset)
  console.log()

  // Signals
  const s = data.signals
  console.log(c.dim + '  Signals:' + c.reset)
  console.log('  ' + c.green + `DRIS       ${(s.dris * 100).toFixed(0).padStart(3)}/100` + c.reset + '  novelty vs diff')
  console.log('  ' + c.purple + `ECS        ${(s.ecs * 100).toFixed(0).padStart(3)}/100` + c.reset + '  epistemic acts')
  console.log('  ' + '\x1b[36m' + `Engagement ${(s.engagement * 100).toFixed(0).padStart(3)}/100` + c.reset + '  causal reasoning')
  console.log('  ' + c.orange + `Alignment  ${((1 - s.alignment_penalty) * 100).toFixed(0).padStart(3)}/100` + c.reset + '  diff mirroring (inverted)')
  console.log(c.dim + `  Confidence: ${(s.confidence * 100).toFixed(0)}%  |  LLM calls: 0  |  ${data.processing_ms}ms` + c.reset)
  console.log()

  // Species
  if (data.species && data.species.length > 0) {
    console.log(c.dim + '  Detected species:' + c.reset)
    for (const sp of data.species) {
      console.log(`  ${sp.glyph} ${c.bold}${sp.name}${c.reset} ${c.dim}(${(sp.confidence * 100).toFixed(0)}% confidence)${c.reset}`)
      if (sp.evidence) console.log(`    ${c.dim}evidence: "${sp.evidence.slice(0, 70)}..."${c.reset}`)
      console.log(`    ${c.cyan}fix: ${sp.fix}${c.reset}`)
    }
    console.log()
  }

  // Sentence highlights
  const sentences = data.sentences || []
  const red = sentences.filter(s => s.label === 'red')
  const purple = sentences.filter(s => s.label === 'purple')

  if (red.length > 0) {
    console.log(c.red + '  🔴 Derivable sentences (restate diff):' + c.reset)
    red.slice(0, 3).forEach(s => {
      console.log(`  ${c.dim}  "${s.text.slice(0, 90)}"${c.reset}`)
      if (s.counterfactual) console.log(`  ${c.cyan}  → ${s.counterfactual}${c.reset}`)
    })
    console.log()
  }

  if (purple.length > 0) {
    console.log(c.purple + '  🟣 Epistemic sentences (human thought):' + c.reset)
    purple.slice(0, 2).forEach(s => {
      console.log(`  ${c.dim}  "${s.text.slice(0, 90)}"${c.reset}`)
      if (s.epistemic_acts.length) console.log(`  ${c.purple}  → ${s.epistemic_acts[0]}${c.reset}`)
    })
    console.log()
  }

  // What's missing
  const m = data.whats_missing
  const checks = [
    ['Rationale (WHY)',        m.has_why],
    ['Tradeoff acknowledged',  m.has_tradeoff],
    ['Alternatives considered',m.has_alternative],
    ['Risks flagged',          m.has_risk],
    ['Testing evidence',       m.has_evidence],
  ]
  const missing = checks.filter(([, v]) => !v)
  if (missing.length > 0) {
    console.log(c.dim + '  What\'s missing:' + c.reset)
    missing.forEach(([label]) => console.log(`  ${c.red}✗${c.reset} ${label}`))
    console.log()
  }

  if (m.questions && m.questions.length > 0) {
    console.log(c.dim + '  Questions a reviewer will ask:' + c.reset)
    m.questions.forEach(q => console.log(`  ${c.dim}→ ${q}${c.reset}`))
    console.log()
  }

  if (data.false_positive_warning) {
    console.log(c.orange + '  ⚠ ' + data.false_positive_warning + c.reset)
    console.log()
  }

  console.log(c.dim + '  ─────────────────────────────────────────' + c.reset)
  console.log(c.dim + '  DELTA v2.0 · Zero LLM calls in detection path · delicate-bonbon-50a0d5.netlify.app' + c.reset)
  console.log()
}

async function checkPR(prUrl) {
  console.log('\x1b[2m  Analyzing PR...\x1b[0m')
  try {
    const data = await post('/analyze', { pr_url: prUrl })
    if (data.detail) throw new Error(data.detail)
    printResult(data)
  } catch (e) {
    console.error('\x1b[31mError:\x1b[0m', e.message)
    process.exit(1)
  }
}

async function checkPaste() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log('\x1b[2mPaste your PR description (or diff) and press Ctrl+D when done:\x1b[0m\n')
  let lines = []
  rl.on('line', l => lines.push(l))
  rl.on('close', async () => {
    const description = lines.join('\n').trim()
    if (!description) { console.error('No input provided.'); process.exit(1) }
    console.log('\x1b[2m  Analyzing...\x1b[0m')
    try {
      const data = await post('/analyze', { description })
      if (data.detail) throw new Error(data.detail)
      printResult(data)
    } catch (e) {
      console.error('\x1b[31mError:\x1b[0m', e.message)
      process.exit(1)
    }
  })
}

// Main
const [,, cmd, ...args] = process.argv

if (cmd === 'check') {
  const target = args[0]
  if (!target) {
    console.log('\x1b[31mUsage:\x1b[0m npx showreceipts check <github-pr-url>')
    console.log('       npx showreceipts check --paste')
    process.exit(1)
  }
  if (target === '--paste') {
    checkPaste()
  } else if (target.includes('github.com')) {
    checkPR(target)
  } else {
    console.log('\x1b[31mExpected a GitHub PR URL or --paste flag.\x1b[0m')
    process.exit(1)
  }
} else {
  console.log()
  console.log('\x1b[1m  Δ ShowReceipts DELTA CLI\x1b[0m')
  console.log('\x1b[2m  Measures epistemic contribution in PR descriptions.\x1b[0m')
  console.log()
  console.log('  Commands:')
  console.log('    npx showreceipts check <github-pr-url>')
  console.log('    npx showreceipts check --paste')
  console.log()
  console.log('  Environment:')
  console.log('    DELTA_API_URL   API endpoint (default: https://showreceipts.onrender.com)')
  console.log()
}
