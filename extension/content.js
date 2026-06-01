/**
 * DELTA Chrome Extension — Content Script
 * Injects DELTA score badge into GitHub PR pages.
 *
 * Reads the PR description from the DOM, sends to DELTA API,
 * and displays the score inline on the PR page.
 */
(async () => {
  const API_URL = 'https://showreceipts.onrender.com'

  // Only run on PR pages
  if (!window.location.pathname.match(/\/pull\/\d+/)) return

  // Wait for PR description to load
  const waitForEl = (selector, timeout = 5000) => new Promise((resolve, reject) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el)
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) { observer.disconnect(); resolve(el) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); reject(new Error('Timeout')) }, timeout)
  })

  try {
    // Find the PR description area
    const descEl = await waitForEl('.js-comment-body, [data-testid="pr-body"]')
    const description = descEl?.innerText?.trim()
    if (!description || description.length < 10) return

    // Create badge container
    const badge = document.createElement('div')
    badge.id = 'delta-badge'
    badge.style.cssText = `
      display: inline-flex; align-items: center; gap: 6px;
      background: #07080a; border: 1px solid #1a1a1a; border-radius: 6px;
      padding: 4px 10px; font-family: monospace; font-size: 12px;
      cursor: pointer; margin-left: 8px; position: relative; z-index: 100;
    `
    badge.innerHTML = '<span style="color:#555">Δ</span><span style="color:#555">Loading...</span>'

    // Insert near PR title
    const titleArea = document.querySelector('.gh-header-actions, .js-sticky-offset-scroll')
    if (titleArea) titleArea.prepend(badge)

    // Fetch score
    const res = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, mode: 'pr' }),
    })

    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()

    const score = data.delta_score
    const label = data.slop_label
    const species = data.species?.map(s => s.glyph).join('') || ''

    const color = score >= 76 ? '#00E87A' : score >= 51 ? '#9AE030' : score >= 26 ? '#FF9020' : '#FF4040'

    badge.innerHTML = `
      <span style="color:#555">Δ</span>
      <span style="color:${color};font-weight:bold">${Math.round(score)}</span>
      <span style="color:#555">${label}</span>
      ${species ? `<span style="letter-spacing:2px">${species}</span>` : ''}
    `

    badge.title = `DELTA Score: ${score}/100\nClick to view full breakdown`
    badge.style.borderColor = `${color}40`

    badge.addEventListener('click', () => {
      window.open(`https://delicate-bonbon-50a0d5.netlify.app/analyze?pr=${encodeURIComponent(window.location.href)}`, '_blank')
    })

  } catch (err) {
    console.log('[DELTA] Could not score PR:', err.message)
  }
})()
