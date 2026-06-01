# Contributing to DELTA — ShowReceipts

Thanks for your interest. Contributions that improve detection accuracy or the taxonomy are most welcome.

## Setup

```bash
git clone https://github.com/codewitharyan29/showreceipts
cd showreceipts
cp backend/.env.example backend/.env
# Add your GitHub token (optional but recommended)
docker-compose up
```

## Areas We Want Help With

### Taxonomy improvements — highest value

The 7-species taxonomy is the most valuable part of the project. If you find a pattern of low-quality PR content that doesn't map to one of the 7 current species, open an issue with:

1. A behavioral description of the pattern
2. A measurable signal (what algorithmic property indicates this species?)
3. Three verbatim evidence strings from real PRs
4. A concrete fix recommendation (one sentence, imperative)
5. A counterfactual (what does the fixed version look like?)

Current species for reference: XEROX, GHOST, MIRAGE, LOOP, VOID, COPY, TIMEBOMB.

### Benchmark expansion

We have 60 labeled PRs. More labeled data improves F1. The labeling format is in `dataset/generate_dataset.py`.

Primary labeling criterion: **Does the description explain WHY, not just WHAT?**
Secondary criterion: **Does it contain anything a reviewer couldn't infer from the diff?**

If you label PRs, include your reasoning — we want to compute inter-rater agreement.

### Sentence splitter improvements

The current splitter handles markdown bullets and headers but struggles with:
- Nested lists
- Code blocks inline with prose
- CJK text

If you have improvements for `detection/signals/dris.py:split_sentences()`, PRs welcome.

### Non-English support

DRIS (sentence transformer cosine similarity) works reasonably for non-English text since `all-MiniLM-L6-v2` is multilingual-capable. But ECS regex patterns are English-only. Contributions to expand the epistemic act patterns for other languages are welcome.

### Anti-gaming improvements

The current anti-gaming logic dampens entity-stuffing. We know of two other gaming vectors:
1. Copying sentences wholesale from the diff into the description (high similarity, but exact match rather than semantic)
2. Wrapping slop in one or two genuine epistemic sentences (scores higher than warranted)

If you have detection ideas for these, open an issue.

## Pull Request Guidelines

- One feature or fix per PR
- Include a description that would score 60+ on DELTA (practice what we preach)
- Tests in `backend/tests/` for any new detection logic
- Update the species classifier in `detection/signals/species.py` if adding a species
- Update `README.md` if the benchmark numbers change

## Issue Templates

**Bug:** Include the input text (or synthetic equivalent), the actual output, and expected output.

**New species:** Include behavioral definition, measurable signal, three examples, fix instruction, and counterfactual.

**False positive:** Include the PR description that scored poorly despite being high quality, and why you believe it should score higher.

## License

MIT. By contributing, you agree your contributions are licensed under the same terms.
