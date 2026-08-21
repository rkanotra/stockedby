# CLAUDE.md — StockedBy

## What this is
StockedBy (stockedby.com) is a B2B SaaS platform for the AI & agentic commerce
economy, built on three pillars:
- **MEASURE** — AI visibility scoring across ChatGPT, Gemini and Claude,
  competitive intelligence, checkout routing (brand-direct vs marketplace).
- **IMPROVE** — GEO tooling: fix plans, fix generation (JSON-LD, llms.txt,
  structured feeds), monitoring & re-test cadence.
- **PROTECT** — agent identity & trust and transaction risk are still
  roadmap, but the free Agent Readiness Audit (/audit) is live: checks
  whether a merchant's own site can be discovered, read and transacted
  with by AI agents (robots.txt, /llms.txt, UCP/ACP manifests, Product
  JSON-LD). Recommendation fraud detection is still roadmap too.

The free shelf test is the acquisition wedge; monitoring subscriptions are the
revenue; commerce trust infrastructure is the long-term moat. Markets:
India, UAE, KSA (Saudi Arabia) — the go-to-market advantage. Pakistan and
SEA are unannounced future expansion markets — do not mention them in
user-facing copy until launched.

Current phase: **MVP sprint — domain-live test build**
MVP scope (build now): landing page + full test flow + /api/test with
ANTHROPIC_API_KEY only. NO email gate, NO Resend, NO Supabase, NO rate
limiting yet — full report shows without email. Lead form renders but only
console-logs/no-ops with a "coming soon" toast. Email stack (Zoho mailboxes +
Resend/Supabase gate) is DEFERRED to post-MVP; keep /api/lead as a stub.

## Hard rules
1. **API keys server-side only.** ANTHROPIC_API_KEY, RESEND_API_KEY, SUPABASE
   keys live in Vercel env vars. Never in client code, never committed.
2. **Never fabricate data.** Engine tabs render only from real data. Engines
   without snapshots show a "data coming soon" pending state — never
   placeholder results. Live results come only from the Claude API call. A
   failed live query is never silently dropped from a denominator either —
   the report states the true count of questions attempted vs. completed.
   Sentiment is grounded ONLY in this test's own verbatim data (>=2 real
   mentions of the brand, or it isn't shown) — never the model's outside
   knowledge about the brand.
