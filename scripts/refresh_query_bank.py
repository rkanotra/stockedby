#!/usr/bin/env python3
"""StockedBy query-bank refresh job (SKELETON — market-expansion phase).

################################################################################
# WARNING: this script must NEVER auto-publish a bank. It only ever produces
# a CANDIDATE file + a drift report, then stops. A human (the founder) must
# review the drift report before any bank version changes. Do not add
# auto-publish logic to this script without that review step staying intact.
################################################################################

Takes a market, pulls the freshness signals collected since the bank's own
generatedAt (query_edits — native-speaker corrections from live tests;
autocomplete_pulls — Google's own drift signal, scripts/autocomplete_pull.py),
and is MEANT to feed them into docs/stockedby-data-kit.md's section 2b Query
Bank Generation Prompt to produce a candidate replacement bank, then validate
it (scripts/check_query_bank.py) and write a drift report comparing it
against the currently-published bank. That comparison step is fully
implemented below. The actual "call an LLM with the assembled context and
get a candidate bank back" step is NOT implemented yet — see
generate_candidate_bank()'s docstring — this is deliberately a skeleton, not
a working refresh loop, per this pass's own scope.

Usage:
  python scripts/refresh_query_bank.py --market Qatar
"""
import argparse
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest import load_env, sb, MARKET_FILES  # noqa: E402

DATA_DIR = REPO_ROOT / "data"


def load_bank(market):
    path = DATA_DIR / MARKET_FILES[market]
    return json.loads(path.read_text(encoding="utf-8"))


def fetch_signals(market):
    """Everything accumulated for this market since its bank was last
    generated: every query_edits row (native-speaker corrections) and the
    most recent autocomplete_pulls row per seed term (external drift).
    Returns ([], []) — not an error — if Supabase isn't configured; this is
    read-only signal collection, same graceful-degradation pattern as
    every other Supabase read in this repo."""
    import os
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        print("SUPABASE_URL/SUPABASE_SERVICE_KEY not set — no signals to load.")
        return [], []
    edits = sb("GET", "query_edits", params=f"?market=eq.{market}&select=category,original_text,edited_text,created_at&order=created_at.desc")
    pulls = sb("GET", "autocomplete_pulls", params=f"?market=eq.{market}&select=seed_term,suggestions,pulled_on&order=pulled_on.desc")
    # Only the most recent pull per seed term — the API returns every
    # historical pull, this collapses it to "latest known drift" per term.
    latest_by_term = {}
    for p in pulls:
        if p["seed_term"] not in latest_by_term:
            latest_by_term[p["seed_term"]] = p
    return edits, list(latest_by_term.values())


def generate_candidate_bank(market, current_bank, edits, autocomplete):
    """NOT IMPLEMENTED — the real refresh step.

    This is meant to: assemble docs/stockedby-data-kit.md's section 2b Query
    Bank Generation Prompt, batched 8-10 categories at a time (per that
    prompt's own hard rule against template collapse at larger scale),
    informed by `edits` (what real users corrected prefilled questions to
    — the strongest signal for "the bank's phrasing doesn't match how
    people actually type here") and `autocomplete` (Google's own
    suggestions for each category's seed term, as an external check on
    whether the bank's category coverage itself is drifting), call an LLM
    with that prompt, and parse its JSON response into a candidate bank
    shaped exactly like the real ones in data/*.json.

    Deliberately not implemented in this pass (brief: "skeleton only") —
    doing this well needs the same kind of direct, careful, one-category-
    at-a-time authoring the original banks got (see data/qatar.json,
    data/kuwait.json, data/pakistan.json's own generation), not a
    mechanical prompt-and-parse loop. Raises NotImplementedError so a
    caller can't accidentally treat a half-built refresh as a real one.
    """
    raise NotImplementedError(
        "generate_candidate_bank() is a documented stub — see its own docstring. "
        "The data-loading and drift-report steps around it are real and tested; "
        "wiring in the actual LLM call is deliberately follow-up work."
    )


def language_mix(bank):
    counts = Counter()
    for c in bank.get("categories", []):
        for q in c.get("queries", []):
            counts[q.get("language", "unknown")] += 1
    return dict(counts)


