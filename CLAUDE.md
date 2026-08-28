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

**Site philosophy — homepage narrative (restraint pass, narrows the
"visual/creative revamp" phase's fuller narrative back down): hero, a real
example, one strong statement, a simple explanation, market proof, final
CTA — six sections, not ten.** A first pass at the fuller narrative added
five new sections in one go (ProblemStatement, an evolved PromiseStrip,
ResultExample, plus new ImprovementLoop and AgenticTeaser sections, and
reused HowItWorks/Compare alongside Markets) and, on reflection, repeated
itself — "how the test works" explained twice (once as three questions,
once as three steps), a competitor comparison table before the visitor
understood the product, and a whole dedicated section selling the agentic-
commerce roadmap. All were cut back. app/page.js now assembles, in order:
Nav + Hero (eyebrow "For brands in India · UAE · Saudi Arabia" as a plain
text label, not a pill badge — see hard rule 5's "no template tells" note
below — + single domain input + one button + the interactive report-card
demo, which must show the India serum DISCOVERY shelf with Indian brands
— never a problem-first snapshot with non-India results — plus a small
"See an example ↓" link anchoring to ResultExample) → ResultExample.js
("what a result looks like," every number computed from the SAME real
snapshot data Hero's demo reads via lib/heroExample.js, hard rule 2: never
fabricate, never a second independently-typed example) →
ProblemStatement.js (one short editorial statement, big type, no card
grid, no scroll-reveal — should just exist, not perform an entrance) →
PromiseStrip.js (an editorial 01/02/03 "three questions StockedBy
answers" list, plain language, still carrying the bordered "Agent-ready
check" cross-sell card into /audit, className `audit-promo-card`) →
Markets.js (REUSED UNCHANGED from /why — not forked — so the homepage and
/why can never silently disagree about this content; its own intro line
was rewritten from a defensive "US tools test English queries..." framing
to a concrete "₹, AED and SAR budgets. Hinglish and Arabic questions.
Marketplaces like Nykaa, Noon and Amazon.ae." one) → FinalCTA.js (closing
CTA band reusing the existing `.receipt` card treatment) → Footer +
ScrollReveal. HowItWorks.js and Compare.js are NOT on the homepage —
HowItWorks stays exclusive to /how (its own dedicated page for that
detail, avoiding explaining "how it works" twice on one page); Compare's
competitor comparison table stays exclusive to /why (a homepage shouldn't
argue with competitors before a visitor understands the product).
ImprovementLoop.js and AgenticTeaser.js (the "Check → Understand → Fix →
Recheck" loop and the TODAY/NEXT/LATER roadmap teaser) were deleted
entirely, not just unlinked — both were dead code the moment they came off
the homepage (confirmed via grep, no other callers), and a whole section
selling the agentic-commerce future was exactly what this pass's brief
said not to do on the homepage; /why's AisleProtect.js keeps the full
roadmap depth, reachable from Nav, unaffected. Nav (components/Nav.js) is
unchanged: four items max: logo, "How it works" (/how), "Why StockedBy"
(/why), "Blog" (/blog), "Agent check" (/audit), then the one button ("Check
my brand — free," used identically everywhere a primary CTA appears on the
homepage — Nav, Hero's form, ResultExample, FinalCTA — deliberately never
rotated to a different label) — the links hide below 760px so mobile keeps
the minimal logo+button nav; Footer links are the same "How it works · Why
StockedBy · Blog · Privacy". /why (app/why/page.js) and /how
(app/how/page.js) are both untouched and still hold the full pillar/
markets/data/compare/how-it-works content, reachable from Nav. Design
tokens: a first formal spacing/radius scale (`--space-1`..`--space-8`,
`--radius-sm/md/lg/pill`) was added to app/globals.css's marketing `:root`
block alongside hard rule 5's Ink tokens — used by the homepage sections
above; existing classes elsewhere keep their pre-existing literal values
(no mass find/replace across already-shipped, unrelated pages). This pass
also added the stylesheet's first `transition` properties beyond `.chip`
(light hover/focus transitions on `.btn`/`.btn-primary`/`.btn-ghost`/
`.nav-links a`/`.audit-promo-card`) — still no motion library (GSAP/
framer-motion), which remains a deliberately deferred follow-up (see
"Current phase" below) since this session has no browser tool enabled to
visually review animation timing/feel while building it. This extends to
the /test
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
report", "Test another product").

**Founder-first redesign** (current phase, supersedes the earlier "Layer
1/Layer 2" report structure below): the /test report, /audit and /fix are
now built as an "executive AI brand report," not a dashboard — conclusion
first, business implication, biggest opportunity, recommended action,
evidence, raw technical detail last and mostly hidden. lib/founderReport.js
(new, pure, tested) is the single derivation layer for /test's numbers —
AI Visibility Score (report.avgYou verbatim, never a new metric),
the Discover → Consider → Buy Buyer Journey (real per-archetype
appearance rates, `null` not a fabricated 0% with no data), Biggest
Opportunity, Competitor Threat (real average rank, deduped by question
not row), Destination Split (own-site vs. marketplace, "none" excluded
from the denominator, `null` when there's no real data), and up to 3
specific Recommended Actions. components/test/report/ReportView.js,
app/api/lead/route.js (merchant email) and lib/pdf/buildReportPdf.js all
call the SAME buildFounderReport() — one calculation, three consistent
surfaces, never independently recomputed (a `buildFounderReport` call
with the same input twice is asserted deterministic in
lib/founderReport.test.js). StoryView.js is deleted; its role is now
AIVisibilityHero.js (dynamic result headline + score + 3 inline stats,
never 4 boxed cards) + BiggestOpportunityCard.js + BuyerJourney.js, all
free/ungated — this is the new free tier hard rule 8 refers to.
Everything else (EngineTabs.js — compact tabs defaulting to one engine,
each shopper question told as a story via ShopperQuestionInsight-shaped
cards, showing only the biggest win + biggest loss initially —
CompetitorThreat.js, DestinationSummary.js, RecommendedActions.js,
NextMoveCTA.js) sits behind the email gate (LeadGate.js, unchanged
mechanism). The old raw-evidence components (VerdictCard.js,
ShelvesCard.js, CheckoutBattleCard.js, ShareOfVoiceCard.js,
SentimentCard.js, TrustedSourcesCard.js, FanoutCard.js) are unchanged and
still inside the gate, just moved behind a single "View full evidence"
disclosure toggle rather than always-expanded. /audit mirrors this:
lib/audit/layerOne.js's `buildAuditLayerOne()` (verdict + findings,
findings now carrying a real `why`/`tier` alongside `finding`/`fix`) and
the new lib/audit/journey.js's `buildAuditJourney()` (maps
discoverable/readable/transactable straight onto Find → Understand → Buy,
a dynamic hero headline from a small decision table over the real
per-stage statuses — never a fixed "AI CAN'T READ YOUR SHOP" string
unless that's genuinely true — plus `buildCrawlerSummary()` grouping the
6 AI-bot checks into 4 platform buckets) together drive
components/audit/AuditResults.js's AuditJourney.js/AuditFindings.js
("What we found / Why it matters / What to do")/CrawlerSummary.js/
AuditActionPlan.js ("Fix first / Then / Later"). lib/audit/score.js's
underlying checks/layers/scoring are completely unchanged — this is a
presentation-layer redesign, and "unknown never counts as pass" was
already true there before this phase. CTA hierarchy discipline (one
primary filled button, one quiet disclosure toggle, one framed cross-sell
card, one smallest-weight plain text link — never four competing
equal-weight actions) still governs both surfaces, and every surface
cross-links to the others (report → /audit, audit → /test, post-fix-
verify → /test) per this same principle.

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
editor" step as 0001, still outstanding. The /audit + /fix "agent side" fix
pass is also done: /audit's verdict logic and CTA hierarchy (hard rule 13's
neighboring paragraph above), /fix's plain-language platform picker + "send
to my developer" email action (lib/audit/platform.js's PICKER_PLATFORMS,
app/api/fix/send-to-developer/route.js), and hard rule 13's email-quality
infrastructure across every capture point. supabase/migrations/
0005_email_quality.sql has NOT been run against the live project yet,
same as 0001/0002. Still not started: Phase 5 (real
per-email-per-category-per-month rate limiting, privacy policy, analytics,
Arabic/RTL pass) — analytics here means a real GA property; lib/analytics.js
ships a safe no-op trackEvent() wrapper ahead of that (fires fix_started/
fix_completed/fix_gate_shown/fix_lead_submitted the moment GA is wired up,
does nothing until then). Also done, most recently: the marketing-site
**visual/creative revamp** (design tokens + the fuller homepage narrative
— see "Site philosophy" above), a static-only pass with no motion library
added. **Deliberately deferred**: the brief's GSAP signature motion
sequences (a pinned-scroll shelf population, an engine-answer transition,
a scroll-linked improvement-loop) — this session has no browser tool
enabled to visually review animation timing/feel while building it, so
that work waits for a follow-up pass where it can actually be watched
render, not shipped blind. A following pass extended the same restraint
to `/test` and `/audit`'s shared components/test/test.module.css: light
hover/focus `transition`s (border-color/background/color, 0.12-0.15s)
added to every previously-static interactive element — `.btn`/`.btnGhost`/
`.input`/`.qedit`/`.tab`/`.marketTab`/`.marketCard`/`.catrow`/
`.catrowBig`/`.copyBtn`/`.disclosureToggle`/`.plainLink`/
`.retryHintBtn`/`.gateModalClose` — none of which had any before. No
class renames, no layout changes, no new radius/spacing values (this
file's existing 8/10/12/14/16px progression was already coherent enough
not to warrant a risky mass token substitution this pass). `/audit`'s own
information architecture (dynamic headline, Find/Understand/Buy journey,
business-impact findings, action plan, technical detail behind
disclosure) was already right from the founder-first redesign phase
above — confirmed via direct read, nothing there needed changing. **Real
regression found and fixed during this pass**: the Phase-9 cleanup
earlier this session (commit 1ccc2d3) deleted `.storyLine` believing it
was dead code left over from the deleted StoryView.js — a grep for
`storyBig` (0 matches) was checked, but `.storyLine` itself was deleted
in the same sweep without being individually re-checked, even though
AuditFindings.js, CrawlerSummary.js, ProductJsonLdCard.js and
FixResults.js (5 call sites total) all still reference it as a
general-purpose muted supporting-line style, unrelated to StoryView.js.
That shipped to production unstyled for one deploy; restored under the
same name (renaming 5 call sites for a cosmetic-only class was not worth
the churn) with a comment explaining why it survived. A final **restraint
pass** (see "Site philosophy" above) narrowed the homepage from ten
sections back to six, deleted two sections' worth of dead code
(ImprovementLoop.js, AgenticTeaser.js) once they came off the page,
converted the Hero eyebrow from a pill badge into a plain text label, and
rewrote several lines of generic/defensive marketing copy into shorter,
concrete ones — a pure subtraction pass, no new sections or components
added, per that pass's own explicit "the page should become shorter, not
replace deleted content with new content" instruction.

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
   #FFC53D, brick #C2471F/#E8503A, greens #1E7A50/#2FA772) — CSS custom
   properties in app/globals.css's `:root` (--cream/--ink/--tag/etc.),
   unchanged and untouched by the app-side migration below. The same
   `:root` block also holds the marketing site's spacing/radius scale
   (`--space-1` 4px .. `--space-8` 64px, `--radius-sm` 6px/`--radius-md`
   10px/`--radius-lg` 16px/`--radius-pill` 999px, added in the visual/
   creative revamp phase) — used by the homepage narrative components
   (see the "Site philosophy" section and repo map above); pre-existing
   classes elsewhere keep their original hardcoded values. The APP/report
   screens are DARK theme, the **Ink palette** (migrated off the old pine
   palette — #0E1F18 and its derived greens are fully retired, not just as
   a verdict colour): --bg-base #14171E (page), --bg-surface #181C25
   (cards), --bg-inset #11141A (inputs/wells/code blocks), --border-subtle
   #262B36, --border-strong #2C3240, --text-primary #F4F4F6, --text-
   secondary #DDE1E9 (readable body/caption text), --text-muted #B7BCC8
   (hints, short supporting lines), --text-mono #8B93A5 (short uppercase
   mono eyebrow labels only — verified ~5.5:1 against --bg-surface, the
   tightest pair; anything longer than a label uses --text-muted instead,
   which has more headroom), --accent #F5B840 (deliberately its own hex,
   not the marketing site's --tag — the light/dark split is real, not
   just a colour scheme), --accent-hover #FFD070, --on-accent #181C25
   (text on filled accent buttons), --danger #FF8A80 (real form/request
   errors only — invalid email, rate limits — never a report verdict, see
   below). Defined once in app/globals.css's `:root` alongside the
   marketing tokens (scoped by usage, not by selector — marketing
   components never reference the Ink tokens and vice versa) — every app/
   report component reads these via `var(--token)`, never a raw hex.
   lib/theme.js exports the same values as plain JS constants for the two
   surfaces that can't use CSS custom properties: lib/pdf/buildReportPdf.js
   (pdfkit, no CSS at all) and lib/email.js's inline-styled HTML (custom
   properties are unreliable across email clients). **Verdict colours**:
   green is never used as a "good" signal anywhere in the app, on-screen
   or in the PDF/email — a wall of red or green reads as an alarm on a
   report that gets screenshotted and forwarded, not an analysis. The
   shelf report's YES/SOMETIMES/NO headline (StoryView.js) and the 4-tier
   full-report verdict (VerdictCard.js) both render in plain --text-primary
   regardless of good or bad — the words carry the meaning — with only the
   mid-tier (SOMETIMES/BARELY STOCKED/OUTSHELVED) earning the --accent
   "look here" treatment and the one genuinely actionable "money line"
   (buyers going to a competitor's site) also getting --accent. /audit's
   three states get the one deliberate exception: all-pass is --text-
   primary with an --accent underline (styles.accentUnderline), partial is
   --accent, and fully-blocked is the ONLY place in the app that uses red
   as a verdict colour (styles.vBlocked, not the shared, neutral .vBad
   every other verdict display uses) — so it stays rare instead of
   becoming a second default "bad" colour. /test's per-engine status
   during a live run (RunningPanel.js) follows the same spirit: a live
   engine (Claude, always; ChatGPT/Gemini when harvesting on demand) gets
   a small --accent dot next to its tab; a cached engine shows plain
   --text-muted status text and no dot. Fonts: Bricolage Grotesque
   (display), Archivo (body), IBM Plex Mono (labels/data) — load from
   Google Fonts, do NOT embed woff2 from the design export. Favicon:
   done — app/icon.svg (tag-yellow rounded mark, "by" in ink, matches the
   nav logo) + app/apple-icon.png.
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
12. **Banned-word vocabulary** applies to every user-facing surface (the
    /test wizard, the report, the merchant email, the PDF — NOT /why or
    /audit's Layer 2 "technical details", both deliberately exempted): see
    the full banned-word list and plain-language rules spelled out above
    under "Site philosophy" — engine, query, telemetry, archetype, fanout,
    harvest, GEO, agentic, UCP, ACP, manifest, schema, protocol, organic,
    "share of voice" (say instead: AI apps, questions, what AI searched,
    site check, "how often AI picks each brand").
13. **Email quality, every capture point** (report gate, fix gate, any
    future form): shared, testable logic lives in lib/emailValidation.js —
    format validated on blur with an inline error (EMAIL_RE, also the
    server-side check in app/api/lead/route.js); a maintained disposable-
    domain blocklist (DISPOSABLE_DOMAINS, ~200 entries) blocked inline
    ("Please use an email you check.") both client- and server-side;
    free providers (gmail.com etc.) are NEVER blocked — most D2C founders
    in our markets run on gmail — only flagged via a stored
    `is_free_provider` boolean (supabase/migrations/0005_email_quality.sql)
    for later segmentation; near-miss typos (gmial.com, gmai.com, yahooo.com,
    hotmial.com) get a dismissible "Did you mean…" suggestion
    (suggestEmailCorrection) that never auto-changes the field. Resend's
    bounce/complaint webhook (app/api/webhooks/resend/route.js, Svix-scheme
    signature verification via Node's crypto, no added dependency) is the
    real verification layer — updates `leads.email_status` ∈ (sent,
    delivered, bounced, complained); scripts/founder_digest.py's weekly
    digest surfaces the count. Deliberately NOT implemented: OTP/email
    verification codes — the added step costs more leads than it saves at
    current volume; revisit only for paid account login.

## Repo map
- app/page.js + lib/heroExample.js — the homepage narrative (restraint
  pass, see "Site philosophy" above for the full section order and
  rationale). lib/heroExample.js is the real-data resolution logic
  extracted out of components/Hero.js (HERO_BRAND, HERO_ENGINES —
  resolved once at module load from data/india.json + data/
  snapshots-india-seed.json, no fetch, hard rule 2) so components/
  Hero.js's live demo and components/ResultExample.js's static example
  read the exact same real snapshot, never two independently-typed ones.
  components/ProblemStatement.js is self-contained, no props, no logic —
  components/ResultExample.js is the only homepage component with real
  logic (computes appearedCount/engineCount, bestRank, and an
  own-site-vs-marketplace destination tally straight from
  lib/heroExample.js's HERO_ENGINES, never a hardcoded percentage).
  components/ImprovementLoop.js and components/AgenticTeaser.js existed
  briefly during the fuller-narrative phase and were deleted once cut
  from the homepage — check git history if that "Check → Understand →
  Fix → Recheck" loop or TODAY/NEXT/LATER teaser shape is ever wanted
  again, rather than re-inventing it.
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
- supabase/migrations/0005_email_quality.sql — hard rule 13: adds
  `is_free_provider` (boolean, client-computed) and `email_status` (text,
  default 'sent', check-constrained to sent/delivered/bounced/complained)
  + `email_status_updated_at` to `leads`. Not yet applied to the live
  project, same manual step as every prior migration.
- supabase/migrations/0006_marketing_consent.sql — founder-first redesign
  (brief section 57): adds a nullable `marketing_opt_in` boolean (default
  false) to `leads`, separate from the required DPDP/PDPL data-processing
  consent checkbox (hard rule 8, unchanged legal requirement).
  components/test/report/LeadGate.js and components/fix/FixLeadGate.js
  both now render two checkboxes — the required consent (CONSENT_TEXT)
  and a genuinely optional "send me occasional updates" one
  (MARKETING_TEXT) — instead of one bundled checkbox; app/api/lead/
  route.js writes the client-computed value straight onto the insert,
  same never-recompute-server-side pattern as `is_free_provider`. Not yet
  applied to the live project, same manual step as every prior migration.
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
  other. buildMerchantEmail({brand, category, market, appearance, founder,
  reportUrl, brandWebsite}) (exported, pure) builds the merchant email — a
  plain, personal-feeling email (both html and text parts), not a
  marketing template: one-line verdict (appearanceLine(appearance), where
  `appearance` is lib/layerOne.js's buildAppearanceStory() output — see
  that file's own entry below), the biggest gap title, up to 3 short
  actions (from lib/founderReport.js's `founder.actions` — the SAME
  computation /test and the PDF read, so the email can never say
  something the report doesn't back up), a plain link to the report, and
  a reply-inviting sign-off. subjectFor(brand, appearance, founder) is
  genuinely dynamic (founder-first redesign) — chosen from the real
  result combination (absent/weak, strong-with-no-gap, destination
  problem, named competitor threat, generic moderate), not a fixed
  3-string switch. Falls back to a short, honest, data-free version when
  `!appearance || !founder` (report data couldn't be loaded) rather than
  a substance-free templated email. Valuable even if the merchant never
  clicks through — every section degrades gracefully when its underlying
  data is missing rather than showing a broken or empty line.
  buildDeveloperFixEmail()/
  sendDeveloperFixEmail() (same file, same esc()-everything pattern) are
  the "Send this to my developer" action's email — see app/api/fix/
  send-to-developer/route.js above; a separate, distinct flow from
  sendFixLeadEmails/buildFixLeadEmail below (that one is the merchant's own
  receipt, this one goes to a different, merchant-typed address).
- lib/emailValidation.js — shared, pure, client-safe email-quality checks
  (hard rule 13): isValidEmailFormat/EMAIL_RE, isDisposableEmail (
  DISPOSABLE_DOMAINS, ~200 real throwaway providers), isFreeProvider (
  FREE_PROVIDERS — gmail.com etc., NEVER blocked, only flagged),
  suggestEmailCorrection (small edit-distance check against common
  providers — returns a suggested full address string, never mutates the
  field itself). Used identically by components/test/report/LeadGate.js
  and components/fix/FixLeadGate.js (on-blur inline error + dismissible
  "Did you mean…" suggestion, styles.inputRequired/.fieldError/
  .fieldSuggestion) and re-imported server-side by app/api/lead/route.js
  as the backstop validation (a client check can be bypassed). Covered by
  lib/emailValidation.test.js.
- app/api/webhooks/resend/route.js — Resend's bounce/complaint webhook
  (hard rule 13): verifies the Svix-scheme signature
  (RESEND_WEBHOOK_SECRET) with Node's built-in crypto (no svix package
  dependency added), then updates every matching `leads` row's
  email_status ('delivered'/'bounced'/'complained') by email. No-ops
  (200, not an error) when RESEND_WEBHOOK_SECRET or Supabase isn't
  configured — same optional-infra pattern as the rest of the app. Needs
  the webhook actually registered in Resend's dashboard against this
  route — that registration step, like the Zoho mailbox setup mentioned
  above, is ops, not code.
- lib/site.js — SITE_URL constant (NEXT_PUBLIC_SITE_URL, defaults to
  https://stockedby.com) for building absolute /report/[slug] and /audit
  links in emails. components/test/report/ShareButton.js deliberately does
  NOT use this — it reads window.location.origin instead, so the copied
  link always matches whatever domain/environment is actually being viewed.
- lib/layerOne.js — down to two small, still-live pure functions after the
  founder-first redesign (below) replaced its old role.
  buildAppearanceStory(appearanceSummary) → {verdict: YES/SOMETIMES/NO,
  appearedIn, totalAttempted}, read directly by
  components/test/report/AIVisibilityHero.js, lib/pdf/buildReportPdf.js,
  and app/api/lead/route.js (as `appearance`, passed to lib/email.js's
  buildMerchantEmail/sendLeadEmails). buildTopBrands(engines, brand) →
  combined top-recommended-brands tally across every engine's organic
  (non branded-routing) rows, read directly by lib/founderReport.js and
  app/api/test/route.js's contradiction guard. This file used to be the
  founder-first redesign's whole data layer (buildLayerOne() combined
  these two with buildActions/buildFixPlan/buildEmailTips/
  buildDestinationStory into one "Layer 1" object for the old
  StoryView.js + the merchant email); that role now belongs to
  lib/founderReport.js, which reuses buildTopBrands directly rather than
  duplicating it. The other four functions were deleted with their only
  caller (buildLayerOne) once nothing read their output anymore — see git
  history if the old "3 tips" / "5-item fix plan" shape is ever needed
  again.
- lib/founderReport.js — the founder-first redesign's central data layer
  (CLAUDE.md's "Site philosophy" section above): "one normalized result →
  multiple consistent surfaces." buildFounderReport({report, engines,
  brand}) wires together buildVisibilityScore (reuses report.avgYou
  verbatim + a band), buildBuyerJourney (maps category-discovery→Discover,
  problem-first+replacement→Consider, branded-routing→Buy; each stage
  {pct, band, detail}, `pct` null — never a fabricated 0% — with zero
  rows), buildBiggestOpportunity, buildCompetitorThreat (dedupes "seen in
  N questions" by distinct qid across engines, not raw row count — never
  mixes denominators), buildDestinationSplit (excludes "none" from the
  denominator, null when there's no real destination data), and
  buildFounderActions (max 3, every item traceable to a real signal
  above, never generic filler). Called by exactly 3 places — 
  components/test/report/ReportView.js (the web report),
  app/api/lead/route.js (the merchant email), lib/pdf/buildReportPdf.js
  (the PDF) — confirmed via grep, so those three surfaces can never
  silently disagree. lib/founderReport.test.js asserts every function's
  never-fabricate behavior plus an end-to-end determinism check
  (buildFounderReport called twice on identical input → assert.deepEqual)
  as a structural guard against future drift.
- lib/audit/ — Agent Readiness Audit (app/api/audit, app/audit,
  components/audit/): ssrfGuard.js (mandatory hostname check, see hard
  rule 11), fetchWithTimeout.js (SSRF-safe manual redirect following),
  robots.js, jsonld.js, platform.js (Shopify/WooCommerce/Magento/Salla/
  Zid/Wix fingerprints + Stripe.js detection, plus the exported
  PICKER_PLATFORMS short list — Shopify/WooCommerce/Wix/"Something else" —
  for /fix's manual platform picker, see FixResults.js below),
  productDiscovery.js (sitemap or on-page link), score.js (checks →
  Discoverable/Readable/Transactable layer scores → verdict, platform-aware
  fix lines), layerOne.js (parallel to lib/layerOne.js —
  buildAuditLayerOne() computes the plain-language, THREE-state Layer 1
  verdict (see hard rule 13's neighboring "Site philosophy" paragraph above
  for the exact states) + up to 4 findings+fixes, most-severe first, from
  only the discoverable+readable layers, plus a `contradiction` boolean
  backstop — rendered by components/audit/AuditResults.js; Layer 2 keeps
  score.js's full 3-layer output, including transactable, unchanged for
  developers). lib/audit/layerOne.test.js covers the verdict-mapping and
  contradiction-guard logic (node:test, run via `npm test`). Its
  FINDING_RULES entries also carry `tier` ("fix-first"|"then") and `why`
  (the plain-language business consequence) fields, consumed by
  components/audit/AuditActionPlan.js/AuditFindings.js below.
- lib/audit/journey.js — the founder-first redesign's /audit mirror of
  lib/founderReport.js's buyer journey: buildAuditJourney(result) maps
  layers.discoverable/readable/transactable straight onto Find/
  Understand/Buy stages, each {label, score, status}. stageStatus(score)
  → "Not checked"|"Not ready"|"Needs work"|"Ready" — the SAME status
  vocabulary for all three stages including Buy (what changes for Buy is
  the detail copy, forward-framed as "future-ready," not the status
  word). buildAuditHeadline(stages) picks a genuinely dynamic hero
  headline from a small decision table over the three real statuses
  (never one fixed string). buildCrawlerSummary(checks) groups the 6
  robots-* checks (lib/audit/robots.js's AI_BOTS) into 4 founder-legible
  platform buckets (OpenAI, Google AI, Anthropic, Perplexity), each
  Restricted or Accessible — per-bot technical detail stays behind the
  existing Layer 2 disclosure. checkImportance(check) labels a check
  "Optional / emerging" (llms.txt) or "Future-ready" (transactable layer)
  or "Important now" — consumed by components/audit/LayerCard.js's Layer
  2 detail. Called by exactly components/audit/AuditResults.js and
  components/fix/FixResults.js (confirmed via grep — /fix's verify
  section uses it for its before/after status comparison, see below).
  lib/audit/journey.test.js covers the status thresholds, the headline
  decision table, and crawler grouping.
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
  shipped behavior can't regress), deduping every discovered candidate
  via lib/audit/fixGenerator.js's normalizeProductUrl() (strips trailing
  slash/www/tracking params/fragment — a real gap before the founder-
  first redesign, where two URLs differing only by a tracking param could
  both get extracted). extractOne() now checks the page's OWN existing
  JSON-LD first (via the already-imported findProductSchema/
  validateProductFields) before ever calling Claude: a page whose
  existing schema is already complete (fixGenerator.js's
  productAlreadyComplete()) is marked status "already-good" and skipped,
  never re-extracted. Otherwise extracts with lib/claudeClient.js's
  extractProductData (haiku, see hard rule 7), builds schema.org Product
  JSON-LD (lib/audit/fixGenerator.js — every field conditional on real
  extracted data, per hard rule 2), then validates the generated JSON-LD
  via fixGenerator.js's validateGeneratedJsonLd() (rejects a broken
  @context/@type/name/price/currency, and asserts no invented
  aggregateRating/review/sku/gtin/mpn) — a validation failure marks the
  product status "invalid" rather than shipping broken code. So
  products[].status is now one of "already-good"|"done"|"invalid"|
  "error", up from the original "done"|"error". Computes a full "before"
  audit snapshot inline (reusing gatherAuditSignals +
  lib/audit/score.js's buildAuditResult) so the results page's "Verify it
  worked" button only needs one fresh /api/audit call to diff against —
  no second endpoint. Best-effort persists to Supabase's `fix_runs` table
  (supabase/migrations/0002_fix_generator_schema.sql, not yet applied to
  the live project — see "Current phase" above).
- lib/audit/installInstructions.js — getInstallInstructions(platformId):
  exact, platform-specific paste steps (Shopify/WooCommerce/Magento/Salla/
  Zid/Wix + a generic "custom" fallback) for both the JSON-LD blocks and
  llms.txt, keyed off the same platform id string
  lib/audit/platform.js's detectPlatform() returns — /audit and /fix can
  never disagree about which platform a site is on.
- app/fix/page.js + components/fix/ (FixFlow.js phase state machine →
  FixResults.js → FixPlan.js, InstallationMode.js, ProductJsonLdCard.js,
  FixLeadGate.js) — the /fix UI, mirroring app/audit/page.js +
  components/audit/'s shape, rebuilt in the founder-first redesign around
  a single installation-mode chooser instead of several competing gates.
  FixPlan.js renders an up-to-3-item overview ("Improve product
  information — fix first" / "Add a store summary — improve next" /
  always "Prepare AI checkout — future-ready") before any code is shown.
  First 2 products render free and unlocked; InstallationMode.js ("I'll
  do it myself" vs. "Send to my developer") then decides which single
  panel FixLeadGate.js reveals — the old EscapeHatchCard's separate
  "copy link" affordance was folded into this one flow rather than
  competing with it as a second path. In the self-install panel,
  ReusableSnippetCard (FixResults.js-local) renders lib/audit/
  fixGenerator.js's buildReusableSnippet() — ONE dynamic Liquid/PHP
  template per platform (REUSABLE_TEMPLATE_PLATFORMS = shopify,
  woocommerce) instead of N static per-product JSON-LD blocks — before
  the per-product ProductJsonLdCard.js list; other platforms keep
  per-product code. ProductJsonLdCard.js handles all 4 product statuses
  from app/api/fix/route.js (already-good/done/invalid/error), with a
  HumanReadablePreview (plain Product/Brand/Price/Availability rows)
  shown above the code, which is now collapsed by default behind a "View
  code" toggle. The verify section reuses lib/audit/journey.js's
  buildAuditJourney() status vocabulary for its before/after comparison
  (not the old raw verdict string), with a "Technical blocker removed."
  headline shown only when a stage genuinely improved to "Ready," plus a
  closing "Check whether AI recommends my brand →" link into /test.
  DeveloperSendCard (in the developer-send panel — needs the full
  products/llmsTxt content, and the merchant's own email from
  FixLeadGate's onUnlock callback) is the real "Send this to my
  developer" email action, POSTing to app/api/fix/send-to-developer/
  route.js — see its own entry below. PlatformPicker (ungated, shown only
  when platform === "custom") lets a merchant self-report their platform
  from lib/audit/platform.js's PICKER_PLATFORMS when auto-detection
  missed, overriding which install.js instructions render without
  touching the audit's own detected-platform badge. Cross-linked from
  components/audit/AuditResults.js (the "Generate the fix →" primary
  button, only shown when there's something to fix),
  components/test/report/FixPlanCTA.js (inserted into ReportView.js's
  LeadGate children alongside AuditCTA.js), and components/AisleWin.js's
  "Fix generator" card on /why (no longer a "coming soon" chip).
- app/api/fix/send-to-developer/route.js — the "Send this to my developer"
  action (hard rule 13's neighboring paragraph, spec item 6): takes the
  client's ALREADY-generated products/llmsTxt straight from memory (same
  pattern as LeadGate.js sending report data) and emails them to a
  developer address the merchant types in, via lib/email.js's
  buildDeveloperFixEmail()/sendDeveloperFixEmail(). Rate-limited per
  `${ip}:${domain}` (namespace "fix-dev-send", limit 5) — its own
  lib/rateLimit.js counter, separate from every other namespace. Logs
  BOTH the merchant's and the developer's email via
  lib/systemEvents.js's logSystemEvent("fix_dev_send", "fix", {...}) —
  reuses the existing system_events audit trail rather than a new
  Supabase column.
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
  sendLeadEmails/buildMerchantEmail's report-summary shape. Also (hard
  rule 13, supabase/migrations/0005_email_quality.sql): rejects a
  disposable-domain email server-side (lib/emailValidation.js's
  isDisposableEmail, the backstop behind the client-side block) and
  persists the client-computed `is_free_provider` boolean straight onto
  the `leads` insert — never recomputed server-side, so the client and
  stored value can't drift.
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
  an email bounce/complaint summary from `leads.email_status` — hard rule
  13 — and categories tested most) — see scripts/README.md for both
  scripts' usage. Neither is wired to a cron yet; both are run manually,
  same as harvest.py's own documented workflow.
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
  0004_brand_matching_fix.sql) and — as of the fix below — corrects the
  verdict in place (bumps it to BARELY STOCKED) and still returns the
  report, rather than failing the whole request; it's a pure backstop now,
  not the primary defense. The guard used to fire constantly, not on rare
  data corruption: computeReport()'s (lib/scoring.js) NOT STOCKED gate
  looked at `appearanceSummary.appearedIn` alone — Claude's own LIVE run
  only, since ChatGPT/Gemini are never re-asked live, only read from a
  cached snapshot (see the Engines repo map entry) — so any brand one of
  THEM recommended, while Claude simply didn't mention it that run, read
  NOT STOCKED even though buildTopBrands (which scans all three engines)
  plainly showed it as a leader — ordinary engine disagreement, not a bug,
  but the verdict and the leaders list disagreed about it. Fixed by
  gating NOT STOCKED on `appeared === 0 && appearRows === 0` — appearRows
  being the same all-three-engines organic scan buildTopBrands runs, now
  computed before the verdict decision instead of after (it used to be
  computed but never used by it). Every `rec.brand`/`rec.product`/etc.
  access across lib/scoring.js, lib/layerOne.js and lib/pdf/
  buildReportPdf.js is now optional-chained (`rec?.brand`) — a single
  malformed or null element in a recs array (a real risk on Claude's own
  live output, which used to be the one path that skipped the same
  per-element field-defaulting chatgpt/gemini's harvested/snapshot rows
  already got) would otherwise throw deep inside computeReport/
  computeAppearanceSummary; app/api/test/route.js's sanitizeRec() now
  applies that same defaulting to every source, and the whole scoring
  section (previously bare, no try/catch at all) is now wrapped so ANY
  throw there logs the real error's message+stack to system_events
  (event_type 'scoring_exception', severity 'critical') before responding,
  instead of surfacing as an unhandled 500 with nothing written anywhere.
  lib/scoring.test.js covers the cross-engine verdict fix directly
  (reproduces the exact contradiction) and the null/malformed-rec
  defensive guards. Separately: TestFlow.js's testAnother() ("Test another
  product," the plain reset button, not StoryView.js's TestAnotherCTA
  link, which deliberately DOES carry brand/domain/market forward for the
  same-brand multi-category flow) didn't reset domain/brand/market/catId/
  catSearch/queries state — a merchant testing a second, different brand
  without noticing/editing BrandStep's still-stale pre-filled value would
  have every question (and the report) silently run under the wrong
  brand. Fixed to fully reset. And the submission failure path (QueryStep,
  after `/api/test` fails) now retries the SAME liveRuns once before
  surfacing anything, and shows a quiet, non-alarming message (no red
  box — same treatment as VerdictCard.js's partial-failure handling)
  instead of `.errBanner` if it still fails. That same migration adds
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
- lib/theme.js — INK: the Ink palette's hex values as plain JS constants,
  the single source of truth shared by lib/pdf/buildReportPdf.js and
  lib/email.js (the two surfaces that can't use the CSS custom properties
  app/globals.css defines for every React component — pdfkit has no CSS,
  and custom properties are unreliable across email clients). Hard rule
  5 has the full token list and the verdict-colour rules both this file
  and the CSS tokens implement identically.
- lib/pdf/buildReportPdf.js — the merchant email's PDF attachment and
  POST /api/report-pdf's on-demand download (components/test/report/
  DownloadPdfButton.js, at the bottom of the expanded full report — see
  hard rule 8). Rebuilt in the founder-first redesign to read
  lib/founderReport.js's buildFounderReport() instead of the old
  lib/layerOne.js aggregate — same function, same data, same 3-page cap
  as the web report and email (no independent recalculation). Page 1:
  dynamic headline (same 3-case logic as AIVisibilityHero.js), score +
  band, up to 4 metric chips, Biggest opportunity, the AI Buyer Journey
  (drawBuyerJourney() — same status vocabulary/colors as the web
  BuyerJourney.js), Who is winning instead, Where AI sends shoppers (with
  an honest fallback line when there's no real destination data). Page 2:
  How AI describes your brand (only when sentiment has >=2 real mentions,
  per hard rule 2 — else "No clear positioning pattern yet."), Sources
  appearing in AI research (relabeled from "Times read," capped at 5),
  Most important questions (best result + biggest loss only), What should
  you do next (up to 3 founder.actions). An optional page 3 appendix (full
  per-engine Q&A) renders only when there's enough real question data to
  warrant it — 2 pages by default, not a fixed-length dump. Dark theme
  matching the app/report screens (hard rule 5), StockedBy wordmark + a
  faint diagonal watermark on every page (paintPage()), dynamic pagination
  via ensureSpace() using REAL measured text heights (doc.heightOfString())
  rather than fixed guesses — a fixed guess had pdfkit's own
  auto-pagination silently inserting unpainted, unfooted extra pages
  whenever real content ran longer than guessed. The footer (page number +
  "Generated by StockedBy — stockedby.com", once per page, no signoff) had
  its own separate bug: drawing text past a page's own margins.bottom
  makes pdfkit's .text() think it doesn't fit and auto-adds a new page for
  it, even after switchToPage() — two .text() calls per footer meant two
  extra pages per real page, each carrying half the footer (the reported
  "triple-repeat"). Fixed by zeroing `doc.page.margins.bottom` for just
  the footer draw, then restoring it.
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
