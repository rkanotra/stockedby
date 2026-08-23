#!/usr/bin/env python3
"""StockedBy snapshot harvester.

Automates the manual workflow in docs/stockedby-data-kit.md §2 (the Harvest
Prompt) for engines that expose an API: ask the engine the real shopper
question (with web/search grounding where the engine supports it), then
have it self-report its own genuine answer in the data-kit snapshot schema.

Never fabricates: if an engine has no API integration here, or a grounded
call fails, the script skips it loudly rather than inventing a snapshot —
the manual copy-paste flow in docs/stockedby-data-kit.md §2 still works for
chatgpt or gemini (consumer-app surface) if you'd rather not use an API key.
grok, perplexity and copilot are out of product scope (see CLAUDE.md) — not
supported here, and not expected to be.

A bare run (no --category/--limit/--all-categories) is scoped to DEFAULT_IDS
— the data-kit's star-priority categories, ~22 per market — not the whole
bank. That's ~54 categories / ~216 queries per engine across all markets,
not ~197 categories / ~785 queries. Pass --all-categories to explicitly opt
into the full bank.

Usage:
  python scripts/harvest.py --engine chatgpt --market India
  python scripts/harvest.py --engine gemini --market all --limit 3 --dry-run
  python scripts/harvest.py --engine gemini --market UAE --category perfume-attar
  python scripts/harvest.py --engine gemini --market all --all-categories

Requires: pip install -r scripts/requirements.txt (or use a venv — see
scripts/README.md). Reads GEMINI_API_KEY / OPENAI_API_KEY from the
environment or .env.local, matching the engine you pass to --engine.
"""
import argparse
import json
import os
import sys
import time
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"

MARKET_FILES = {
    "India": "india.json",
    "UAE": "uae.json",
    "KSA": "ksa.json",
}

# The safe default scope for a --market all run: the star-priority
# categories from docs/stockedby-data-kit.md §3 ("Start with * = priority
# 20 for India + GCC"), 22 categories x 3 markets ~= 54 total instead of the
# full bank's ~200 (~785 queries/engine at 4 queries/category). IDs are
# per-market on purpose — slug conventions differ (e.g. India's
# "men-s-sunglasses" vs UAE/KSA's "mens-sunglasses"), and not every market's
# current batch has every star category yet. --category/--limit/
# --all-categories always override this; it only applies to a bare run.
DEFAULT_IDS = {
    "India": [
        "face-serum-vitamin-c", "sunscreen", "hair-oil", "beard-grooming", "perfume-attar",
        "oud-products", "men-s-sunglasses", "women-s-ethnic-wear-kurtis", "abayas-and-modest-fashion",
        "sneakers-casual-shoes", "protein-powder-whey", "healthy-snacks-makhana", "coffee",
        "multivitamins", "ayurvedic-supplements", "baby-skincare", "bedsheets-bedding", "cookware",
        "tws-earbuds", "smartwatches", "yoga-mats", "fragrance-free-sensitive-skincare",
    ],
    "UAE": [
        "face-serum-vitamin-c", "sunscreen", "beard-grooming", "perfume-attar", "oud-products",
        "mens-sunglasses", "womens-ethnic-wear", "abayas-modest-fashion", "sneakers-casual-shoes",
        "whey-protein", "coffee-specialty", "multivitamins", "baby-skincare", "bedsheets-bedding",
        "tws-earbuds", "smartwatches", "yoga-mats",
    ],
    "KSA": [
        "skincare-serum", "sunscreen", "beard-grooming", "perfume-attar", "oud-products",
        "mens-sunglasses", "abayas-modest-fashion", "sneakers", "whey-protein", "multivitamins",
        "baby-skincare", "bedsheets-bedding", "cookware", "tws-earbuds", "smartwatches",
    ],
}

# The exact schema/prompt shape from docs/stockedby-data-kit.md §2, adapted
# for API use (the manual version is meant for pasting into a chat UI).
HARVEST_PROMPT = """I'm going to ask you a shopping question. Answer it the way you normally would
for a real customer — search the web if you can — then convert YOUR OWN answer
into the JSON format below.

My question: "{query_text}"

After deciding your genuine recommendations, output ONLY this JSON, nothing else:

{{
  "recommendations": [
    {{ "rank": 1, "brand": "", "product": "", "why": "one line on why you picked it", "destination": "brand-direct | marketplace | aggregator | none", "destination_domain": "the exact site you would send me to buy this" }},
    {{ "rank": 2, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" }},
    {{ "rank": 3, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" }},
    {{ "rank": 4, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" }},
    {{ "rank": 5, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" }}
  ],
  "sources_cited": ["list the domains you actually used, if any"]
}}

Important: your recommendations must be your real answer to the question — do
not change them because of the format. Name actual brands."""


