# CLAUDE.md — StockedBy

## What this is
StockedBy (stockedby.com) is a B2B SaaS platform for the AI & agentic commerce
economy, built on three pillars:
- **MEASURE** — AI visibility scoring across ChatGPT, Gemini, Claude, Grok
  (+ Perplexity, Copilot as harvested), competitive intelligence, checkout routing
  (brand-direct vs marketplace).
- **IMPROVE** — GEO tooling: fix plans, fix generation (JSON-LD, llms.txt,
  structured feeds), monitoring & re-test cadence.
- **PROTECT** (roadmap) — agent identity & trust, recommendation fraud detection,
  transaction risk for agentic checkout.

The free shelf test is the acquisition wedge; monitoring subscriptions are the
revenue; commerce trust infrastructure is the long-term moat. Regional focus
(India, UAE, Saudi Arabia) is the go-to-market advantage; Pakistan and SEA
are future expansion markets — do not mention them in user-facing copy until
launched.

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
   without snapshots show a "harvest in progress" pending state — never
   placeholder results. Live results come only from the Claude API call.
3. **Mobile-first.** Most visitors are founders on phones. Test at 375px first.
4. **RTL/Arabic support** is required for GCC market pages and Arabic queries.
5. **Design source of truth is docs/design/** (Claude Design exports).
   Marketing site is LIGHT theme (cream #FCFBF7, ink #16180F, tag yellow
   #FFC53D, brick #C2471F/#E8503A, greens #1E7A50/#2FA772). The APP/report
   screens are DARK theme (pine #0E1F18, card #14291F, tag yellow #FFC53D) so
   report screenshots pop on social. Fonts: Bricolage Grotesque (display),
   Archivo (body), IBM Plex Mono (labels/data) — load from Google Fonts, do NOT
   embed woff2 from the design export.
6. **Engines.** Test engines: claude, chatgpt, gemini, grok, perplexity,
   copilot. Claude runs live server-side; all others render from harvested
   snapshots in data/*.json. Query-bank GENERATION is Claude/ChatGPT only.
7. **Cost ceiling ≤ $0.05 per free test:** queries come from the bank (no
   generation call), web_search max_uses: 2 per query, model claude-sonnet-4-6,
   aux calls (sentiment) on haiku.
8. [DEFERRED — post-MVP] **Email gate before deep results**: verdict is free to see; full report
   requires work email + pain point. Consent language for DPDP (India) / PDPL
   (GCC). POST /api/lead → Resend (founder notification + merchant
   confirmation) + Supabase insert. See docs/api-lead-resend.ts.
9. [DEFERRED — post-MVP] **Rate limit**: 1 free test per email per category per
   month. (MVP: cap tests per IP per day at 10 in the API route to protect the
   API key budget.)
10. **Every new query-bank batch must pass** `python scripts/check_query_bank.py <file>`
    before merging into data/.

## Repo map
- docs/prototype-app.jsx — WORKING product logic (port, don't rewrite): Claude
  shopping-assistant prompt, telemetry extraction (server_tool_use →
  query fanout, web_search_tool_result → trusted sources), destination
  tracking, rank-weighted scoring (rank1=100…rank5=20), verdicts
  (ON THE SHELF / OUTSHELVED / NOT STOCKED), Share of AI Voice, sentiment,
  engine tabs, snapshot export. Contains the embedded compact bank format.
- docs/stockedby-data-kit.md — data schema, Harvest Prompt (§2), Query Bank
  Generation Prompt (§2b), category list, archetypes. The data contract.
- docs/website-structure-reference.html — section structure + copy reference
  (dark; superseded visually by docs/design/).
- docs/design/ — Claude Design exports = visual source of truth. NOTE: current
  hero export includes Perplexity/Copilot chips — keep them ONLY behind the
  data-gate rule (#2).
- docs/api-lead-resend.ts — lead endpoint reference implementation.
- data/india.json — accepted India query bank (ChatGPT-generated, 100 cats ×
  4 queries). Known flags: ~10 branded queries use spec word "route me"
  (reword on touch), verify leader brands "Modest Essentials" and
  "Nykaa"-as-brand entries.
- data/india-v2-grok.json — accepted Grok variant bank; use as -v2 phrasing
  variants for answer-stability metrics. Flag: relabel Hinglish problem-first
  language fields en→hi-en; "Local modest brands" leader needs a real name.
- data/gcc.json — accepted GCC batch 1 (Gemini, 10 categories). Batches 2–10
  pending.
- data/snapshots-*-seed.json — real harvested Claude snapshots (TWS earbuds,
  boAt routing, vitamin-C serum, GCC perfume) incl. insight notes.
- scripts/check_query_bank.py — acceptance gate for all bank batches.

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
5. [post-MVP] Real rate limiting, privacy policy, analytics, Arabic/RTL pass,
   Perplexity/Copilot snapshot harvest merge.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
