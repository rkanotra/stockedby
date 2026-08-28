#!/usr/bin/env python3
"""StockedBy autocomplete drift detector (market-expansion phase).

Monthly-runnable, manual (no cron wiring, same as harvest.py itself). Pulls
Google's public autocomplete suggestions for each market's category seed
terms, with a country parameter so the suggestions reflect what people in
THAT market actually type — the external half of the freshness-signal
picture. The internal half is query_edits (native-speaker corrections,
logged from a live test) and failed_category_searches (what people search
for that the bank doesn't have yet); this script is what tells you the
bank's PHRASING itself may be drifting from how people search, even for
categories the bank already covers well.

No UI. Writes to Supabase's autocomplete_pulls table (supabase/migrations/
0007_market_expansion_freshness.sql) — a no-op with a warning if Supabase
isn't configured, same as every other best-effort write in this repo.

Usage:
  python scripts/autocomplete_pull.py --market Qatar
  python scripts/autocomplete_pull.py --market all
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest import load_env, sb, log_event, MARKET_FILES, DEFAULT_IDS  # noqa: E402

# Google's ISO country code per market — used as the `gl` param so
# suggestions reflect that market's real autocomplete results, not a
# generic/US default. Mirrors lib/marketProfiles.js's countryCode field
# (a separate Python-side copy, same reasoning as MARKET_FILES/DEFAULT_IDS
# already being mirrored rather than shared — this repo has no shared
# JS/Python config layer).
MARKET_GL = {
    "India": "IN", "UAE": "AE", "KSA": "SA", "Qatar": "QA", "Kuwait": "KW",
    "Oman": "OM", "Bahrain": "BH", "Pakistan": "PK",
}
MARKET_HL = {
    "India": "en", "UAE": "en", "KSA": "ar", "Qatar": "ar", "Kuwait": "ar",
    "Oman": "ar", "Bahrain": "ar", "Pakistan": "en",
}

DATA_DIR = REPO_ROOT / "data"


def seed_terms_for(market):
    """Category NAMES for a market's priority set (DEFAULT_IDS, shared with
    harvest.py) as the seed terms to pull suggestions for — plain human
    phrasing, not the kebab-case id, since that's what's actually typed."""
    ids = DEFAULT_IDS.get(market, [])
    if not ids:
        return []
    bank_path = DATA_DIR / MARKET_FILES[market]
    if not bank_path.exists():
        return []
    bank = json.loads(bank_path.read_text(encoding="utf-8"))
    by_id = {c["id"]: c for c in bank.get("categories", [])}
    return [by_id[i]["name"] for i in ids if i in by_id]


def pull_suggestions(term, gl, hl):
    """One request to Google's public (unofficial, no API key) autocomplete
    suggest endpoint. Returns a plain list of suggestion strings, or an
    empty list on any failure — never raises, this is best-effort external
    signal collection, not something that should ever break a run over one
    bad request."""
    params = urllib.parse.urlencode({"client": "firefox", "gl": gl, "hl": hl, "q": term})
    url = f"https://suggestqueries.google.com/complete/search?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())
            return data[1] if isinstance(data, list) and len(data) > 1 else []
    except Exception as e:  # noqa: BLE001
        print(f"  ! autocomplete pull failed for {term!r}: {e}")
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--market", required=True, choices=[*MARKET_FILES.keys(), "all"])
    ap.add_argument("--sleep", type=float, default=1.0, help="Seconds between requests (default 1.0).")
    ap.add_argument("--dry-run", action="store_true", help="Print what would run, call nothing, write nothing.")
    args = ap.parse_args()

    load_env()
    markets = list(MARKET_FILES.keys()) if args.market == "all" else [args.market]
    today = date.today().isoformat()
    have_supabase = False
    try:
        import os
        have_supabase = bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_KEY"))
    except Exception:  # noqa: BLE001
        have_supabase = False
    if not have_supabase and not args.dry_run:
        print("SUPABASE_URL/SUPABASE_SERVICE_KEY not set — results will print but not be saved.")

    total_pulled = total_saved = total_failed = 0
    for market in markets:
        terms = seed_terms_for(market)
        gl, hl = MARKET_GL.get(market, "US"), MARKET_HL.get(market, "en")
        print(f"\n=== {market} ({len(terms)} seed terms, gl={gl}, hl={hl}) ===")
        for term in terms:
            if args.dry_run:
                print(f"  [dry-run] would pull: {term!r}")
                continue
            suggestions = pull_suggestions(term, gl, hl)
            total_pulled += 1
            if suggestions is None:
                total_failed += 1
                log_event("query_failure", "autocomplete_pull", {"market": market, "term": term})
                time.sleep(args.sleep)
                continue
            print(f"  {term!r} -> {suggestions[:5]}{'...' if len(suggestions) > 5 else ''}")
            if have_supabase:
                try:
                    sb("POST", "autocomplete_pulls", payload={
                        "market": market, "seed_term": term, "suggestions": suggestions, "pulled_on": today,
                    })
                    total_saved += 1
                except Exception as e:  # noqa: BLE001
                    print(f"  ! save failed: {e}")
            time.sleep(args.sleep)

    print(f"\nDone. Pulled {total_pulled}, saved {total_saved}, failed {total_failed}.")


if __name__ == "__main__":
    main()
