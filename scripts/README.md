# scripts/

## check_query_bank.py
Acceptance gate for query-bank batches (no dependencies beyond stdlib):

```
python3 scripts/check_query_bank.py data/india.json
```

## harvest.py
Automates the Harvest Prompt workflow (docs/stockedby-data-kit.md §2) for
engines with an API — currently `gemini` only. Every other test engine
(chatgpt, grok, perplexity, copilot) still uses the manual copy-paste flow
into `data/*.json`; the script refuses to fabricate results for engines it
doesn't actually call.

Setup (one-time):

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

Requires `GEMINI_API_KEY` in the environment or `.env.local` (used for the
Next.js app too — see `.env.example`).

```
source .venv/bin/activate
export $(grep -v '^#' .env.local | xargs)
python3 scripts/harvest.py --engine gemini --market India --category tws-earbuds --dry-run
python3 scripts/harvest.py --engine gemini --market India
python3 scripts/harvest.py --engine gemini --market all
```

Flags: `--category <id>` and `--limit N` scope a run for testing before
going wide; `--dry-run` previews without calling the API or writing files;
`--sleep <seconds>` (default 1.5) paces calls. New snapshots are appended,
never overwritten (data-kit.md rule: re-collect with a new `collected_on`
date rather than editing an old snapshot — staleness/drift is itself data).
On a quota/billing error (429) the run stops immediately rather than
burning through the rest of the queue on calls that will fail the same way;
whatever was already written stays written.
