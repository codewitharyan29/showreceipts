# DELTA Chrome Extension

Shows DELTA scores directly on GitHub PR pages.

## Install (Development)

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this `extension/` folder

## Usage

Open any GitHub PR. The DELTA badge appears automatically near the PR title:

```
Δ 23  High Slop  ◈◎
```

Click the badge to open the full sentence-level breakdown on delicate-bonbon-50a0d5.netlify.app.

## Configuration

Edit `content.js` line 7 to point to your deployed backend:
```javascript
const API_URL = 'https://showreceipts.onrender.com'
```

## How it works

1. Content script detects GitHub PR pages
2. Extracts PR description from DOM
3. Sends to DELTA API (POST /analyze)
4. Injects score badge inline on the page

Zero LLM calls in detection path.
