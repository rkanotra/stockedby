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

This is the offline/batch path, writing straight to data/*.json. There's
also an on-demand path — lib/harvestClients.js, the JS port of this same
HARVEST_PROMPT, called from app/api/test/route.js when a live test hits a
category+market with no snapshot newer than 30 days (lib/freshness.js). The
two aren't shared code (one's Python, one's JS) so keep them in sync by hand
if the prompt or schema changes.

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

**A bare run (no `--category`) is scoped to `DEFAULT_IDS`** — the data-kit's
star-priority categories (~22/market, ~54 total across all three markets,
~216 queries/engine) — not the whole bank. `--all-categories` opts into the
full bank explicitly (~197 categories, ~785 queries/engine — hours per
engine; run engines sequentially, never concurrently, since two processes
writing the same market file will clobber each other's saved progress).

Flags: `--category <id>` harvests just that one category; `--all-categories`
processes the whole bank instead of `DEFAULT_IDS`; `--limit N` caps
whichever category list was selected — for testing before going wide;
`--dry-run` previews without calling the API or writing files; `--sleep
<seconds>` (default 1.5) paces calls. New snapshots are appended, never
overwritten (data-kit.md rule: re-collect with a new `collected_on` date
rather than editing an old snapshot — staleness/drift is itself data). The
market file is saved after every category (not just at the end of a whole
market), so a crash or interruption only risks the one in-flight category.
On a quota/billing error the run stops immediately rather than burning
through the rest of the queue on calls that will fail the same way; a final
per-market ✓/skip/✗ summary (categories/written/failed) prints either way.

harvest.py also exports a few shared utilities the two scripts below import:
`load_env()` (loads `.env.local` via python-dotenv, a convenience over the
`export $(grep -v '^#' .env.local | xargs)` one-liner above — note that
one-liner breaks on any value containing spaces, e.g. `FROM_EMAIL="StockedBy
<reports@stockedby.com>"`, so `load_env()` is the more reliable option for
scripts that need multiple env vars), `sanity(recs)` (rejects an empty or
all-blank "recommendations" list — never fabricate, CLAUDE.md rule 2),
`sb(method, path, ...)` (a minimal Supabase REST client), and
`log_event(event_type, source, context)` (writes to `system_events` —
supabase/migrations/0003, mirrors lib/systemEvents.js on the JS side).

## retest.py
Re-tests every tracked (brand, market, category) combo — anyone who's saved
a report — by re-harvesting chatgpt + gemini fresh (same `ENGINES` as
harvest.py; claude is deliberately never re-harvested here, see harvest.py's
own note above) and diffing the brand's position both against its last known
position and against ~30 days ago (month-over-month). Emails the merchant
when either diff shows real movement, and sends you a digest of every brand
that changed. A sanity-rejected or errored query is logged to
`system_events` (`sanity_rejection` / `query_failure`, source `retest`) via
`log_event()`, same as harvest.py's own main loop.

```
python3 scripts/retest.py             # re-test everyone, email on changes
python3 scripts/retest.py --dry-run   # print current positions, harvest/email nothing
```

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`,
`OPENAI_API_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`, `FOUNDER_EMAIL` in
`.env.local` (loaded automatically via `load_env()`). Not yet wired to a
cron — run monthly by hand for now.

## founder_digest.py
Weekly self-improvement summary, entirely from Supabase — no re-harvesting,
no API cost beyond the read queries themselves: custom-category requests
ranked by count (candidates for new bank categories), `system_events`
patterns from the last 7 days, brands appearing in AI recommendations for
the first time ever (per market+category+engine), and which categories real
merchants tested most.

```
python3 scripts/founder_digest.py             # email the digest to FOUNDER_EMAIL
python3 scripts/founder_digest.py --dry-run   # print it, don't email
```

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`,
`FROM_EMAIL`, `FOUNDER_EMAIL`. Not yet wired to a cron — run weekly by hand
for now (both this and retest.py are meant to move to a Vercel cron once
the cadence is proven manually).

## audit_brand_matches.py
Finds reports affected by the brand-matching bug lib/scoring.js's
normalizeBrand() fixes (a brand could rank #1 in its own leaders list with
real mentions while its saved verdict read NOT STOCKED — the old
normalize() stripped "&" and all whitespace with nothing put back, so
"Dot & Key" and a slug/guess-derived "Dot and Key" normalized to two
different strings). Read-only by default: prints a summary and writes a
CSV (slug, brand, email, old_verdict, created_at) of every report where
(a) the brand — recomputed with the FIXED matcher — actually is one of its
own leaders despite a saved NOT STOCKED verdict, or (b) the brand name
contains `& . ' - /`, worth a human glance regardless of whether it's
actually wrong.

```
python3 scripts/audit_brand_matches.py                # print + write CSV, change nothing
python3 scripts/audit_brand_matches.py --rerun         # also correct (a) from cached snapshots
python3 scripts/audit_brand_matches.py --csv out.csv   # custom CSV path
```

`--rerun` corrects flagged verdicts from already-collected `snapshots`
rows only — no new engine calls, no spend, and never sends email (the
script never sends email at all, in either mode). It recomputes the
appearance-based tier (NOT STOCKED / BARELY STOCKED vs. appearing at all)
correctly from the fixed matcher, but doesn't re-derive the full
share-of-voice engine scores computeReport() uses to distinguish OUTSHELVED
from ON THE SHELF once appearance rate is >= 0.5 — it writes "ON THE
SHELF" as a floor in that case, not a precise claim; scripts/retest.py (a
real re-test) is the source of truth for that finer distinction.

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