def load_env():
    """Load .env.local (repo root) into the environment if present, via
    python-dotenv. scripts/README.md's documented setup is
    `export $(grep -v '^#' .env.local | xargs)` before running any script
    here — this is just a convenience so scripts/retest.py and
    scripts/founder_digest.py (both of which need SUPABASE_URL/
    SUPABASE_SERVICE_KEY/RESEND_API_KEY even for a --dry-run) don't require
    that export every time. No-ops if python-dotenv isn't installed — the
    shell-export workflow still works either way."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(REPO_ROOT / ".env.local")


def sanity(recs):
    """True if `recs` looks bad enough to reject: not a list, empty, or no
    item names a real brand/product. Never fabricate (rule 2 in CLAUDE.md)
    — a genuinely empty or garbage answer must be skipped and logged, never
    written as if it were a real snapshot."""
    if not isinstance(recs, list) or not recs:
        return True
    return not any(isinstance(r, dict) and (r.get("brand") or r.get("product")) for r in recs)


def sb(method, path, payload=None, params=""):
    """Minimal Supabase REST client, shared by every script here: harvest.py
    itself (system_events only), scripts/retest.py (snapshots/reports/leads/
    system_events) and scripts/founder_digest.py (everything, read-only)."""
    import urllib.request

    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path + params
    headers = {
        "apikey": os.environ["SUPABASE_SERVICE_KEY"],
        "Authorization": "Bearer " + os.environ["SUPABASE_SERVICE_KEY"],
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read().decode()
        return json.loads(body) if body else []


def log_event(event_type, source, context=None):
    """Best-effort system_events write (supabase/migrations/0003) — self-
    improvement infra, feeds scripts/founder_digest.py's "system-event
    patterns" section. Never raises: a logging failure must never break the
    actual harvest/retest run it's trying to observe."""
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        return
    try:
        sb("POST", "system_events", payload={
            "event_type": event_type, "source": source, "context": context or {},
        })
    except Exception as e:  # noqa: BLE001
        print(f"  [system_events] log failed: {e}")


def load_market_file(market):
    path = DATA_DIR / MARKET_FILES[market]
    with open(path, "r", encoding="utf-8") as f:
        return path, json.load(f)


def save_market_file(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def extract_json(text):
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object in reply: {text[:200]!r}")
    return json.loads(text[start : end + 1])


class GeminiHarvester:
    """engine="gemini", surface="api" — real web grounding via Google Search."""

    name = "gemini"
    surface = "api"

    def __init__(self, model="gemini-3.6-flash", timeout_ms=90_000):
        from google import genai
        from google.genai import types

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise SystemExit("GEMINI_API_KEY is not set (checked env + .env.local).")
        self._types = types
        # Without an explicit timeout a stalled connection can hang
        # indefinitely — a real run once sat with zero output for ~2 hours
        # before something external finally killed it. 90s is generous for
        # a single grounded call; a genuinely stuck request should fail
        # fast so retries/resume can do their job instead.
        self.client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=timeout_ms))
        self.model = model

    def ask(self, query_text, retries=2):
        prompt = HARVEST_PROMPT.format(query_text=query_text)
        last_err = None
        for attempt in range(retries + 1):
            try:
                resp = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=self._types.GenerateContentConfig(
                        tools=[self._types.Tool(google_search=self._types.GoogleSearch())],
                    ),
                )
                parsed = extract_json(resp.text or "")
                sources = self._real_sources(resp) or parsed.get("sources_cited") or []
                return parsed.get("recommendations", []), sources
            except Exception as e:  # noqa: BLE001 - surfaced to the caller, not swallowed
                last_err = e
                msg = str(e)
                if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
                    raise  # quota/billing block — retrying won't help, fail loud
                if attempt < retries:
                    time.sleep(2 ** attempt)
        raise last_err

    @staticmethod
    def _real_sources(resp):
        """Prefer the model's actual grounding telemetry over its self-reported
        sources_cited — same principle as the Claude route: trust the tool
        result, not the model's account of what it did."""
        try:
            chunks = resp.candidates[0].grounding_metadata.grounding_chunks or []
        except (AttributeError, IndexError, TypeError):
            return None
        domains = []
        for c in chunks:
            uri = getattr(getattr(c, "web", None), "uri", None)
            if uri:
                try:
                    from urllib.parse import urlparse

                    d = urlparse(uri).hostname
                    if d:
                        domains.append(d.removeprefix("www."))
                except ValueError:
                    continue
        return domains or None


