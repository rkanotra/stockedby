#!/usr/bin/env python3
"""StockedBy query-bank acceptance checker.

Usage: python scripts/check_query_bank.py data/india.json [--market India]

Gates every generated batch against the failure modes observed across
ChatGPT / Gemini / Perplexity / Grok generation runs (Aug 2026):
  1. template collapse (repeated sentence stamps)
  2. unfilled placeholders / empty or fake leader brands
  3. label leakage (catalog labels pasted into query text, incl. "X or Y" softening)
  4. market mixing (wrong currency for market)
  5. fake/rotated problem-first queries (duplicates, category name present)
  6. budget gaming (missing numbers, or a small set of values cycled evenly)
Exit code 0 = pass, 1 = fail.
"""
import json, re, sys, collections

CURRENCY = {
    "India": (r"₹|\bINR\b|rupee", r"AED|\bPKR\b|\bIDR\b|\bTHB\b|\bSAR\b"),
    "GCC": (r"AED|\bSAR\b|درهم|ريال", r"₹|\bINR\b|\bPKR\b|\bIDR\b"),
    "Pakistan": (r"\bPKR\b|\bRs\.?\b|rupay", r"₹(?!\s*\d)|AED|\bIDR\b"),
}

def fail(msgs):
    print("\n== RESULT: FAIL ==")
    for m in msgs: print(" ✗", m)
    sys.exit(1)

def main():
    path = sys.argv[1]
    d = json.load(open(path, encoding="utf-8"))
    market = d.get("market") or (sys.argv[sys.argv.index("--market")+1] if "--market" in sys.argv else "India")
    cats = [c for c in d.get("categories", []) if c.get("queries")]
    errs, warns = [], []

    texts, opens4 = [], collections.Counter()
    problems, budgets = [], collections.Counter()
    n_branded = n_discovery = 0

    for c in cats:
        label_parts = [p.strip().lower().split("(")[0].strip() for p in re.split(r"[/&]", c.get("name", "")) if p.strip()]
        for q in c["queries"]:
            t = q.get("text", "").strip()
            a = q.get("archetype", "")
            texts.append(t)
            opens4[" ".join(t.split()[:4]).lower()] += 1

            if "{" in t or "}" in t:
                errs.append(f"placeholder in query: {t[:70]}")
            if re.search(r"\(.*priorit.*\)", t, re.I) or " / " in t:
                errs.append(f"label leak: {t[:70]}")
            if len(label_parts) >= 2 and all(p in t.lower() for p in label_parts) and " or " in t.lower():
                warns.append(f"soft label leak ('X or Y'): {t[:70]}")

            if a == "branded-routing":
                n_branded += 1
                lb = (q.get("leader_brand") or "").strip()
                if not lb:
                    errs.append(f"empty leader_brand: {t[:60]}")
                elif re.search(r"local|leading|market[- ]leading|top|popular|generic|brands?$", lb, re.I) and len(lb.split()) > 1:
                    warns.append(f"suspicious leader_brand '{lb}' ({c.get('name')})")
                if re.search(r"\broute me\b", t, re.I):
                    warns.append(f"spec-vocab leak 'route me': {t[:60]}")

            if a == "category-discovery":
                n_discovery += 1
                if q.get("language") == "en" and not re.search(r"\d", t):
                    errs.append(f"discovery query missing budget/number: {t[:60]}")
                for m in re.findall(r"[₹$]?\s?([\d,]{3,7})\s*(?:AED|PKR|INR)?", t):
                    budgets[m.replace(",", "")] += 1

            if a == "problem-first":
                problems.append((c.get("name", ""), t))
                cat_head = label_parts[0] if label_parts else ""
                if cat_head and len(cat_head) > 3 and cat_head in t.lower():
                    warns.append(f"problem-first names its category '{cat_head}': {t[:60]}")

            good, bad = CURRENCY.get(market, (None, None))
            if bad and re.search(bad, t):
                errs.append(f"wrong currency for {market}: {t[:60]}")

    # template collapse: any 4-word opening covering >8% of all queries
    n = max(1, len(texts))
    for stamp, cnt in opens4.most_common(5):
        if cnt >= 5 and cnt / n > 0.08:
            errs.append(f"template collapse: opening '{stamp}' used {cnt}× ({cnt*100//n}% of bank)")
        elif cnt >= 5:
            warns.append(f"repeated opening '{stamp}' ×{cnt}")

    # problem-first uniqueness
    ptexts = [t for _, t in problems]
    if ptexts:
        uniq = len(set(ptexts)) / len(ptexts)
        if uniq < 0.9:
            errs.append(f"problem-first duplication: only {len(set(ptexts))} unique of {len(ptexts)}")

    # budget cycling: same value covering >20% of discovery budgets (needs enough samples)
    if budgets and sum(budgets.values()) >= 15:
        top_val, top_cnt = budgets.most_common(1)[0]
        if top_cnt / max(1, sum(budgets.values())) > 0.20:
            errs.append(f"budget cycling: value {top_val} used {top_cnt}× ({top_cnt*100//sum(budgets.values())}% of all budgets)")

    print(f"bank: {path} | market: {market} | categories: {len(cats)} | queries: {len(texts)}")
    print(f"branded-routing: {n_branded} | discovery: {n_discovery} | problem-first: {len(problems)}")
    if warns:
        print(f"\n-- {len(warns)} warnings (review, non-blocking) --")
        for w in warns[:20]: print(" ⚠", w)
        if len(warns) > 20: print(f"   … +{len(warns)-20} more")
    if errs:
        fail(errs[:30])
    print("\n== RESULT: PASS ==")

if __name__ == "__main__":
    main()