3. **Mobile-first.** Most visitors are founders on phones. Test at 375px first.
4. **RTL/Arabic support** is required for UAE/KSA market pages and Arabic queries.
5. **Design source of truth is docs/design/** (Claude Design exports).
   Marketing site is LIGHT theme (cream #FCFBF7, ink #16180F, tag yellow
   #FFC53D, brick #C2471F/#E8503A, greens #1E7A50/#2FA772). The APP/report
   screens are DARK theme (pine #0E1F18, card #14291F, tag yellow #FFC53D) so
   report screenshots pop on social. Fonts: Bricolage Grotesque (display),
   Archivo (body), IBM Plex Mono (labels/data) — load from Google Fonts, do NOT
   embed woff2 from the design export. Favicon: done — app/icon.svg (tag-yellow
   rounded mark, "by" in ink, matches the nav logo) + app/apple-icon.png.
6. **Engines.** Product scope is exactly three, in this canonical order:
   chatgpt, gemini, claude — defined once as ENGINE_ORDER in lib/scoring.js;
   every engine tab, scorebox, and iteration derives from it, never a
   hand-written list. Claude runs live server-side; ChatGPT and Gemini
   render from harvested snapshots in data/*.json (API-harvested via
   scripts/harvest.py, or manually per docs/stockedby-data-kit.md §2).
   Grok, Perplexity and Copilot are OUT OF PRODUCT SCOPE — not deferred, not
   "coming soon": no UI surface should name them, and no new code should add
   them back without this rule changing first. The data layer stays
   tolerant of them though — an old grok/perplexity/copilot snapshot
   sitting in a bank file is silently ignored (never matched by
   ENGINE_ORDER), not an error. Query-bank GENERATION is Claude/ChatGPT only.
7. **Cost ceiling ≤ $0.05 per free test:** queries come from the bank (no
   generation call), web_search max_uses: 2 per query, model claude-sonnet-4-6,
   aux calls (sentiment) on haiku.
8. [DEFERRED — post-MVP] **Email gate before deep results**: verdict is free to see; full report
   requires work email + pain point. Consent language for DPDP (India) / PDPL
   (UAE, KSA). POST /api/lead → Resend (founder notification + merchant
   confirmation) + Supabase insert. See docs/api-lead-resend.ts.
9. [DEFERRED — post-MVP] **Rate limit**: 1 free test per email per category per
   month. (MVP: cap tests per IP per day at 10 in the API route to protect the
   API key budget.)
10. **Every new query-bank batch must pass** `python scripts/check_query_bank.py <file>`
    before merging into data/.
11. **The audit's domain fetches are an SSRF surface** — any fetch of a
    merchant-entered domain (or a redirect target it points to) must go
    through lib/audit/ssrfGuard.js's assertPublicHostname() first. Never add
    a raw `fetch()` to app/api/audit/ that bypasses it, and never switch
    fetchWithTimeout back to `redirect: "follow"` — each hop needs its own
    hostname check.

## Repo map
- docs/prototype-app.jsx — WORKING product logic (port, don't rewrite): Claude
  shopping-assistant prompt, telemetry extraction (server_tool_use →
  query fanout, web_search_tool_result → trusted sources), destination
  tracking, rank-weighted scoring (rank1=100…rank5=20), Share of AI Voice,
  sentiment, engine tabs, snapshot export. Contains the embedded compact bank
  format. Verdict tiers since the report overhaul (superseding the
  prototype's 3): NOT STOCKED (never appeared) / BARELY STOCKED (appeared,
  but in under half of completed questions) / OUTSHELVED (appears often
  enough but ranks below the rival average) / ON THE SHELF.
- docs/stockedby-data-kit.md — data schema, Harvest Prompt (§2), Query Bank
  Generation Prompt (§2b), category list, archetypes. The data contract.
- docs/website-structure-reference.html — section structure + copy reference
  (dark; superseded visually by docs/design/).
- docs/design/ — Claude Design exports = visual source of truth. NOTE: the
  hero export itself still has Perplexity/Copilot chips from before hard
  rule 6 narrowed product scope to chatgpt/gemini/claude — that's a stale
  historical export, not a rule override; components/Hero.js (the live
  component) has already dropped them and is the one that matters.
- docs/api-lead-resend.ts — lead endpoint reference implementation.
- data/india.json — accepted India query bank (ChatGPT-generated, 100 cats ×
  4 queries). Flags resolved: "route me" phrasing reworded; leader brands
  verified ("Modest Essentials", "Nykaa Cosmetics").
- data/india-v2-grok.json — accepted Grok-generated variant bank; "Grok"
  here is only the phrasing-generation source for these -v2 query variants
  (answer-stability metrics), not a claim that Grok is a tested/displayed
  engine — it isn't, and never was wired into lib/bank.js. Flags resolved:
  Hinglish problem-first language fields relabeled; "Local modest brands"
  leader replaced with "Shiddat".
- data/uae.json — accepted UAE query bank (50 categories). Harvested Claude
  snapshots ship inline in the bank file (no separate seed file).
- data/ksa.json — accepted KSA query bank (47 categories). No snapshots
  harvested yet — engine tabs show "data coming soon" until harvested.
- data/snapshots-india-seed.json — real harvested Claude snapshots (TWS
  earbuds, boAt routing, vitamin-C serum) for India, merged into india.json's
  categories by lib/bank.js.
- scripts/check_query_bank.py — acceptance gate for all bank batches.
- lib/audit/ — Agent Readiness Audit (app/api/audit, app/audit,
  components/audit/): ssrfGuard.js (mandatory hostname check, see hard
  rule 11), fetchWithTimeout.js (SSRF-safe manual redirect following),
  robots.js, jsonld.js, platform.js (Shopify/WooCommerce/Magento/Salla/
  Zid fingerprints + Stripe.js detection), productDiscovery.js (sitemap
  or on-page link), score.js (checks → Discoverable/Readable/
  Transactable layer scores → verdict, platform-aware fix lines).

## Build phases (one per session, commit after each)
1. Scaffold Next.js (App Router) + landing page from docs/design/ (hero
   pixel-exact; structural sections from docs/website-structure-reference.html
   where design export pending) + deploy to Vercel + point stockedby.com.
2. /api/test: port Claude call + telemetry + scoring server-side
   (ANTHROPIC_API_KEY env var); serve bank queries/snapshots from data/;
   simple per-IP daily cap.
3. Test-flow UI: category picker → editable queries → live run → report
   (all modules from prototype) — dark theme. Lead form = visual stub.
--- MVP ends here: stockedby.com live and testable ---
4. [post-MVP] Zoho mailboxes + /api/lead (Resend + Supabase) + email gate +
   consent (DPDP/PDPL).
5. [post-MVP] Real rate limiting, privacy policy, analytics, Arabic/RTL pass.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
