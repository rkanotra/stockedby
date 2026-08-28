#!/usr/bin/env python3
"""StockedBy weekly founder digest — self-improvement infrastructure.

Summarizes the last 7 days across five real Supabase signals, nothing
estimated:
  1. Custom-category requests ranked by count (what merchants ask for that
     the bank doesn't have yet — candidates for new bank categories).
  2. System-event patterns — query failures, sanity rejections, parse
     failures (supabase/migrations/0003's system_events table, written by
     lib/systemEvents.js and scripts/harvest.py / scripts/retest.py's own
     log_event()).
  3. Daily failure count — the same system_events rows, grouped by day, so
     a spike is visible even if the per-pattern breakdown above looks
     routine. Every failed question writes here regardless of what the
     merchant ends up seeing on screen (VerdictCard.js's quiet-line / no-
     verdict handling never suppresses the underlying log).
  4. New brand appearances — brands showing up in AI recommendations, per
     market+category+engine, for the first time ever this week (not just a
     brand that happens to rank well — a genuinely first sighting).
  5. Categories tested most — from `reports`, i.e. real merchant tests.

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


def daily_failure_counts(since):
    """Per-day count of every system_events row this week — item 11's
    "add daily failure count to the founder digest": a live-test question
    that fails still writes a query_failure/sanity_rejection/parse_failure
    row here regardless of what the merchant ends up seeing on screen
    (VerdictCard.js's quiet-line / no-verdict handling), so this is the
    real, complete failure volume, not just what was visibly retried."""
    rows = sb("GET", "system_events", params=f"?created_at=gte.{since}&select=created_at")
    counts = Counter((r.get("created_at") or "")[:10] for r in rows if r.get("created_at"))
    return [f"  {day}: {n}" for day, n in sorted(counts.items())]


def bounce_summary(since):
    """Weekly email_status counts from leads (supabase/migrations/0005) —
    our real verification layer since we deliberately skip OTP/email-
    verification codes (spec item 13: costs more leads than it saves at
    current volume). A rising bounced/complained count is the actual
    signal to watch, not a proxy metric."""
    rows = sb("GET", "leads", params=f"?created_at=gte.{since}&select=email_status")
    counts = Counter((r.get("email_status") or "sent") for r in rows)
    total = len(rows)
    if not total:
        return []
    lines = [f"  {counts.get(s, 0):>3}  {s}" for s in ("sent", "delivered", "bounced", "complained")]
    lines.append(f"  {total} leads total this week")
    return lines


def categories_tested_most(since):
    rows = sb("GET", "reports", params=f"?created_at=gte.{since}&select=category_id,market")
    counts = Counter((r.get("market"), r.get("category_id")) for r in rows if r.get("category_id"))
    return [f"  {n:>3}x  {market}/{cat}" for (market, cat), n in counts.most_common(10)]


def market_test_counts(since):
    """Market-expansion phase (hard rule 9's cost-control section) — same
    `reports` query categories_tested_most() above already runs, just
    counted by market alone so it's obvious which new markets (Qatar,
    Kuwait, Oman, Bahrain, and — since it's still a real market even
    though hidden from the UI — Pakistan) are getting genuine use versus
    sitting untested."""
    rows = sb("GET", "reports", params=f"?created_at=gte.{since}&select=market")
    counts = Counter(r.get("market") for r in rows if r.get("market"))
    return [f"  {n:>3}x  {market}" for market, n in counts.most_common()]


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
        section("Daily failure count", daily_failure_counts(since)),
        section("New brand appearances", new_brand_appearances(since)),
        section("Email bounce/complaint summary", bounce_summary(since)),
        section("Categories tested most", categories_tested_most(since)),
        section("Tests per market", market_test_counts(since)),
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
