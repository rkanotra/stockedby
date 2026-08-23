#!/usr/bin/env python3
"""StockedBy weekly founder digest — self-improvement infrastructure.

Summarizes the last 7 days across four real Supabase signals, nothing
estimated:
  1. Custom-category requests ranked by count (what merchants ask for that
     the bank doesn't have yet — candidates for new bank categories).
  2. System-event patterns — query failures, sanity rejections, parse
     failures (supabase/migrations/0003's system_events table, written by
     lib/systemEvents.js and scripts/harvest.py / scripts/retest.py's own
     log_event()).
  3. New brand appearances — brands showing up in AI recommendations, per
     market+category+engine, for the first time ever this week (not just a
     brand that happens to rank well — a genuinely first sighting).
  4. Categories tested most — from `reports`, i.e. real merchant tests.

Run weekly (manually for now):  python3 scripts/founder_digest.py
Dry run (print, don't email):   python3 scripts/founder_digest.py --dry-run
Later: wire to a Vercel cron alongside scripts/retest.py.

Requires .env.local: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY,
FROM_EMAIL, FOUNDER_EMAIL.
"""
import json, os, sys, urllib.request
from collections import Counter
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harvest import load_env, sb  # shared Supabase REST client


def send_email(to, subject, text):
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps({
            "from": f"StockedBy <{os.environ['FROM_EMAIL']}>",
            "to": [to], "subject": subject, "text": text,
        }).encode(),
        headers={"Authorization": "Bearer " + os.environ["RESEND_API_KEY"],
                 "Content-Type": "application/json"},
        method="POST")
    urllib.request.urlopen(req, timeout=30)


def section(title, lines):
    if not lines:
        return f"{title}\n(nothing this week)"
    return title + "\n" + "\n".join(lines)


def custom_category_requests(since):
    rows = sb("GET", "custom_category_requests",
              params=f"?created_at=gte.{since}&select=category_text,market")
    counts = Counter((r.get("category_text") or "").strip().lower() for r in rows if r.get("category_text"))
    return [f"  {n:>3}x  {name}" for name, n in counts.most_common(10)]


def system_event_patterns(since):
    rows = sb("GET", "system_events",
              params=f"?created_at=gte.{since}&select=event_type,source")
    counts = Counter((r.get("event_type"), r.get("source")) for r in rows)
    lines = [f"  {n:>3}x  {etype} ({source})" for (etype, source), n in counts.most_common(10)]
    if lines:
        lines.insert(0, f"  {len(rows)} total events logged")
    return lines


def categories_tested_most(since):
    rows = sb("GET", "reports", params=f"?created_at=gte.{since}&select=category_id,market")
    counts = Counter((r.get("market"), r.get("category_id")) for r in rows if r.get("category_id"))
    return [f"  {n:>3}x  {market}/{cat}" for (market, cat), n in counts.most_common(10)]


def new_brand_appearances(since):
    """Brands seen in this week's snapshot recommendations that were never
    seen (by market+category+engine) before `since` — pulls every snapshot
    row's recommendations, before and after the cutoff, and diffs the two
    brand-key sets. Fine at the data volume this table has today; if
    snapshots grows much larger this should move to a real SQL query
    instead of pulling every row into Python."""
    recent = sb("GET", "snapshots",
                params=f"?collected_on=gte.{since}&select=market,category_id,engine,snapshot_json")
    older = sb("GET", "snapshots",
               params=f"?collected_on=lt.{since}&select=market,category_id,engine,snapshot_json")

    def brand_keys(rows):
        keys = set()
        for row in rows:
            recs = (row.get("snapshot_json") or {}).get("recommendations", [])
            for rec in recs:
                name = (rec.get("brand") or "").strip()
                if not name:
                    continue
                keys.add((row["market"], row["category_id"], row["engine"], name.lower()))
        return keys

    new = sorted(brand_keys(recent) - brand_keys(older))
    return [f"  {market}/{cat} ({engine}): {brand}" for market, cat, engine, brand in new[:15]]


def main():
    dry = "--dry-run" in sys.argv
    load_env()
    since = (date.today() - timedelta(days=7)).isoformat()

    body = f"StockedBy weekly digest — since {since}\n\n" + "\n\n".join([
        section("Custom-category requests (ranked)", custom_category_requests(since)),
        section("System-event patterns", system_event_patterns(since)),
        section("New brand appearances", new_brand_appearances(since)),
        section("Categories tested most", categories_tested_most(since)),
    ])
    print(body)

    if not dry:
        try:
            send_email(os.environ["FOUNDER_EMAIL"], f"StockedBy weekly digest · {date.today().isoformat()}", body)
            print("\nemailed founder digest.")
        except Exception as e:
            print("\ndigest email failed:", e)


if __name__ == "__main__":
    main()
