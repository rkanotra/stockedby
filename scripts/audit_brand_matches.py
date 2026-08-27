#!/usr/bin/env python3
"""StockedBy brand-matching data audit — Part 1 item 7.

Finds reports affected by the brand-matching bug root-caused in
lib/scoring.js (the old normalize()/matches() stripped "&" and all
whitespace with nothing put back, so "Dot & Key" and a slug/guess-derived
"Dot and Key" normalized to two different, non-matching strings — a brand
could rank #1 with real mentions in its own leaders list while its saved
verdict read NOT STOCKED, 0 of N). Read-only by default; --rerun corrects
flagged verdicts from already-cached snapshot data (no new API spend, no
email sent — this script only ever prints/writes a CSV and, with --rerun,
patches the affected `reports` rows' own verdict).

Two flags, over every row in `reports`:
  a) normalize_brand(brand) matches a leader in that report's own leaders
     list (recomputed from report_json.engines, same tally
     lib/layerOne.js's buildTopBrands does), but the saved verdict is
     NOT STOCKED — the actual contradiction this whole task is about.
  b) brand_display_name contains & . ' - or / — not necessarily wrong, but
     worth a human glance since these are exactly the characters the old
     matcher mishandled.

Usage:
  python3 scripts/audit_brand_matches.py                 # print + write CSV
  python3 scripts/audit_brand_matches.py --rerun          # also correct (a)
  python3 scripts/audit_brand_matches.py --csv out.csv    # custom CSV path

Requires .env.local: SUPABASE_URL, SUPABASE_SERVICE_KEY.
Never sends email. Never calls an AI engine — --rerun reads only already-
collected `snapshots` rows, spending nothing new.
"""
import argparse
import csv
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harvest import load_env, sb  # shared Supabase REST client

ENGINE_ORDER = ["chatgpt", "gemini", "claude"]

# Same rule set as lib/scoring.js's normalizeBrand() — kept in sync by hand
# (this script is Python, that one's JS; there's no shared runtime between
# them). See that file's own comment for the full rationale.
BRAND_PUNCTUATION_RE = re.compile(r"[.'’\-,\"()/]")
BRAND_SUFFIXES = {"india", "pvt", "ltd", "inc", "co"}
FLAG_B_CHARS_RE = re.compile(r"[&.'\-/]")


def normalize_brand(s):
    if not s:
        return ""
    t = unicodedata.normalize("NFKD", s)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = t.lower().strip()
    t = t.replace("&", " and ")
    t = BRAND_PUNCTUATION_RE.sub(" ", t)
    words = [w for w in t.split() if w]
    while len(words) > 1 and words[-1] in BRAND_SUFFIXES:
        words.pop()
    return "".join(words)


def brand_matches(a, b):
    x, y = normalize_brand(a), normalize_brand(b)
    if not x or not y:
        return False
    return x in y or y in x


def leaders_for(report_json, limit=5):
    """Same tally as lib/layerOne.js's buildTopBrands: every engine's
    non-branded-routing recs, ranked by mention count."""
    tally = {}
    engines = (report_json or {}).get("engines") or {}
    for engine in ENGINE_ORDER:
        for row in engines.get(engine, []) or []:
            if row.get("archetype") == "branded-routing":
                continue
            for rec in row.get("recs", []) or []:
                label = rec.get("brand") or rec.get("product")
                key = normalize_brand(label)
                if not key:
                    continue
                entry = tally.setdefault(key, {"label": label, "count": 0})
                entry["count"] += 1
    return sorted(tally.values(), key=lambda e: -e["count"])[:limit]


