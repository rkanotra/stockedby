# scripts/

## check_query_bank.py
Acceptance gate for query-bank batches (no dependencies beyond stdlib):

```
python3 scripts/check_query_bank.py data/india.json
```

## harvest.py
Automates the Harvest Prompt workflow (docs/stockedby-data-kit.md §2) for
the two API-harvested engines, `gemini` and `chatgpt` (product scope is
chatgpt/gemini/claude — see CLAUDE.md; claude is always live, never
harvested, so it isn't a harvest.py engine). grok, perplexity and copilot
are out of scope entirely — not "not yet implemented," not supported.

Setup (one-time):

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

Requires `GEMINI_API_KEY` and/or `OPENAI_API_KEY` in the environment or
`.env.local` (used for the Next.js app too — see `.env.example`), matching
whichever engine you pass to `--engine`. `chatgpt` also reads `OPENAI_MODEL`
to override the default model (OpenAI's lineup moves fast — check
platform.openai.com if the default this script ships with has been retired).

```
source .venv/bin/activate
export $(grep -v '^#' .env.local | xargs)
python3 scripts/harvest.py --engine chatgpt --market India --category tws-earbuds --dry-run
python3 scripts/harvest.py --engine gemini --market India
python3 scripts/harvest.py --engine chatgpt --market all
```

Flags: `--category <id>` and `--limit N` scope a run for testing before
going wide; `--dry-run` previews without calling the API or writing files;
`--sleep <seconds>` (default 1.5) paces calls. New snapshots are appended,
never overwritten (data-kit.md rule: re-collect with a new `collected_on`
date rather than editing an old snapshot — staleness/drift is itself data).
On a quota/billing error (429) the run stops immediately rather than
burning through the rest of the queue on calls that will fail the same way;
whatever was already written stays written.