class OpenAIHarvester:
    """engine="chatgpt", surface="api" — real web search via the Responses API."""

    name = "chatgpt"
    surface = "api"

    def __init__(self, model=None, timeout_s=90.0):
        from openai import OpenAI

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise SystemExit("OPENAI_API_KEY is not set (checked env + .env.local).")
        # Explicit timeout for the same reason as the Gemini client: a
        # stalled connection should fail fast, not hang indefinitely.
        self.client = OpenAI(api_key=api_key, timeout=timeout_s)
        # Override with OPENAI_MODEL if the default has moved on by the time
        # this runs — OpenAI's lineup turns over faster than this script does.
        self.model = model or os.environ.get("OPENAI_MODEL", "gpt-4.1")

    def ask(self, query_text, retries=2):
        prompt = HARVEST_PROMPT.format(query_text=query_text)
        last_err = None
        for attempt in range(retries + 1):
            try:
                resp = self.client.responses.create(
                    model=self.model,
                    input=prompt,
                    tools=[{"type": "web_search"}],
                )
                parsed = extract_json(resp.output_text or "")
                sources = self._real_sources(resp) or parsed.get("sources_cited") or []
                return parsed.get("recommendations", []), sources
            except Exception as e:  # noqa: BLE001 - surfaced to the caller, not swallowed
                last_err = e
                msg = str(e).lower()
                if "rate_limit" in msg or "insufficient_quota" in msg or "429" in msg:
                    raise  # quota/billing block — retrying won't help, fail loud
                if attempt < retries:
                    time.sleep(2 ** attempt)
        raise last_err

    @staticmethod
    def _real_sources(resp):
        """Prefer the model's actual URL citations over its self-reported
        sources_cited — same principle as the Gemini harvester and the
        Claude route trusting real tool telemetry over model narration."""
        from urllib.parse import urlparse

        domains = []
        try:
            for item in resp.output:
                if getattr(item, "type", None) != "message":
                    continue
                for block in getattr(item, "content", None) or []:
                    for ann in getattr(block, "annotations", None) or []:
                        if getattr(ann, "type", None) != "url_citation":
                            continue
                        url = getattr(ann, "url", None)
                        if not url:
                            continue
                        d = urlparse(url).hostname
                        if d:
                            domains.append(d.removeprefix("www."))
        except (AttributeError, TypeError):
            return None
        return domains or None


ENGINES = {"gemini": GeminiHarvester, "chatgpt": OpenAIHarvester}
QUOTA_DOCS_URL = {
    "gemini": "https://ai.google.dev/gemini-api/docs/rate-limits",
    "chatgpt": "https://platform.openai.com/docs/guides/rate-limits",
}


def is_quota_error(e):
    msg = str(e).lower()
    return "resource_exhausted" in msg or "rate_limit" in msg or "insufficient_quota" in msg or "429" in msg