def recompute_appearance(report_json, brand):
    """appearedIn/totalAttempted/bestRank from the report's OWN saved
    engines data (organic questions only), using the fixed matcher — the
    exact same shape lib/scoring.js's computeAppearanceSummary produces,
    just read from what's already saved rather than fresh liveRuns."""
    engines = (report_json or {}).get("engines") or {}
    appeared_in = 0
    best_rank = None
    total = 0
    seen_qids = set()
    for engine in ENGINE_ORDER:
        for row in engines.get(engine, []) or []:
            if row.get("archetype") == "branded-routing":
                continue
            qid = row.get("qid")
            if qid in seen_qids:
                continue  # count each organic question once, not once per engine
            seen_qids.add(qid)
            total += 1
            recs = row.get("recs", []) or []
            idx = next((i for i, r in enumerate(recs) if brand_matches(brand, r.get("brand")) or brand_matches(brand, r.get("product"))), None)
            if idx is not None:
                appeared_in += 1
                rank = idx + 1
                if best_rank is None or rank < best_rank:
                    best_rank = rank
    return appeared_in, total, best_rank


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rerun", action="store_true", help="Correct flagged (a) verdicts from cached snapshot data. No new API spend, no email.")
    ap.add_argument("--csv", default="brand_match_audit.csv", help="Output CSV path (default: brand_match_audit.csv in the cwd).")
    args = ap.parse_args()

    load_env()
    reports = sb("GET", "reports", params="?select=id,slug,brand,brand_display_name,market,category_id,category_slug,created_at,report_json&order=created_at.desc")
    leads = sb("GET", "leads", params="?select=email,brand,market")
    email_by_brand = {(normalize_brand(l.get("brand")), (l.get("market") or "").lower()): l.get("email") for l in leads if l.get("email")}

    flagged_a, flagged_b = [], []
    for r in reports:
        brand = r.get("brand_display_name") or r.get("brand") or ""
        rj = r.get("report_json") or {}
        old_verdict = (rj.get("report") or {}).get("verdict")
        leaders = leaders_for(rj)
        brand_in_leaders = any(brand_matches(brand, l["label"]) for l in leaders)

        if old_verdict == "NOT STOCKED" and brand_in_leaders:
            flagged_a.append({"row": r, "brand": brand, "leaders": leaders, "old_verdict": old_verdict})
        if FLAG_B_CHARS_RE.search(brand):
            flagged_b.append({"row": r, "brand": brand, "old_verdict": old_verdict})

    print(f"reports scanned: {len(reports)}")
    print(f"(a) verdict/leaders contradictions: {len(flagged_a)}")
    print(f"(b) brand names with & . ' - or /: {len(flagged_b)}")

    all_flagged = {f["row"]["slug"]: f for f in flagged_a}
    for f in flagged_b:
        all_flagged.setdefault(f["row"]["slug"], f)

    rows_out = []
    for slug, f in all_flagged.items():
        r = f["row"]
        email = email_by_brand.get((normalize_brand(f["brand"]), (r.get("market") or "").lower()), "")
        rows_out.append({
            "slug": slug,
            "brand": f["brand"],
            "email": email,
            "old_verdict": f["old_verdict"],
            "created_at": r.get("created_at"),
        })

    with open(args.csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["slug", "brand", "email", "old_verdict", "created_at"])
        writer.writeheader()
        writer.writerows(rows_out)
    print(f"\nwrote {len(rows_out)} flagged rows to {args.csv}")

    if not args.rerun:
        print("\n(pass --rerun to correct the (a) contradictions from cached snapshot data — no email is ever sent.)")
        return

    print(f"\n--rerun: correcting {len(flagged_a)} contradiction(s) from cached snapshots...")
    corrected = 0
    for f in flagged_a:
        r = f["row"]
        appeared_in, total, best_rank = recompute_appearance(r.get("report_json") or {}, f["brand"])
        if appeared_in == 0:
            print(f"  {r['slug']}: still 0 appearances even with the fixed matcher — not a matching bug, leaving as-is.")
            continue
        rate = appeared_in / total if total else 0
        new_verdict = "BARELY STOCKED" if rate < 0.5 else "ON THE SHELF"
        # Conservative: this script recomputes the appearance-based tier
        # correctly but does not re-derive the full share-of-voice engine
        # scores lib/scoring.js's computeReport uses to distinguish
        # OUTSHELVED from ON THE SHELF once appearance-rate >= 0.5 — a real
        # re-test (scripts/retest.py) is the source of truth for that finer
        # distinction. "ON THE SHELF" here is a floor, not a precise claim.
        rj = r.get("report_json") or {}
        rj.setdefault("report", {})
        rj["report"]["verdict"] = new_verdict
        rj["report"].setdefault("appearanceSummary", {})
        rj["report"]["appearanceSummary"]["appearedIn"] = appeared_in
        rj["report"]["appearanceSummary"]["totalAttempted"] = total
        rj["report"]["appearanceSummary"]["appearanceRate"] = rate
        rj["report"]["appearanceSummary"]["bestRank"] = best_rank
        try:
            sb("PATCH", "reports", payload={"report_json": rj}, params=f"?id=eq.{r['id']}")
            corrected += 1
            print(f"  {r['slug']}: NOT STOCKED -> {new_verdict} (appeared {appeared_in}/{total}, best rank #{best_rank})")
        except Exception as e:  # noqa: BLE001
            print(f"  {r['slug']}: patch failed — {e}")

    print(f"\ncorrected {corrected} of {len(flagged_a)} contradiction(s). No email was sent.")


if __name__ == "__main__":
    main()
