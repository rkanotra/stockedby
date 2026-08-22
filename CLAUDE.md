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

**Site philosophy: the homepage is the door, the report is the product,
education lives in the blog — no roadmap content on public pages.**
app/page.js is deliberately just Nav (logo + one button, "Check my brand —
free") + Hero (eyebrow "For brands in India · UAE · Saudi Arabia" + single
domain input + one button + the interactive report-card demo, which must
show the India serum DISCOVERY shelf with Indian brands — never a
problem-first snapshot with non-India results) + PromiseStrip (three
one-line promises with icons, plus one always-visible secondary link to
/audit) + Footer (logo + one-line story + Privacy). The pillar/markets/data/
compare/how-it-works sections (components/Aisle*.js, HowItWorks.js,
Markets.js, DataSection.js, Compare.js) still exist, unused by this page —
reserved for a future /platform page, not deleted. Anyone who wants to
understand HOW StockedBy works gets that from an actual report (which
already keeps its fuller explainer style) or a future blog, not a landing
page essay — and no TODAY/NEXT/THEN roadmap framing belongs on any
public-facing page (CLAUDE.md's own "still roadmap" pillars are internal
framing, not copy to surface to merchants). This extends to the /test
wizard too: domain-first, one decision per screen (components/test/
DomainStep.js -> BrandStep.js -> MarketStep.js -> CategoryStep.js ->
QueryStep.js), persistent header (eyebrow "StockedBy · {market}" + subtitle
"Your customers ask ChatGPT what to buy. See if it says your name — or
your competitor's."), plain language throughout — banned words on every
user-facing surface: engine, query, telemetry, archetype, fanout, harvest,
GEO, agentic, UCP, ACP, manifest, schema, protocol (say instead: AI apps,
questions, what AI searched, site check) — short sentences (max ~12 words),
buttons that state their outcome ("Check my brand — free", "Show my
report", "Test another product"). The report page
(components/test/report/) renders a 4-card Layer 1 story by default
(StoryView.js, computed by lib/layerOne.js: YES/SOMETIMES/NO, who AI
recommends, where buyers pay in counts not percentages, 3 next steps — one
of which links to /audit when the brand's own site never appeared as a
destination) with a "See full details" button that expands the existing,
more detailed full report (Layer 2, unchanged). The merchant email uses
Layer 1 content only. The Agent Readiness Audit (/audit) follows the same
pattern: Layer 1 (components/audit/AuditResults.js, computed by
lib/audit/layerOne.js) is a plain verdict (YES, AI CAN READ YOUR SHOP /
SOME PROBLEMS / AI CAN'T READ YOUR SHOP) + up to 4 plain findings with
fixes, deliberately computed from only the discoverable+readable layers
(no UCP/ACP/transactable — still roadmap); "See technical details" expands
the original per-check output, unchanged, for developers. Each surface
cross-links to the other: the audit result ends with a link to /test, and
the shelf report's "what should you do" card links to /audit when
warranted.

Current phase: **Phase 4 complete — persistence, capture & share are live**
MVP (landing page, full test flow, /api/test) shipped first; Phase 4 added
Supabase (leads/reports/snapshots/custom_category_requests —
supabase/migrations/0001_phase4_schema.sql), the email gate (hard rule 8),
report persistence + /report/[slug] sharing, and a shared snapshot cache on
top of the on-demand harvest (hard rule 6). All of it is additive and
degrades gracefully: ANTHROPIC_API_KEY is still the only hard-required key
— GEMINI_API_KEY/OPENAI_API_KEY, SUPABASE_URL/SUPABASE_SERVICE_KEY, and
RESEND_API_KEY are all optional, and every feature that depends on one
quietly no-ops without it rather than failing the free test (see
lib/harvestClients.js, lib/supabaseClient.js, lib/email.js). Zoho mailbox
setup (the actual inbox FOUNDER_EMAIL/FROM_EMAIL point at) is ops, not
code — nothing here builds that. Still not started: Phase 5 (real per-
email-per-category-per-month rate limiting, privacy policy, analytics,
Arabic/RTL pass).

## Hard rules
1. **API keys server-side only.** ANTHROPIC_API_KEY, GEMINI_API_KEY,
   OPENAI_API_KEY, RESEND_API_KEY, SUPABASE keys live in Vercel env vars.
   Never in client code, never committed.
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
   hand-written list. Claude runs live server-side on every test. ChatGPT
   and Gemini normally render from harvested snapshots in data/*.json
   (API-harvested offline via scripts/harvest.py, or manually per
   docs/stockedby-data-kit.md §2) — but if the tested category+market has no
   snapshot newer than lib/freshness.js's SNAPSHOT_MAX_AGE_DAYS (30 days),
   app/api/test/route.js harvests that engine on demand instead, via
   lib/harvestClients.js (same HARVEST_PROMPT as the offline script; results
   are labeled source: "live-harvest", never merged into "snapshot" rows).
   Grok, Perplexity and Copilot are OUT OF PRODUCT SCOPE — not deferred, not
   "coming soon": no UI surface should name them, and no new code should add
   them back without this rule changing first. The data layer stays
   tolerant of them though — an old grok/perplexity/copilot snapshot
   sitting in a bank file is silently ignored (never matched by
   ENGINE_ORDER), not an error. Query-bank GENERATION is Claude/ChatGPT only.
7. **Cost ceiling ≤ $0.05 per free test:** queries come from the bank (no
   generation call), web_search max_uses: 2 per query, model claude-sonnet-4-6,
   aux calls (sentiment) on haiku.
8. **Email gate before deep results** (live, Phase 4): verdict + engine
   scoreboxes (VerdictCard) are free; everything else (checkout battle,
   Share of AI Voice, sentiment, the shelves, fanout, trusted sources, audit
   CTA) sits behind components/test/report/LeadGate.js — work email +
   optional brand website/pain point + a required DPDP (India) / PDPL (UAE,
   KSA) consent checkbox. POST /api/lead → Supabase `leads` insert + Resend
   (founder notification + merchant confirmation, both carrying the
   /report/[slug] link) — see lib/email.js (adapted from
   docs/api-lead-resend.ts) and lib/reports.js. The gate is a client-side
   presentational blur/clip over already-rendered children, not server-side
   redaction — LeadGate's own comment explains why (lead capture, not
   access control; a shared /report/[slug] link re-gates for each new
   visitor by design, which doubles as further lead-gen off shares).
   Graceful throughout: a Supabase or Resend failure still unlocks the UI
   and still returns `ok`, per hard rule 1's "never block the merchant over
   an optional infra dependency" pattern — only a bad request (missing
   email/consent) or the /api/lead rate limit (its own IP-cap namespace,
   separate from /api/test's) blocks submission.
9. **Rate limit**: cap tests per IP per day at 10 in app/api/test (also
   applied, with their own separate counters, to app/api/generate-queries
   and app/api/lead — see lib/rateLimit.js's namespace param). [STILL
   DEFERRED] the stronger per-email-per-category-per-month limit hard rule
   8's original draft described — nothing enforces "1 free test per email"
   yet, only the IP-based caps above.
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
  categories by lib/bank.js / lib/bankMerge.js. Its category ids must match
  data/india.json's real ids exactly — mergeBank() deep-merges a seed
  category's snapshots onto the matching bank category (appending, never
  replacing), but an id that doesn't match a real bank category just gets
  added as its own separate one. A real past bug: the seed's vitamin-C
  category was filed under "vitamin-c-serum" instead of the bank's real
  "face-serum-vitamin-c", creating a confusing near-duplicate in the
  picker (fixed by renaming it) — and mergeBank() itself used to replace a
  matching bank category wholesale instead of merging, which had silently
  discarded 8 of "tws-earbuds"'s 10 real harvested snapshots (also fixed).
- scripts/check_query_bank.py — acceptance gate for all bank batches.
- lib/freshness.js — SNAPSHOT_MAX_AGE_DAYS + staleEnginesFor(), shared
  client+server (no fs/API keys), used by app/api/test/route.js to decide
  when to harvest on demand and by components/test/TestFlow.js to preview
  that decision before the request fires (RunningPanel's "testing live
  now…" hint).
- lib/harvestClients.js — server-only on-demand chatgpt/gemini harvest for
  app/api/test (hard rule 6), reusing scripts/harvest.py's HARVEST_PROMPT
  and real-telemetry-over-self-report principle in JS
  (@google/genai / openai). A successful harvest write-throughs to Supabase
  via lib/snapshotCache.js — see that entry below.
- components/test/ — the /test wizard, one component per screen:
  DomainStep.js -> BrandStep.js (brand auto-guessed from the domain via
  lib/scoring.js's guessBrandFromDomain, always editable) -> MarketStep.js
  (3 big cards) -> CategoryStep.js (search, large tap targets) ->
  QueryStep.js (edit + run). TestFlow.js owns the phase state machine and
  is the only place brand/website/market/category/queries live — website
  IS the domain (no separate field), and there's no competitor field at
  all in this flow (dropped for simplicity; /api/test and the report still
  support one, this wizard just never asks). "Free brand check" is the
  entire persistent header; each step supplies its own short framing.
- app/api/generate-queries — custom category flow: when CategoryStep's
  search has no bank match, it offers "Test '{query}' — we'll write the
  questions". Brand is already known by then (collected in BrandStep,
  before MarketStep/CategoryStep), so — unlike the flow's first version —
  there's no separate brand-collection screen; picking a custom category
  calls this route immediately with the brand already in hand (no
  leader-brand guessing either way) and generates 4 queries with Claude
  (lib/claudeClient.js generateCustomQueries, adapted from
  docs/stockedby-data-kit.md §2b). Lands in the same QueryStep review
  (mandatory stop) before /api/test ever runs them. Never written into
  data/*.json — every request is logged to Supabase's
  custom_category_requests table (console fallback if Supabase isn't
  configured) so the most-requested customs can become real bank additions.
- supabase/migrations/0001_phase4_schema.sql — the four Phase 4 tables
  (leads, reports, snapshots, custom_category_requests); paste into
  Supabase's SQL editor to apply (idempotent, safe to re-run). RLS is
  enabled with zero policies on every table — the app only ever talks to
  Supabase with the service-role key (lib/supabaseClient.js), which
  bypasses RLS, so this just guarantees the anon key (never used here, but
  if it ever leaked) grants nothing.
- lib/supabaseClient.js — server-only Supabase client; returns null (not a
  throw) when SUPABASE_URL/SUPABASE_SERVICE_KEY aren't set, and every
  caller treats that as "Phase 4 feature is off" rather than an error.
- lib/snapshotCache.js — the write-through cache behind hard rule 6's
  on-demand harvest: fetchCachedSnapshots() merges Supabase rows on top of
  a bank category's own inline seed snapshots (bank JSON stays the seed
  layer, Supabase holds only the deltas); writeThroughSnapshot() persists a
  fresh on-demand harvest so a category is harvested live once ever, not
  once per visitor. Deliberately skipped for custom categories (its own
  comment explains why: shared fixed qids + no real category_id would let
  two different merchants' custom tests collide on the same cache key).
- lib/reports.js — saveReport()/getReportBySlug(): every completed test
  (app/api/test/route.js) is saved with slug "{brand}-{category}-{shortid}",
  gate or no gate — components/test/report/LeadGate.js's blur-lock is a
  client-side presentational layer over this same data, not a server-side
  redaction, so there's nothing sensitive about persisting the full report
  up front. Powers app/report/[slug]/page.js.
- app/report/[slug]/page.js — read-only, shareable view of a saved report
  (generateMetadata sets the "{brand} — {verdict} · StockedBy" OG title +
  a description built from the same buildFounderSummary the report's own
  summary card uses, so WhatsApp/LinkedIn previews render meaningfully).
  Renders the same ReportView/LeadGate the live /test flow uses.
- lib/email.js — Resend wrapper (adapted from docs/api-lead-resend.ts) used
  by app/api/lead/route.js: founder notification + merchant confirmation,
  both linking to /report/[slug]. Every merchant-controlled field is HTML-
  escaped before interpolation. Independent per-recipient success flags
  (Promise.allSettled) — one send failing (e.g. an unverified Resend
  sending domain, which restricts merchant-address sends) never blocks the
  other.
- lib/site.js — SITE_URL constant (NEXT_PUBLIC_SITE_URL, defaults to
  https://stockedby.com) for building absolute /report/[slug] and /audit
  links in emails. components/test/report/ShareButton.js deliberately does
  NOT use this — it reads window.location.origin instead, so the copied
  link always matches whatever domain/environment is actually being viewed.
- lib/layerOne.js — pure computation for the shelf report's Layer 1 story
  (buildAppearanceStory/buildTopBrands/buildDestinationStory/buildActions,
  combined by buildLayerOne), shared verbatim by
  components/test/report/StoryView.js (client) and app/api/lead/route.js's
  merchant email, so the on-screen story and the email can never drift.
  buildActions() returns {text, href} objects — href is set (to /audit,
  prefilled with the brand's domain when known) only when the brand's own
  site never appeared as a destination, the report's cross-link into the
  free site check.
- lib/audit/ — Agent Readiness Audit (app/api/audit, app/audit,
  components/audit/): ssrfGuard.js (mandatory hostname check, see hard
  rule 11), fetchWithTimeout.js (SSRF-safe manual redirect following),
  robots.js, jsonld.js, platform.js (Shopify/WooCommerce/Magento/Salla/
  Zid fingerprints + Stripe.js detection), productDiscovery.js (sitemap
  or on-page link), score.js (checks → Discoverable/Readable/
  Transactable layer scores → verdict, platform-aware fix lines),
  layerOne.js (parallel to lib/layerOne.js — buildAuditLayerOne() computes
  the plain-language Layer 1 verdict + up to 4 findings+fixes from only the
  discoverable+readable layers, rendered by
  components/audit/AuditResults.js; Layer 2 keeps score.js's full 3-layer
  output, including transactable, unchanged for developers).
- app/privacy/page.js — the site's privacy policy (uses the .legal styles
  in app/globals.css), linked from Footer.js. Covers what's collected at
  /test, /audit and the lead gate, who else sees it (Anthropic/Google/
  OpenAI for questions; Resend/Supabase for email + storage), and DPDP
  (India) / PDPL (UAE, KSA) rights.

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
4. [DONE] /api/lead (Resend + Supabase) + email gate + consent (DPDP/PDPL);
   report persistence + /report/[slug] share; write-through snapshot cache
   on top of the on-demand harvest. See hard rules 6/8/9 and the repo map
   entries for supabase/migrations/0001_phase4_schema.sql,
   lib/supabaseClient.js, lib/snapshotCache.js, lib/reports.js, lib/email.js.
   Zoho mailbox setup itself (the inbox FOUNDER_EMAIL/FROM_EMAIL point at)
   is ops, not code — not part of this phase's deliverable.
5. [post-MVP, not started] Real per-email-per-category-per-month rate
   limiting (see hard rule 9), privacy policy, analytics, Arabic/RTL pass.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
