"""
Bake-Off Dataset Collector
===========================
Collects (diff, description) pairs from GitHub for benchmark dataset.

Quality PRs: repos known for detailed PR culture
  - microsoft/vscode, rust-lang/rust, django/django, rails/rails
  - torvalds/linux, kubernetes/kubernetes, golang/go

Slop PRs: auto-generated descriptions (we generate these)

Run:
  pip install PyGithub python-dotenv tqdm
  python dataset/collect.py --quality 100 --output dataset/quality_prs.jsonl
  python dataset/collect.py --slop 100 --output dataset/slop_prs.jsonl
"""
import json
import argparse
import os
import re
import time
from github import Github
from dotenv import load_dotenv

load_dotenv()

QUALITY_REPOS = [
    "microsoft/vscode",
    "django/django",
    "rails/rails",
    "golang/go",
    "kubernetes/kubernetes",
    "rust-lang/rust",
    "python/cpython",
    "facebook/react",
    "vercel/next.js",
    "expressjs/express",
]

def collect_quality_prs(g: Github, count: int, output_path: str):
    """Collect PRs from repos known for high-quality descriptions."""
    collected = []

    for repo_name in QUALITY_REPOS:
        if len(collected) >= count:
            break
        try:
            repo = g.get_repo(repo_name)
            prs = repo.get_pulls(state="closed", sort="updated", direction="desc")

            for pr in prs:
                if len(collected) >= count:
                    break
                if not pr.body or len(pr.body.split()) < 30:
                    continue  # Skip empty or very short descriptions

                # Get diff
                files = list(pr.get_files())
                if not files:
                    continue

                diff_text = "\n".join([
                    f"File: {f.filename}\n{f.patch or ''}"
                    for f in files[:10]
                ])

                record = {
                    "url": pr.html_url,
                    "title": pr.title,
                    "description": pr.body,
                    "diff": diff_text,
                    "label": "quality",
                    "repo": repo_name,
                    "pr_number": pr.number,
                }
                collected.append(record)
                print(f"  ✓ {repo_name}#{pr.number} ({len(pr.body.split())} words)")
                time.sleep(0.5)  # Rate limit courtesy

        except Exception as e:
            print(f"  ✗ {repo_name}: {e}")
            continue

    with open(output_path, 'w') as f:
        for rec in collected:
            f.write(json.dumps(rec) + '\n')

    print(f"\nCollected {len(collected)} quality PRs → {output_path}")


def generate_slop_prs(quality_path: str, output_path: str):
    """
    Generate slop descriptions from quality PRs.
    Takes the diff, generates a hollow description using templates.
    No LLM — pure template-based slop simulation.
    """
    templates = [
        "This PR updates the codebase to address the reported issue.",
        "Updated {file} to fix the bug.",
        "This commit improves the code quality and addresses technical debt.",
        "Made changes to enhance the functionality and user experience.",
        "Refactored {file} for better maintainability.",
        "This PR adds improvements to the existing implementation.",
        "Fixed the issue as discussed in the ticket.",
        "Updated the code to follow best practices.",
        "This change addresses the feedback from the previous review.",
        "Minor updates and improvements.",
    ]

    import random
    slop_records = []

    with open(quality_path) as f:
        quality_prs = [json.loads(line) for line in f]

    for pr in quality_prs:
        # Extract first filename from diff
        file_match = re.search(r'File: (\S+)', pr.get('diff', ''))
        filename = file_match.group(1).split('/')[-1] if file_match else "the code"

        template = random.choice(templates)
        slop_description = template.replace('{file}', filename)

        record = {
            "url": pr["url"],
            "title": pr["title"],
            "description": slop_description,
            "diff": pr["diff"],
            "label": "slop",
            "repo": pr["repo"],
            "pr_number": pr["pr_number"],
            "original_description": pr["description"],
        }
        slop_records.append(record)

    with open(output_path, 'w') as f:
        for rec in slop_records:
            f.write(json.dumps(rec) + '\n')

    print(f"Generated {len(slop_records)} slop PRs → {output_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--quality', type=int, default=100)
    parser.add_argument('--output', default='dataset/quality_prs.jsonl')
    parser.add_argument('--slop', action='store_true')
    args = parser.parse_args()

    token = os.getenv('GITHUB_TOKEN', '')
    g = Github(token) if token else Github()

    os.makedirs('dataset', exist_ok=True)

    if args.slop:
        generate_slop_prs('dataset/quality_prs.jsonl', 'dataset/slop_prs.jsonl')
    else:
        collect_quality_prs(g, args.quality, args.output)


if __name__ == '__main__':
    main()
