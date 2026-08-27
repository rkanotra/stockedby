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
/why and /how are where curious or technical visitors and investors read
the full picture — no roadmap content on the homepage itself.**
app/page.js is deliberately just Nav + Hero (eyebrow "For brands in India ·
UAE · Saudi Arabia" + single domain input + one button + the interactive
report-card demo, which must show the India serum DISCOVERY shelf with
Indian brands — never a problem-first snapshot with non-India results) +
PromiseStrip (three one-line promises with icons, an always-visible example-
report link, and a bordered "Agent-ready check" feature card — see below) +
Footer. Nav (components/Nav.js) is four items max: logo, "How it works"
(/how), "Why StockedBy" (/why), "Agent check" (/audit), then the one button
("Check my brand — free") — the three links hide below 760px so mobile
keeps the minimal logo+button nav; Footer links are the same "How it
works · Why StockedBy · Privacy". /why (app/why/page.js) moved the pillar/
markets/data/compare sections here UNCHANGED (components/Aisle*.js,
Markets.js, DataSection.js, Compare.js) — including AisleProtect's TODAY/
NEXT/THEN roadmap framing, which is fine on /why specifically (its whole
purpose is the full picture for a technical/investor reader) but still does
NOT belong on the homepage or the /test wizard. /how (app/how/page.js)
moved HowItWorks.js's 3-step section here, preceded by a short "every AI
assistant is now a shop" story paragraph. The bordered "Agent-ready check"
card in PromiseStrip.js (className `audit-promo-card`, deliberately
outlined/dark rather than the homepage's yellow CTA color, so it reads as a
second product for a technical audience, not the same tool restated) is the
homepage's only remaining link into /audit; it's allowed slightly more
technical language ("agentic commerce", "UCP") than the rest of the
homepage per its own "for technical teams" label. This extends to the /test
wizard too: domain-first, one decision per screen (components/test/
DomainStep.js -> BrandStep.js -> MarketStep.js -> CategoryStep.js ->
QueryStep.js), persistent header (eyebrow "StockedBy · {market}" + subtitle
"Your customers ask AI what to buy. See if ChatGPT, Gemini and Claude say
your name — or your competitor's." — the homepage keeps its own,
deliberately different ChatGPT-focused copy, see components/Hero.js),
plain language throughout — banned words on every user-facing surface
(the /test wizard, the report, the merchant email, the PDF — NOT /why or
/audit's Layer 2 "technical details", both deliberately exempted, see
their own entries below): engine, query, telemetry, archetype, fanout,
harvest, GEO, agentic, UCP, ACP, manifest, schema, protocol, organic,
"share of voice" (say instead: AI apps, questions, what AI searched, site
check, "how often AI picks each brand") — short sentences (max ~12 words),
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
code — nothing here builds that. The Fix Generator (/fix, IMPROVE pillar)
is also live — see the repo map entries for app/api/fix/route.js and
lib/audit/fixGenerator.js/installInstructions.js/gatherSignals.js — reusing
the same email gate (hard rule 8, source="fix"), rate-limit pattern (hard
rule 9) and SSRF guard (hard rule 11) as the rest of the app. Its Supabase
migration (supabase/migrations/0002_fix_generator_schema.sql) has NOT been
run against the live project yet — same manual "paste into Supabase's SQL
editor" step as 0001, still outstanding. Still not started: Phase 5 (real
per-email-per-category-per-month rate limiting, privacy policy, analytics,
Arabic/RTL pass) — analytics here means a real GA property; lib/analytics.js
ships a safe no-op trackEvent() wrapper ahead of that (fires fix_started/
fix_completed/fix_gate_shown/fix_lead_submitted the moment GA is wired up,
does nothing until then).

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
   generation call), web_search max_uses: 2 per query (1 for the
   problem-first archetype specifically — its open-ended phrasing triggers
   the longest searches, see app/api/test/query/route.js), model
   claude-sonnet-4-6, aux calls (sentiment) on haiku. The Fix Generator's
   per-page product extraction (lib/claudeClient.js's extractProductData)
   is haiku-only too, capped at 8 pages/run (app/api/fix/route.js's
   MAX_PRODUCTS) with maxRetries: 0 — the SDK's own retry would risk
   exceeding maxDuration rather than saving cost.
8. **Email gate before deep results** (live, Phase 4): verdict + engine
   scoreboxes (VerdictCard) are free; everything else (checkout battle,
   "How often AI picks each brand" — formerly "Share of AI Voice", renamed
   off the banned-word list, see hard rule 12 — sentiment, the shelves,
   fanout, trusted sources, audit CTA) sits behind components/test/report/
   LeadGate.js — work email + optional pain point + a read-only brand-
   website field (prefilled from the test, can't be changed — it's the
   completed test's own domain, not an editable lead-form field anymore) +
   a required DPDP (India) / PDPL (UAE, KSA) consent checkbox. POST
   /api/lead → Supabase `leads` insert + Resend (founder notification +
   merchant confirmation, both carrying the /report/[slug] link) — see
   lib/email.js (adapted from docs/api-lead-resend.ts) and lib/reports.js.
   The gate opens as components/test/report/GateModal.js — a centered
   modal (desktop) / full-screen bottom sheet (mobile) — the INSTANT
   "See full report" is clicked (LeadGate.js mounts the modal open by
   default), not a blurred/clipped teaser in document flow a merchant had
   to scroll down past (that read as "nothing happened" when the button
   was near the bottom of the viewport — see hard rule 12's ReportView.js
   auto-scroll, which is now a secondary assist, not the primary fix).
   Closing the modal without submitting leaves a small "Unlock full
   report" button in its place, not a dead end. On submit the modal closes
   and the deep cards render inline exactly where LeadGate.js sits (unlike
   the old design, unlocking is still purely a client-side presentational
   gate, not server-side redaction — LeadGate's own comment explains why:
   lead capture, not access control; a shared /report/[slug] link re-gates
   for each new visitor by design, which doubles as further lead-gen off
   shares). Graceful throughout: a Supabase or Resend failure still
   unlocks the UI and still returns `ok`, per hard rule 1's "never block
   the merchant over an optional infra dependency" pattern — only a bad
   request (missing email/consent) or the /api/lead rate limit (its own
   IP-cap namespace, separate from /api/test's) blocks submission.
9. **Rate limit**: cap tests per IP per day at 10 in app/api/test (also
   applied, with their own separate counters, to app/api/generate-queries,
   app/api/lead, and app/api/test/query (limit 200 — abuse-prevention only,
   not the real per-test cap, since one test now fires several of these) —
   see lib/rateLimit.js's namespace param). app/api/fix reuses
   checkAndConsume() unmodified but passes a composite `${ip}:${hostname}`
   key (namespace "fix", limit 1) instead of a bare IP — one run per
   domain per IP per day, without touching lib/rateLimit.js. [STILL
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
    hostname check. app/api/fix fetches the same merchant-entered domain
    (plus up to 8 of its own product pages) and is bound by this rule too —
    it calls assertPublicHostname() before gathering signals, same as
    /api/audit, and reuses fetchTextSafe() throughout for every subsequent
    page fetch.

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
- app/api/test/query/route.js + lib/runQueries.js — the live per-question
  Claude call is its own endpoint, one request per shopper question, hard-
  capped at 50s (lib/claudeClient.js's askShoppingAssistant timeoutMs,
  which now covers a possible pause_turn continuation too — see its own
  comment) with web_search max_uses dropped to 1 for the problem-first
  archetype specifically (its open-ended phrasing triggers the longest
  searches). lib/runQueries.js is the client-side orchestrator
  (components/test/TestFlow.js): runAllQueries() fires every question in
  parallel, each with its own client-driven retry (a fresh separate
  request, not a same-invocation retry) before it can end up "error". This
  replaced app/api/test doing all the live Claude calls itself inside one
  Promise.all — that meant every question in a test shared ONE Vercel
  function's duration budget, so one slow/paused question could threaten
  the whole batch. app/api/test now requires `liveRuns` in its request
  body (the client-collected results) instead of running the calls itself
  — see its own comment.
- components/test/ — the /test wizard, one component per screen:
  DomainStep.js -> BrandStep.js (brand auto-guessed from the domain via
  lib/scoring.js's guessBrandFromDomain, always editable) -> MarketStep.js
  (3 big cards) -> CategoryStep.js (search, large tap targets) ->
  QueryStep.js (edit + run) -> RunningPanel.js (live per-question
  searching/done/error dots, via lib/runQueries.js's onStatus callback).
  TestFlow.js owns the phase state machine and is the only place brand/
  website/market/category/queries live — website IS the domain (no
  separate field), and there's no competitor field at all in this flow
  (dropped for simplicity; /api/test and the report still support one,
  this wizard just never asks). The report's "Retry" button
  (components/test/report/VerdictCard.js, shown when
  report.appearanceSummary.failed > 0) calls TestFlow.js's
  retryFailedQuestions() with report.appearanceSummary.failedQueries — re-
  runs ONLY those questions (not the whole test), merges the fixed results
  into the already-good ones from the prior response's liveRuns, and
  resubmits to /api/test for a fresh report.
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
  other. buildMerchantEmail() (exported, pure) builds the merchant email —
  a plain, personal-feeling email (both html and text parts), not a
  marketing template: one-line verdict, who AI recommends instead, the
  "money line" (only when buyers actually go elsewhere), three tips from
  lib/layerOne.js's buildEmailTips(), a plain link to the report, and a
  reply-inviting sign-off. Subject line is keyed off the Layer 1
  YES/SOMETIMES/NO appearance verdict, not the 4-tier report.verdict —
  three fixed variants, same structure for all three (only the subject and
  opening line change). Valuable even if the merchant never clicks through
  — every section degrades gracefully when its underlying data is missing
  (no trusted source, no destination data, no report link) rather than
  showing a broken or empty line.
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
  free site check. buildEmailTips() is the email's own parallel fix-plan —
  same underlying signals (trusted sources, destination data) as
  buildActions, but always exactly 3 fixed tips in a fixed order (not a
  cascade of candidates) — lib/email.js's buildMerchantEmail() is the only
  caller. Both land on buildLayerOne's return value as `.actions` and
  `.emailTips` respectively.
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
- lib/audit/gatherSignals.js — gatherAuditSignals(hostname): the 6-way
  parallel fetchTextSafe wave (robots.txt/llms.txt/ucp/acp/homepage/
  sitemap.xml) plus wellKnownResult(), extracted out of app/api/audit/
  route.js so app/api/fix can reuse the exact same signal-gathering for its
  own "before" snapshot without duplicating or drifting from /api/audit's
  own logic.
- app/api/fix/route.js — the Fix Generator (/fix): discovers up to 8
  product URLs (sitemap.xml first via productDiscovery.js's
  scanSitemapMulti, falling back to commonListingUrls's /products//shop//
  collections/ paths, then the homepage's own links via
  findProductUrlsInHtml — all additive multi-URL siblings of /api/audit's
  original single-URL functions, kept genuinely separate so /api/audit's
  shipped behavior can't regress), extracts each page with
  lib/claudeClient.js's extractProductData (haiku, see hard rule 7),
  builds schema.org Product JSON-LD per product and a site-level llms.txt
  (lib/audit/fixGenerator.js — every field conditional on real extracted
  data, per hard rule 2: a page that can't be read returns an honest
  {status:"error"}, never invented product data), and computes a full
  "before" audit snapshot inline (reusing gatherAuditSignals +
  lib/audit/score.js's buildAuditResult) so the results page's "Verify it
  worked" button only needs one fresh /api/audit call to diff against —
  no second endpoint. Best-effort persists to Supabase's `fix_runs` table
  (supabase/migrations/0002_fix_generator_schema.sql, not yet applied to
  the live project — see "Current phase" above).
- lib/audit/installInstructions.js — getInstallInstructions(platformId):
  exact, platform-specific paste steps (Shopify/WooCommerce/Magento/Salla/
  Zid + a generic "custom" fallback) for both the JSON-LD blocks and
  llms.txt, keyed off the same platform id string
  lib/audit/platform.js's detectPlatform() returns — /audit and /fix can
  never disagree about which platform a site is on.
- app/fix/page.js + components/fix/ (FixFlow.js phase state machine →
  FixResults.js → ProductJsonLdCard.js, FixLeadGate.js) — the /fix UI,
  mirroring app/audit/page.js + components/audit/'s shape. First 2
  products render free and unlocked; the full product set + llms.txt
  download + platform install steps + the "Verify it worked" before/after
  diff + the "don't have a developer? reply to your email" CTA sit behind
  FixLeadGate.js (a domain-keyed twin of components/test/report/
  LeadGate.js, same blur/clip-then-unlock presentational pattern, hard
  rule 8's gate extended via source="fix" — see app/api/lead/route.js and
  lib/email.js's sendFixLeadEmails/buildFixLeadEmail below). Cross-linked
  from components/audit/AuditResults.js (a "Generate the fix →" button
  under Layer 1 findings), components/test/report/FixPlanCTA.js (inserted
  into ReportView.js's LeadGate children alongside AuditCTA.js), and
  components/AisleWin.js's "Fix generator" card on /why (no longer a
  "coming soon" chip).
- lib/analytics.js — trackEvent(name, params): a "use client" no-op
  wrapper around window.gtag, safe to call before a real GA property is
  wired up (that's an ops decision, out of scope here — see "Current
  phase"). Fired by components/fix/ at fix_started, fix_completed,
  fix_gate_shown and fix_lead_submitted.
- app/api/lead/route.js + lib/email.js — extended, not forked, for
  source="fix" leads (hard rule 8): market/category validation is skipped
  and brandWebsite (the domain) becomes required instead when
  source==="fix", brand falls back to that domain, and the Supabase
  `leads` insert gets a new nullable `source` column (default 'report',
  supabase/migrations/0002_fix_generator_schema.sql, market/category also
  dropped to nullable there) so every existing report-flow call site keeps
  working unchanged. Email dispatch branches on the same source: fix leads
  get lib/email.js's sendFixLeadEmails/buildFixLeadEmail (a receipt + the
  "reply and we'll install it for you" invitation — there's no /report/
  [slug]-style share link for a fix run to point to) instead of
  sendLeadEmails/buildMerchantEmail's report-summary shape.
- Self-improvement infrastructure (supabase/migrations/0003_self_improvement_schema.sql):
  `system_events` (event_type: 'query_failure'|'sanity_rejection'|
  'parse_failure', source, context jsonb) logs every real failure worth
  knowing about — written by lib/systemEvents.js's logSystemEvent()
  (app/api/test/query/route.js, app/api/generate-queries/route.js; both
  tag their thrown errors with a `.kind` in lib/claudeClient.js so the
  right event_type gets logged) and by scripts/harvest.py / scripts/
  retest.py's own log_event(). `brand_appearances` is a SQL view over
  `snapshots.snapshot_json`'s recommendations array — (brand, category,
  market, engine, avg_position, appearance_rate) — matched on the brand
  string as stored, not lib/scoring.js's fuzzy normalize()/matches(), so
  it's a raw aggregate for ad-hoc queries and the digest below, not a
  replacement for the app's own brand-matching. scripts/harvest.py now
  also exports load_env() (loads .env.local via python-dotenv — a more
  reliable alternative to the README's `export $(grep ...)` one-liner,
  which breaks on any value containing spaces), sanity(recs) (the same
  never-fabricate check as lib/claudeClient.js's sanityCheckRecs, applied
  to harvest.py's own write loop too), sb() (shared Supabase REST client)
  and log_event() — scripts/retest.py and the new scripts/founder_digest.py
  both import these instead of redefining their own. scripts/retest.py's
  Supabase-harvest-adapter imports were broken (referenced functions
  harvest.py has never exported, and included a Claude/Anthropic
  re-harvest engine that would have violated hard rule 6 — Claude is
  always live, never harvested) — fixed to use harvest.py's real
  GeminiHarvester/OpenAIHarvester classes, Claude dropped entirely, and
  its digest now includes a month-over-month position diff
  (positions_as_of() with an `as_of` cutoff ~30 days back) alongside the
  existing since-last-check diff. scripts/founder_digest.py is new: a
  weekly, read-only summary (custom-category requests ranked, system_events
  patterns, first-ever brand appearances per market+category+engine,
  categories tested most) — see scripts/README.md for both scripts' usage.
  Neither is wired to a cron yet; both are run manually, same as
  harvest.py's own documented workflow.
- Brand matching (lib/scoring.js, tested — see below): normalizeBrand()
  is THE brand-comparison util (normalize()/matches() are exported aliases
  of it, so every existing caller across the app gets it for free) — fixed
  a real production bug where a brand could rank #1 with real mentions in
  its own leaders list while its saved verdict read NOT STOCKED, because
  the old normalize() stripped "&" and all whitespace with nothing put
  back, so "Dot & Key" and a slug/guess-derived "Dot and Key" normalized to
  two different strings. Handles unicode NFKD + diacritics, "&" <-> "and"
  (both directions), punctuation as word breaks (not deletion, so "Dr.
  Sheth's" doesn't collide with an unrelated brand), and trailing
  corporate suffixes (india/pvt/ltd/inc/co); matchesAny() adds an optional
  brand_aliases escape hatch for names no normalization rule could ever
  bridge. sanitizeBrandLabel() strips a stray "/" immediately after an
  abbreviation period (e.g. "Dr. /Sheth's") without touching a genuine
  multi-brand "/" answer — applied once, in buildTopBrands() (lib/
  layerOne.js), so every leaders-style surface gets it. app/api/test/
  route.js's contradiction guard runs the SAME buildTopBrands() the
  report's own leaders surfaces will use, right before saving: if the
  brand is one of its own leaders but the verdict is NOT STOCKED, it logs
  a `system_events` row (severity 'critical', supabase/migrations/
  0004_brand_matching_fix.sql) and fails the response rather than saving
  or rendering a self-contradictory report. That same migration adds
  explicit brand_display_name/brand_slug/category_display_name/
  category_slug columns to `reports` (lib/reports.js's saveReport()
  populates all four; brand/category_id already held the display name/
  slug respectively and are untouched) — audited every render site (the
  /test loading screen, the verdict sentence, every leaders/report card,
  the merchant email, the PDF) and confirmed none of them ever derived a
  display name from a slug; the one place a brand name genuinely IS
  slug/domain-derived is guessBrandFromDomain's initial /test wizard
  auto-fill (always editable), which now renders a hyphenated "and"
  segment as "&" since a domain can't contain one. scripts/
  audit_brand_matches.py finds reports still affected (CSV output only,
  never emails; --rerun corrects the appearance-tier verdict from already-
  cached snapshots, no new API spend). lib/scoring.test.js (`npm test`,
  Node's built-in test runner — package.json needed `"type": "module"` for
  this, and gained a `test` script) covers normalizeBrand/matches/
  matchesAny/sanitizeBrandLabel/categoryMidSentence/guessBrandFromDomain/
  couldChangeVerdict/engineStatusLabel directly.
- lib/pdf/buildReportPdf.js — the merchant email's PDF attachment and
  POST /api/report-pdf's on-demand download (components/test/report/
  DownloadPdfButton.js, at the bottom of the expanded full report — see
  hard rule 8), rebuilt for full content parity with the web report: exec
  summary, per-engine appearance, leaders table, the checkout battle,
  "how often AI picks each brand", sentiment, the COMPLETE trusted-source
  list (not top-5), a question-by-question breakdown per engine, and the
  fix plan — dark theme matching the app/report screens (hard rule 5),
  StockedBy wordmark + a faint diagonal watermark on every page (paintPage()),
  dynamic pagination via ensureSpace() using REAL measured text heights
  (doc.heightOfString()) rather than fixed guesses — a fixed guess had
  pdfkit's own auto-pagination silently inserting unpainted, unfooted
  extra pages whenever real content ran longer than guessed. The footer
  (page number + "Generated by StockedBy — stockedby.com", once per page,
  no signoff) had its own separate bug: drawing text past a page's own
  margins.bottom makes pdfkit's .text() think it doesn't fit and
  auto-adds a new page for it, even after switchToPage() — two .text()
  calls per footer meant two extra pages per real page, each carrying
  half the footer (the reported "triple-repeat"). Fixed by zeroing
  `doc.page.margins.bottom` for just the footer draw, then restoring it.
- app/privacy/page.js — the site's privacy policy (uses the .legal styles
  in app/globals.css), linked from Footer.js. Covers what's collected at
  /test, /audit and the lead gate, who else sees it (Anthropic/Google/
  OpenAI for questions; Resend/Supabase for email + storage), and DPDP
  (India) / PDPL (UAE, KSA) rights.
- app/why/page.js — "Why StockedBy": the pillar sections
  (components/AisleMonitor.js, AisleDiagnose.js, AisleWin.js,
  AisleProtect.js), Markets.js, DataSection.js and Compare.js, all rendered
  unchanged — this is the one page allowed the fuller "still roadmap"
  framing (TODAY/NEXT/THEN, PROTECT's roadmap-tagged features) that stays
  off the homepage and /test wizard.
- app/how/page.js — "How it works": a short story paragraph ("every AI
  assistant is now a shop") followed by HowItWorks.js's unchanged 3-step
  section, then components/FaqSection.js — 5 real Q&As rendered visibly
  (Google's structured-data guidelines require FAQPage markup to reflect
  content actually on the page) plus the matching FAQPage JSON-LD.
- SEO foundation: lib/site.js's buildOpenGraph()/buildTwitter() build a
  fully self-contained openGraph/twitter object per page (image, siteName,
  type, locale always included) — every page metadata export uses these
  rather than writing the object literally, because Next only SHALLOW-
  merges nested metadata fields per route segment (a page that sets its
  own `openGraph` silently drops the root layout's, image included, unless
  it's re-included — a real bug this caused and fixed). app/opengraph-image.js
  is the one dynamic OG image (next/og, brand tokens from globals.css, no
  external asset) shared site-wide via those helpers. components/JsonLd.js
  renders one JSON-LD `<script>` block (Next's own documented pattern);
  used by app/page.js (Organization + WebApplication) and
  components/FaqSection.js (FAQPage). app/sitemap.js lists the real static
  pages only (/report/[slug] excluded — dynamic, not canonical landing
  content, and Supabase isn't configured in production yet to enumerate
  them anyway). app/robots.js allows everything, including AI crawlers,
  explicitly by name — reuses lib/audit/robots.js's AI_BOTS list (the same
  six bots the audit tool checks a MERCHANT's site against) as the single
  source of truth. Every page also sets `alternates: { canonical }`
  (/test's is the fixed path, not its ?domain=... query variants).
- Blog: content/blogs/*.md are the real posts (title/metaTitle/description/
  slug/date frontmatter + markdown body) — lib/blog.js reads them via an
  explicit filename list (POST_FILES), not a directory glob, so a stray
  planning doc dropped in the same folder can't silently become a "post."
  content/blog-content-calendar.md (outside content/blogs/, deliberately)
  holds the future-posts outline that used to share a file with post 3 —
  moved so it's never parsed as content. app/blog/page.js is the listing;
  app/blog/[slug]/page.js renders each post via react-markdown (the only
  markdown-rendering dependency in the project — added for this), with
  Article JSON-LD, per-post OG/canonical (lib/site.js's buildOpenGraph/
  buildTwitter, same as every other page), and components/BlogLink.js
  rewriting the posts' own https://stockedby.com links into fast
  next/link navigation. components/BlogCta.js (DomainCheckForm reused
  verbatim, not rewritten) closes every post — the same conversion moment
  as the homepage hero. app/blog/rss.xml/route.js is a plain Route
  Handler (not a Next file-convention name) serving RSS 2.0.
  app/sitemap.js includes /blog and every post URL. Nav.js and Footer.js
  both link /blog — verified the 5-item nav (How it works, Why StockedBy,
  Blog, Agent check, the CTA button) doesn't wrap or crowd at any
  real desktop width before adding it there, not just eyeballed.

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