def budget_numbers(bank):
    nums = []
    for c in bank.get("categories", []):
        for q in c.get("queries", []):
            if q.get("archetype") != "category-discovery" or q.get("language") != "en":
                continue
            nums.extend(int(n.replace(",", "")) for n in re.findall(r"\d[\d,]{1,6}", q.get("text", "")))
    return nums


def write_drift_report(market, old_bank, candidate_bank, out_path):
    """Fully implemented, independent of generate_candidate_bank() — takes
    any two bank-shaped dicts and writes a human-readable comparison.
    Language-mix delta, budget-number delta (mean, so a founder can
    eyeball "did prices drift up/down"), and every category present in
    BOTH banks gets its discovery-en query shown old-vs-new side by side
    so a reviewer can actually judge tone/naturalness, not just stats."""
    old_langs, new_langs = language_mix(old_bank), language_mix(candidate_bank)
    old_budgets, new_budgets = budget_numbers(old_bank), budget_numbers(candidate_bank)
    old_by_id = {c["id"]: c for c in old_bank.get("categories", [])}
    new_by_id = {c["id"]: c for c in candidate_bank.get("categories", [])}

    lines = [
        f"# Query bank drift report — {market}",
        f"Generated {date.today().isoformat()}. Candidate bank has NOT been published — see the",
        "warning at the top of this script. Review this, then a human decides whether to bump",
        "the bank's version and publish, per docs/stockedby-data-kit.md.",
        "",
        "## Language mix",
        f"Old: {old_langs}",
        f"New: {new_langs}",
        "",
        "## Budget numbers (category-discovery, English queries)",
        f"Old: n={len(old_budgets)}, mean={round(sum(old_budgets) / len(old_budgets), 1) if old_budgets else 'n/a'}",
        f"New: n={len(new_budgets)}, mean={round(sum(new_budgets) / len(new_budgets), 1) if new_budgets else 'n/a'}",
        "",
        "## Sample questions, old vs new (categories present in both)",
    ]
    for cid in sorted(set(old_by_id) & set(new_by_id)):
        old_q = next((q["text"] for q in old_by_id[cid].get("queries", []) if q.get("archetype") == "category-discovery" and q.get("language") == "en"), None)
        new_q = next((q["text"] for q in new_by_id[cid].get("queries", []) if q.get("archetype") == "category-discovery" and q.get("language") == "en"), None)
        if old_q or new_q:
            lines += [f"### {cid}", f"- old: {old_q or '(missing)'}", f"- new: {new_q or '(missing)'}", ""]

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Drift report written to {out_path}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--market", required=True, choices=list(MARKET_FILES.keys()))
    args = ap.parse_args()

    load_env()
    print(f"=== Refreshing {args.market} ===")
    current_bank = load_bank(args.market)
    edits, autocomplete = fetch_signals(args.market)
    print(f"{len(edits)} query edits, {len(autocomplete)} autocomplete pulls loaded.")

    try:
        candidate_bank = generate_candidate_bank(args.market, current_bank, edits, autocomplete)
    except NotImplementedError as e:
        print(f"\nStopped: {e}")
        print("No candidate bank generated, nothing written, nothing published.")
        return

    # Unreachable until generate_candidate_bank() is implemented — kept so
    # the validation + drift-report wiring is genuinely exercised the
    # moment that stub is filled in, not written blind.
    out_dir = REPO_ROOT / "scratch"
    out_dir.mkdir(exist_ok=True)
    candidate_path = out_dir / f"{args.market.lower()}-candidate.json"
    candidate_path.write_text(json.dumps(candidate_bank, ensure_ascii=False, indent=2), encoding="utf-8")

    import subprocess
    result = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts" / "check_query_bank.py"), str(candidate_path), "--market", args.market],
        capture_output=True, text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print("Candidate FAILED validation — not writing a drift report. Fix the candidate and re-run.")
        return

    write_drift_report(args.market, current_bank, candidate_bank, out_dir / f"{args.market.lower()}-drift-report.md")
    print("\nSTOPPED — human review required before this becomes a real version. Never auto-published.")


if __name__ == "__main__":
    main()
