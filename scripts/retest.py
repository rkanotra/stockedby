#!/usr/bin/env python3
"""StockedBy re-test & alert engine (feature: Prompt Tracking / monitoring).

What it does, per tracked brand (anyone who saved a report):
  1. Reads tracked (brand, email, market, category) combos from Supabase `reports` + `leads`.
  2. Records each brand's CURRENT position per engine from the latest snapshots,
     and its position from ~30 days ago (month-over-month).
  3. Re-harvests those categories fresh (chatgpt + gemini — same adapters as
     scripts/harvest.py; Claude is NEVER re-harvested here, only live per-test
     in the app itself, per CLAUDE.md hard rule 6).
  4. Writes new snapshot rows to Supabase (collected_on = today).
  5. Diffs old vs new position per engine, and this-month vs last-month; if
     anything changed, emails the merchant ("Your AI position changed") and
     sends you a digest with both diffs.

Run monthly (manually for now):  python3 scripts/retest.py
Dry run (no harvest, no email):  python3 scripts/retest.py --dry-run
Later: wire to a Vercel cron or a monthly reminder — the script is idempotent per day.

Requires .env.local: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY,
OPENAI_API_KEY, RESEND_API_KEY, FROM_EMAIL, FOUNDER_EMAIL.
Never fabricates: engines that fail are skipped and reported (and logged to
system_events — supabase/migrations/0003), not guessed.
"""
import json, os, sys, time, urllib.request
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harvest import load_env, sanity, sb, log_event, ENGINES as HARVEST_ENGINES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
MARKET_FILES = {"india": "india.json", "uae": "uae.json", "ksa": "ksa.json"}


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


def norm(s):
    return "".join(ch for ch in (s or "").lower() if ch.isalnum())


def brand_rank(recs, brand):
    b = norm(brand)
    for r in recs:
        if b and (b in norm(r.get("brand")) or norm(r.get("brand")) in b
                  or b in norm(r.get("product"))):
            return r.get("rank")
    return None


def positions_as_of(market, category_id, brand, as_of=None):
    """brand's best rank per engine from Supabase snapshots collected on or
    before `as_of` (default: no cutoff, i.e. the latest data available) —
    falls back to the bank files' inline seed snapshots (pre-Phase-4 data)
    when Supabase has nothing for this category yet."""
    params = f"?market=eq.{market}&category_id=eq.{category_id}"
    if as_of:
        params += f"&collected_on=lte.{as_of}"
    params += "&select=engine,qid,collected_on,snapshot_json&order=collected_on.desc"
    rows = sb("GET", "snapshots", params=params)
    pos, seen = {}, set()
    for row in rows:
        key = (row["engine"], row["qid"])
        if key in seen:
            continue
        seen.add(key)
        recs = (row.get("snapshot_json") or {}).get("recommendations", [])
        r = brand_rank(recs, brand)
        cur = pos.get(row["engine"])
        pos[row["engine"]] = r if cur is None else (min(cur, r) if r else cur)
    if not rows:  # fall back to bank files (pre-Phase-4 data)
        path = os.path.join(DATA, MARKET_FILES.get(market.lower(), ""))
        if os.path.exists(path):
            bank = json.load(open(path, encoding="utf-8"))
            for c in bank.get("categories", []):
                if c.get("id") != category_id:
                    continue
                for s in c.get("snapshots", []):
                    r = brand_rank(s.get("recommendations", []), brand)
                    cur = pos.get(s["engine"])
                    pos[s["engine"]] = r if cur is None else (min(cur, r) if r else cur)
    return pos  # {engine: best_rank_or_None}


def build_harvesters():
    """Construct each harvest.py engine adapter once, skipping (not
    crashing on) any engine whose API key isn't set — same graceful-skip
    principle as harvest.py's own CLI ("never fabricate — skip loudly")."""
    harvesters = {}
    for engine, Harvester in HARVEST_ENGINES.items():
        try:
            harvesters[engine] = Harvester()
        except SystemExit as e:
            print(f"  [{engine}] unavailable: {e}")
    return harvesters


def reharvest(harvesters, market, category_id, today):
    """fresh run of the category's queries on available engines; writes to
    Supabase. Claude is deliberately not part of this — see module docstring."""
    path = os.path.join(DATA, MARKET_FILES[market.lower()])
    bank = json.load(open(path, encoding="utf-8"))
    cat = next((c for c in bank["categories"] if c["id"] == category_id), None)
    if not cat:
        return {}, ["category not in bank"]
    fresh, problems = {}, []
    for engine, harvester in harvesters.items():
        engine_best = {}
        for q in cat.get("queries", []):
            try:
                recs, sources = harvester.ask(q["text"])
            except Exception as e:  # noqa: BLE001
                problems.append(f"{engine}/{q['qid']}: {e}")
                log_event("query_failure", "retest", {
                    "engine": engine, "market": market, "category": category_id,
                    "qid": q["qid"], "error": str(e)[:300],
                })
                continue
            if sanity(recs):
                problems.append(f"{engine}/{q['qid']}: rejected (empty/garbage recommendations)")
                log_event("sanity_rejection", "retest", {
                    "engine": engine, "market": market, "category": category_id,
                    "qid": q["qid"], "recs": recs,
                })
                continue
            sb("POST", "snapshots", payload={
                "market": market, "category_id": category_id, "qid": q["qid"],
                "engine": engine, "collected_on": today,
                "snapshot_json": {"recommendations": recs, "sources_cited": sources},
            })
            engine_best[q["qid"]] = recs
            time.sleep(5)
        if engine_best:
            fresh[engine] = engine_best
    return fresh, problems


