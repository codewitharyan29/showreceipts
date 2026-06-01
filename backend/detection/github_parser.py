"""
GitHub PR Parser
Fetches PR description + structured diff from a GitHub PR URL.
Parses diff into chunks suitable for DRIS signal computation.
"""
import re
from dataclasses import dataclass, field
from typing import Optional
from github import Github, GithubException
from core.config import get_settings


@dataclass
class DiffChunk:
    filename: str
    added_lines: list[str] = field(default_factory=list)
    removed_lines: list[str] = field(default_factory=list)
    context_lines: list[str] = field(default_factory=list)
    entities: list[str] = field(default_factory=list)  # fn names, class names


@dataclass
class ParsedPR:
    title: str
    description: str
    diff_chunks: list[DiffChunk]
    diff_raw: str
    url: str
    changed_files: list[str]
    all_diff_text: str  # flattened for TF-IDF


def parse_pr_url(url: str) -> tuple[str, str, int]:
    """Extract owner, repo, PR number from GitHub URL."""
    pattern = r"github\.com/([^/]+)/([^/]+)/pull/(\d+)"
    m = re.search(pattern, url)
    if not m:
        raise ValueError(f"Invalid GitHub PR URL: {url}")
    return m.group(1), m.group(2), int(m.group(3))


def extract_entities_from_diff(diff_text: str) -> list[str]:
    """
    Extract technical identifiers from diff text.
    Catches: function names, class names, variable names, file paths.
    """
    entities = []
    # Function/method definitions
    fn_pattern = r"(?:def|function|func|fn|async function)\s+(\w+)"
    entities += re.findall(fn_pattern, diff_text)
    # Class definitions
    class_pattern = r"(?:class|interface|type|struct)\s+(\w+)"
    entities += re.findall(class_pattern, diff_text)
    # camelCase and snake_case identifiers (min 4 chars to reduce noise)
    ident_pattern = r"\b([a-z][a-zA-Z0-9]{3,}|[A-Z][a-zA-Z0-9]{3,})\b"
    candidates = re.findall(ident_pattern, diff_text)
    # Filter common noise words
    noise = {
        "true","false","null","none","undefined","return","import","export",
        "from","const","let","var","this","self","that","with","async","await",
        "else","elif","elif","pass","break","continue","raise","throw","catch",
        "then","when","where","which","should","would","could","might"
    }
    entities += [c for c in candidates if c.lower() not in noise]
    return list(set(entities))


def chunk_diff(diff_text: str, filename: str) -> DiffChunk:
    """Parse a single file's diff into structured chunk."""
    chunk = DiffChunk(filename=filename)
    for line in diff_text.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            chunk.added_lines.append(line[1:].strip())
        elif line.startswith("-") and not line.startswith("---"):
            chunk.removed_lines.append(line[1:].strip())
        else:
            chunk.context_lines.append(line.strip())
    chunk.entities = extract_entities_from_diff(
        "\n".join(chunk.added_lines + chunk.removed_lines)
    )
    return chunk


def fetch_pr(url: str) -> ParsedPR:
    """
    Main entry point. Fetch PR from GitHub and return structured ParsedPR.
    Works with both authenticated (5000 req/hr) and unauthenticated (60 req/hr).
    """
    settings = get_settings()
    token = settings.github_token or None
    g = Github(token) if token else Github()

    owner, repo_name, pr_number = parse_pr_url(url)

    try:
        repo = g.get_repo(f"{owner}/{repo_name}")
        pr = repo.get_pull(pr_number)
    except GithubException as e:
        raise ValueError(f"GitHub API error: {e.status} — {e.data.get('message', '')}")

    # Description — handle None (empty PR body)
    description = pr.body or ""
    if not description.strip():
        description = "[No description provided]"

    # Diff — fetch per-file
    files = list(pr.get_files())
    diff_chunks = []
    all_diff_parts = []

    for f in files:
        patch = f.patch or ""
        if patch:
            chunk = chunk_diff(patch, f.filename)
            diff_chunks.append(chunk)
            all_diff_parts.append(f"File: {f.filename}\n{patch}")

    diff_raw = "\n\n".join(all_diff_parts)
    all_diff_text = "\n".join(
        [c.filename for c in diff_chunks] +
        [line for c in diff_chunks for line in c.added_lines + c.removed_lines]
    )

    return ParsedPR(
        title=pr.title,
        description=description,
        diff_chunks=diff_chunks,
        diff_raw=diff_raw,
        url=url,
        changed_files=[f.filename for f in files],
        all_diff_text=all_diff_text,
    )