def print_market_summary(stats):
    print("\nPer-market results:")
    icon = {"ok": "✓", "skip": "skip", "fail": "✗", "dry-run": "dry"}
    for market, s in stats.items():
        print(
            f"  {market:6} {icon[s['status']]:5} categories={s['categories']} "
            f"written={s['written']} failed={s['failed']} resumed={s.get('skipped', 0)}"
        )


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", required=True, choices=["gemini", "chatgpt"])
    ap.add_argument("--market", required=True, choices=[*MARKET_FILES.keys(), "all"])
    ap.add_argument("--category", help="Only harvest this category id (for testing).")
    ap.add_argument(
        "--all-categories",
        action="store_true",
        help="Process the entire bank instead of the DEFAULT_IDS priority scope (~4x more "
        "categories, ~785 queries/engine across all markets). Expensive — try --limit first.",
    )
    ap.add_argument("--limit", type=int, help="Cap the number of categories processed per market.")
    ap.add_argument("--sleep", type=float, default=1.5, help="Seconds between API calls (default 1.5).")
    ap.add_argument("--dry-run", action="store_true", help="Print what would run, call nothing, write nothing.")
    args = ap.parse_args()

    load_env()
    markets = list(MARKET_FILES.keys()) if args.market == "all" else [args.market]
    harvester = None if args.dry_run else ENGINES[args.engine]()
    today = date.today().isoformat()

    total_calls = total_written = total_failed = total_skipped = 0
    market_stats = {}

    for market in markets:
        path, data = load_market_file(market)
        all_categories = data.get("categories", [])
        if args.category:
            categories = [c for c in all_categories if c["id"] == args.category]
        elif args.all_categories:
            categories = all_categories
        else:
            default_ids = set(DEFAULT_IDS.get(market, []))
            categories = [c for c in all_categories if c["id"] in default_ids]
        if args.limit:
            categories = categories[: args.limit]

        if not categories:
            print(f"[{market}] no matching categories, skipping")
            market_stats[market] = {"status": "skip", "categories": 0, "written": 0, "failed": 0}
            continue

        market_written = market_failed = market_skipped = 0
        changed = False
        for cat_i, cat in enumerate(categories, 1):
            cat_changed = False
            for q in cat.get("queries", []):
                label = f"[{market}/{cat['id']}/{q['qid']}]"

                # Resume support: if a previous run today already collected
                # this exact qid+engine (e.g. the process got killed
                # partway through), don't re-ask and re-pay for it — pick
                # up where it left off. A snapshot from an EARLIER date is
                # legitimate history, not a resume marker, so it doesn't
                # count here; only today's own collected_on does.
                already_done = any(
                    s.get("qid") == q["qid"] and s.get("engine") == args.engine and s.get("collected_on") == today
                    for s in cat.get("snapshots", [])
                )
                if already_done:
                    print(f"{label} already collected today — skipping (resume)")
                    total_skipped += 1
                    market_skipped += 1
                    continue

                total_calls += 1
                if args.dry_run:
                    print(f"{label} DRY RUN — would ask: {q['text'][:80]!r}")
                    continue

                print(f"{label} asking: {q['text'][:80]!r}")
                try:
                    recs, sources = harvester.ask(q["text"])
                except Exception as e:  # noqa: BLE001
                    total_failed += 1
                    market_failed += 1
                    print(f"{label} FAILED: {type(e).__name__}: {str(e)[:300]}")
                    log_event("query_failure", "harvest", {
                        "engine": args.engine, "market": market, "category": cat["id"],
                        "qid": q["qid"], "error": str(e)[:300],
                    })
                    if is_quota_error(e):
                        print(
                            "\nQuota/billing exhausted — stopping the whole run rather than "
                            "burning through remaining calls that will fail the same way.\n"
                            f"Fix billing/quota at {QUOTA_DOCS_URL.get(args.engine, '')}, "
                            "then re-run (already-written snapshots are untouched)."
                        )
                        if changed:
                            save_market_file(path, data)
                        market_stats[market] = {
                            "status": "fail",
                            "categories": cat_i,
                            "written": market_written,
                            "failed": market_failed,
                            "skipped": market_skipped,
                        }
                        print_market_summary(market_stats)
                        sys.exit(1)
                    time.sleep(args.sleep)
                    continue

                if sanity(recs):
                    total_failed += 1
                    market_failed += 1
                    print(f"{label} REJECTED: empty or garbage recommendations")
                    log_event("sanity_rejection", "harvest", {
                        "engine": args.engine, "market": market, "category": cat["id"],
                        "qid": q["qid"], "recs": recs,
                    })
                    time.sleep(args.sleep)
                    continue

                cat.setdefault("snapshots", []).append(
                    {
                        "qid": q["qid"],
                        "engine": harvester.name,
                        "surface": harvester.surface,
                        "collected_on": today,
                        "recommendations": recs,
                        "sources_cited": sources,
                    }
                )
                changed = cat_changed = True
                total_written += 1
                market_written += 1
                print(f"{label} ok — {len(recs)} recs, {len(sources)} sources")
                time.sleep(args.sleep)

            # Save after every category, not just at the end of the whole
            # market — a run across all 100+ categories can take hours; on a
            # crash or interruption, only the in-flight category's work (and
            # spend) is at risk, not the entire market's.
            if cat_changed and not args.dry_run:
                save_market_file(path, data)
                print(f"[{market}] {cat_i}/{len(categories)} categories done, saved {path.relative_to(REPO_ROOT)}")

        if args.dry_run:
            status = "dry-run"
        elif market_failed > 0 and market_written == 0 and market_skipped == 0:
            # Nothing succeeded, nothing resumable from a prior run either —
            # a real failure, not just "everything was already done."
            status = "fail"
        else:
            status = "ok"
        market_stats[market] = {
            "status": status,
            "categories": len(categories),
            "written": market_written,
            "failed": market_failed,
            "skipped": market_skipped,
        }

    print(f"\nDone. calls={total_calls} written={total_written} failed={total_failed} resumed={total_skipped}")
    print_market_summary(market_stats)
    if total_failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
