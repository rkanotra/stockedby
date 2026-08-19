#!/usr/bin/env python3
"""StockedBy snapshot harvester.

Automates the manual workflow in docs/stockedby-data-kit.md §2 (the Harvest
Prompt) for engines that expose an API: ask the engine the real shopper
question (with web/search grounding where the engine supports it), then
have it self-report its own genuine answer in the data-kit snapshot schema.

Never fabricates: if an engine has no API integration here, or a grounded
call fails, the script skips it loudly rather than inventing a snapshot —
the manual copy-paste flow in docs/stockedby-data-kit.md §2 still works for
any engine (consumer-app surface: chatgpt, gemini, grok, perplexity, copilot).

Usage:
  python scripts/harvest.py --engine gemini --market India
  python scripts/harvest.py --engine gemini --market all --limit 3 --dry-run
  python scripts/harvest.py --engine gemini --market UAE --category perfume-attar

Requires: pip install -r scripts/requirements.txt (or use a venv — see
scripts/README.md). Reads GEMINI_API_KEY from the environment or .env.local.
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

    def __init__(self, model="gemini-3.6-flash"):
        from google import genai
        from google.genai import types

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise SystemExit("GEMINI_API_KEY is not set (checked env + .env.local).")
        self._types = types
        self.client = genai.Client(api_key=api_key)
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


ENGINES = {"gemini": GeminiHarvester}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", required=True, choices=["gemini", "chatgpt", "grok", "perplexity", "copilot"])
    ap.add_argument("--market", required=True, choices=[*MARKET_FILES.keys(), "all"])
    ap.add_argument("--category", help="Only harvest this category id (for testing).")
    ap.add_argument("--limit", type=int, help="Cap the number of categories processed per market.")
    ap.add_argument("--sleep", type=float, default=1.5, help="Seconds between API calls (default 1.5).")
    ap.add_argument("--dry-run", action="store_true", help="Print what would run, call nothing, write nothing.")
    args = ap.parse_args()

    if args.engine not in ENGINES:
        raise SystemExit(
            f"No API integration for engine={args.engine!r} yet. "
            "Use the manual Harvest Prompt workflow in docs/stockedby-data-kit.md §2 "
            "(consumer-app surface) and paste the result into data/ directly."
        )

    markets = list(MARKET_FILES.keys()) if args.market == "all" else [args.market]
    harvester = None if args.dry_run else ENGINES[args.engine]()
    today = date.today().isoformat()

    total_calls = total_written = total_failed = 0

    for market in markets:
        path, data = load_market_file(market)
        categories = data.get("categories", [])
        if args.category:
            categories = [c for c in categories if c["id"] == args.category]
            if not categories:
                print(f"[{market}] no category '{args.category}' found, skipping market")
                continue
        if args.limit:
            categories = categories[: args.limit]

        changed = False
        for cat in categories:
            for q in cat.get("queries", []):
                total_calls += 1
                label = f"[{market}/{cat['id']}/{q['qid']}]"
                if args.dry_run:
                    print(f"{label} DRY RUN — would ask: {q['text'][:80]!r}")
                    continue

                print(f"{label} asking: {q['text'][:80]!r}")
                try:
                    recs, sources = harvester.ask(q["text"])
                except Exception as e:  # noqa: BLE001
                    total_failed += 1
                    print(f"{label} FAILED: {type(e).__name__}: {str(e)[:300]}")
                    if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                        print(
                            "\nQuota/billing exhausted for grounded search — stopping the whole run "
                            "rather than burning through remaining calls that will fail the same way.\n"
                            "Fix billing/quota at https://ai.google.dev/gemini-api/docs/rate-limits, "
                            "then re-run (already-written snapshots are untouched)."
                        )
                        if changed:
                            save_market_file(path, data)
                        sys.exit(1)
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
                changed = True
                total_written += 1
                print(f"{label} ok — {len(recs)} recs, {len(sources)} sources")
                time.sleep(args.sleep)

        if changed and not args.dry_run:
            save_market_file(path, data)
            print(f"[{market}] wrote {path.relative_to(REPO_ROOT)}")

    print(f"\nDone. calls={total_calls} written={total_written} failed={total_failed}")
    if total_failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
