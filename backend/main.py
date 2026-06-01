"""
DELTA — ShowReceipts API
========================
FastAPI backend. Zero LLM calls in detection path.
"""
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from core.config import get_settings
from core.models import AnalyzeRequest, AnalyzeResponse
from detection.engine import analyze
from detection.repo_analytics import analyze_repo

app = FastAPI(
    title="DELTA — ShowReceipts",
    description="Measures epistemic contribution in PR descriptions. Zero LLM calls.",
    version="2.0.0",
)

settings = get_settings()

# Allow all origins — works for local dev and deployed frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(request: AnalyzeRequest):
    try:
        return await analyze(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/repo/{owner}/{repo}/stats")
async def repo_stats(owner: str, repo: str):
    try:
        result = analyze_repo(owner, repo, github_token=settings.github_token)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/badge/{owner}/{repo}.svg")
async def delta_badge(owner: str, repo: str):
    try:
        result = analyze_repo(owner, repo, github_token=settings.github_token, max_prs=15)
        score = result.get("median_score", 0)

        if score >= 76:   color, text = "#2ea44f", "Quality"
        elif score >= 51: color, text = "#e3b341", "Low Slop"
        elif score >= 26: color, text = "#cf7200", "Medium Slop"
        else:             color, text = "#d73a49", "High Slop"

        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20">
  <clipPath id="r"><rect width="160" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="90" height="20" fill="#555"/>
    <rect x="90" width="70" height="20" fill="{color}"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-size="11">
    <text x="45" y="14">Δ DELTA {score}</text>
    <text x="125" y="14">{text}</text>
  </g>
</svg>'''
        return Response(content=svg, media_type="image/svg+xml",
                       headers={"Cache-Control": "max-age=3600"})
    except Exception:
        svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20"><rect width="120" height="20" rx="3" fill="#555"/><text x="60" y="14" fill="#fff" text-anchor="middle" font-family="Arial" font-size="11">DELTA unavailable</text></svg>'
        return Response(content=svg, media_type="image/svg+xml")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": settings.st_model,
        "version": "2.0.0",
        "signals": ["missing", "dris", "ecs", "engagement", "alignment", "dss", "density"],
        "llm_calls_in_detection": 0,
    }