def fresh_rank(fresh_engine, brand):
    best = None
    for recs in fresh_engine.values():
        r = brand_rank(recs, brand)
        if r and (best is None or r < best):
            best = r
    return best


def describe(engine, old, new):
    e = engine.capitalize() if engine != "chatgpt" else "ChatGPT"
    if old is None and new is not None:
        return f"Good news — {e} now recommends you (position #{new})."
    if old is not None and new is None:
        return f"{e} stopped recommending you. You were #{old}."
    if old != new:
        arrow = "up" if new < old else "down"
        return f"{e}: you moved {arrow}, #{old} → #{new}."
    return None


def describe_month(engine, month_ago, new):
    """Same shape as describe(), phrased for the ~30-day comparison instead
    of today's before-vs-after — a separate line so the digest can show
    both without conflating a same-day re-run with real month-over-month
    movement."""
    e = engine.capitalize() if engine != "chatgpt" else "ChatGPT"
    if month_ago is None and new is not None:
        return f"{e}: new this month (position #{new})."
    if month_ago is not None and new is None:
        return f"{e}: no longer appearing (was #{month_ago} a month ago)."
    if month_ago is not None and new is not None and month_ago != new:
        arrow = "up" if new < month_ago else "down"
        return f"{e}: {arrow} month-over-month, #{month_ago} → #{new}."
    return None


def main():
    dry = "--dry-run" in sys.argv
    load_env()
    today = date.today().isoformat()
    month_ago = (date.today() - timedelta(days=30)).isoformat()
    reports = sb("GET", "reports",
                 params="?select=brand,market,category_id,slug,created_at&order=created_at.desc")
    leads = sb("GET", "leads", params="?select=email,brand,market,category")
    email_by_brand = { (norm(l.get("brand")), (l.get("market") or "").lower()): l.get("email")
                       for l in leads if l.get("email") }
    tracked, seen = [], set()
    for r in reports:
        key = (norm(r.get("brand")), (r.get("market") or "").lower(), r.get("category_id"))
        if key in seen:
            continue
        seen.add(key)
        tracked.append(r)
    print(f"tracked brand/category combos: {len(tracked)} | dry-run: {dry}")

    harvesters = {} if dry else build_harvesters()

    digest = []
    for t in tracked:
        market, cat, brand = t["market"], t["category_id"], t["brand"]
        before = positions_as_of(market, cat, brand)
        before_month = positions_as_of(market, cat, brand, as_of=month_ago)
        print(f"\n{brand} · {market}/{cat} · before: {before} · a month ago: {before_month}")
        if dry:
            continue
        fresh, problems = reharvest(harvesters, market, cat, today)
        changes, month_changes = [], []
        for engine, qmap in fresh.items():
            new_rank = fresh_rank(qmap, brand)
            msg = describe(engine, before.get(engine), new_rank)
            if msg:
                changes.append(msg)
            mmsg = describe_month(engine, before_month.get(engine), new_rank)
            if mmsg:
                month_changes.append(mmsg)
        for p in problems[:3]:
            print("  ⚠", p)
        if not changes and not month_changes:
            print("  no change"); continue
        if changes:
            print("  CHANGES:", changes)
        if month_changes:
            print("  MONTH-OVER-MONTH:", month_changes)
        email = email_by_brand.get((norm(brand), market.lower()))
        body_lines = [f"Hi,\n\nWe re-checked what AI apps say about {brand} today.\n"]
        if changes:
            body_lines.append("Since last check:\n" + "\n".join("• " + c for c in changes))
        if month_changes:
            body_lines.append("Over the last month:\n" + "\n".join("• " + c for c in month_changes))
        body_lines.append(
            "\nSee your latest report: https://stockedby.com/test"
            "\n\nReply to this email if you want help fixing it.\n— StockedBy"
        )
        body = "\n\n".join(body_lines)
        if email:
            try:
                send_email(email, f"{brand}: your AI position changed", body)
                print("  emailed", email)
            except Exception as e:
                print("  email failed:", e)
        entry = f"{brand} ({market}/{cat}):"
        if changes:
            entry += " " + " | ".join(changes)
        if month_changes:
            entry += " || MoM: " + " | ".join(month_changes)
        digest.append(entry)

    if digest and not dry:
        try:
            send_email(os.environ["FOUNDER_EMAIL"], f"StockedBy re-test digest · {today}",
                       "\n".join(digest))
        except Exception as e:
            print("digest email failed:", e)
    print("\ndone.")


if __name__ == "__main__":
    main()
