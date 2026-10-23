# StockedBy Studio: product direction and launch gates

Research date: 14 October 2026. Target: PMs and BAs in established companies with internal standards and review steps. Initial pilot: the founder's existing team of five BAs and two PMs. The findings below are directional desk research, not customer willingness-to-pay evidence.

## Positioning

Help a PM or BA take a policy-bound product change from source material to a reviewable delivery package: explicit requirements, working interaction prototypes, decisions, test specifications and controlled Jira handoff. The buying problem is repeated review and reconciliation, not a shortage of generated documents.

AI writing is not a moat. Productboard Spark already describes context-grounded specifications, traceability and persistent product knowledge. Aha! Builder already offers interactive prototypes with data operations. Figma provides established prototyping and design workflows. Competing on a broad feature checklist would leave a solo founder maintaining weaker versions of mature tools.

The hypothesis worth testing is a narrower workflow: company-specific rules and decisions remain connected to changed requirements, prototype behaviour and engineering work. Defensibility could grow from reusable, customer-approved policy interpretations and measured review outcomes. Neither exists at scale today; this release does not establish a moat merely by adding features.

## Competitive observations and implications

| Primary source | Observed capability | Implication |
| --- | --- | --- |
| [Productboard Spark](https://www.productboard.com/blog/introducing-spark-agentic-product-system/) | Product context, AI specifications, source traceability, persistent knowledge | A generic PRD writer cannot carry the proposition. Focus on a specific review workflow and prove reduced rework. |
| [Aha! on PM prototyping](https://www.aha.io/blog/how-product-managers-now-use-ai-to-prototype-new-features) | Interactive prototypes, data operations and feedback | Working journeys are expected. StockedBy's bounded simulation is useful for review, but is not equivalent to a production application builder. |
| [Figma prototyping](https://www.figma.com/prototyping/) | Interactive design workflows | Preserve the designer's existing tool. Import frame context and export editable SVG; do not rebuild Figma. |
| [Jira Product Discovery](https://www.atlassian.com/software/jira/product-discovery/features) | Ideas, insights, prioritization, roadmaps and delivery context | Avoid another roadmap or task tracker. Integrate handoff into Jira. |
| [Atlassian requirements guidance](https://www.atlassian.com/agile/product-management/requirements) | Shared requirements, goals, assumptions and links to supporting work | Keep assumptions, decisions and supporting evidence inspectable as the package changes. |

## Build priorities

1. Grounded company standards: extracted rules need exact source passages and explicit user confirmation. Conflicting or ambiguous applicability stays visible.
2. Working prototypes: connected screens, field validation, simulated collections and failure mode. Every scenario outcome is a manual observation tied to a generated version, not an automated test claim.
3. Review queue: unresolved questions, stale artifacts, missing acceptance criteria, uncovered requirements and prototype observations.
4. Decision log: accountable owner, rationale, affected requirement IDs and accepted/deferred status. Accepted decisions enter subsequent AI context and invalidate current outputs conservatively.
5. Baselines and change comparison: automatically snapshot before regeneration, manually save a baseline, compare item additions/removals/changes and restore for reconciliation.
6. Controlled delivery: real OAuth connector routes, Jira context snapshots, Figma frame mapping, signed Jira previews and intervening-edit checks. The founder must configure OAuth apps before accounts can connect.
7. Portable artifacts: Word, CSV, Markdown, project JSON, offline prototype HTML and editable screen SVG.

Defer: roadmaps, team chat, broad connector catalog, production application hosting, autonomous external writes and generic chat-assistant features.

## What this release is and is not

This is a substantial single-browser pilot. It is suitable for testing workflow value with information the organization has approved for these services. It is not ready to sell as a company-wide system with authenticated approvals or guaranteed retention.

Existing instruction: keep Supabase out for now. Project data therefore remains in browser storage. Clearing that storage loses unexported work; there is no collaboration, cross-device sync or centralized audit history. Local reviewer names are not verified signatures. Prototype records reset with the preview. Exports can be shared as files, but there is no hosted review link.

Jira/Figma APIs are implemented but must be configured and exercised against authorized real accounts before being advertised as live integrations. No OAuth app or customer permission is fabricated. Jira supports create/update of one reviewed story or test at a time, not automatic full bidirectional sync. Required unsupported custom fields block publication. Label-based retry reconciliation cannot guarantee exactly-once writes under concurrent requests or delayed Jira search indexing; inspect an uncertain write before retrying.

## Required before a paid organizational launch

- Identity, tenant isolation, access roles and authenticated reviewers.
- Durable project storage, backups, retention and deletion controls; immutable review/audit records and version conflict handling.
- Durable cost quotas, abuse control and per-organization usage accounting. Current in-memory limits are only pilot protection.
- Organization-approved AI data handling, model/provider policy, procurement documentation and appropriate contractual controls.
- Registered/distributable OAuth applications; real Jira and Figma integration acceptance tests and documented permission scope.
- Durable delivery idempotency and concurrency control before automated or large-batch writes.
- Clear product boundaries, support channel, pricing and owner-operated recovery procedures.

A database alone does not provide these controls. Supabase is an option later, not a prerequisite to testing the workflow hypothesis now.

## Pilot measurement: use the seven existing practitioners

Run 3–5 comparable initiatives through the existing process and this workspace. Record actual measurements before changing pricing or claiming improvement:

- Time from usable intake to first stakeholder review, excluding waiting time.
- Number of review rounds and reasons for rework.
- Requirements missing an agreed acceptance criterion or test reference at handoff.
- Policy conflicts identified before vs. after engineering starts.
- Stories accepted by engineering without substantive rewriting.
- Whether the prototype changes a requirement or resolves a disputed interpretation.
- Time spent correcting AI output and maintaining imported context.

Interview the reviewer and engineering recipient as well as the author. A suggested success threshold is at least 30% less authoring/reconciliation time with no increase in missed requirements, confirmed across several initiatives. This is a proposed experiment threshold, not a measured result. Ask the budget owner to commit to a paid pilot only after the result is visible. A concrete willingness-to-pay commitment matters more than positive feedback.

## Integration references

- [Atlassian OAuth 2.0](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [Atlassian API token guidance](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/): SaaS integrations should use a distributable OAuth app instead of collecting customer API tokens.
- [Jira issues API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)
- [Jira issue search](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/)
- [Figma OAuth apps](https://developers.figma.com/docs/rest-api/oauth-apps/)
- [Figma file endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/)

## Implementation verification (15 October 2026)

- `npm test`: 154 passing tests, including prototype validation/escaping, version invalidation, decisions, encrypted sessions, OAuth PKCE/state, provider origin restrictions, Figma parsing, signed Jira preview validation, required-field preflight and conflicting Jira edits.
- `npm run lint` and `npm run build`: passed.
- Browser checks on the production build: sample required-field validation, workspace creation, invitation record creation, row-specific revoke, prototype feedback in review queue, baseline creation, accepted decision invalidation, honest connector setup states and mobile overflow.
- Live OpenAI endpoint: generated a new equipment-request prototype from a synthetic brief. Browser-tested its exported runtime: submission creates a Pending record, the selected record changes to Approved, and conditional empty-state notices remain hidden while records exist.
- Real Jira/Figma authorization and remote writes were not tested because OAuth applications are not configured. Provider interactions were tested with mocked HTTP responses; no real tickets or designs were changed.
- Browser JSON upload automation was blocked by the extension's file-URL permission. Import validation has automated tests; the existing file picker requires manual browser acceptance testing in that environment.

## 23 October — living product plan revision

### Research and product diagnosis

Reviewed the supplied FH Pipeline 2.7.1 handover, changelog, installation notes and CLEAN implementation, plus the supplied AI-era PRD image. The FULL edition includes employer-specific reference data: it is not bundled, uploaded or incorporated into StockedBy. The attachments are source material, not instructions to republish an FH artifact.

Primary references:

- [Atlassian: requirements](https://www.atlassian.com/agile/product-management/requirements/) — concise shared context, assumptions, design links, decisions and living delivery references.
- [Linear: documents](https://linear.app/docs/documents) — documents attached to the work, collaborative editing and edit/version attribution.
- [Figma: prototypes are the new PRDs](https://www.figma.com/blog/prototypes-are-the-new-prds/) — early, interactive exploration helps PM teams test intent.
- [Miro AI](https://miro.com/ai/ai-overview/) — shared context and connected AI workflows. These are vendor descriptions, not independent evidence of productivity or willingness to pay.

Inference: another document generator is weak differentiation. The useful job is to preserve intent and evidence as a team goes from a problem to a prototype, implementation and a release decision. The FH pilot demonstrates domain-specific workflow discipline; the generic product should support each organisation's standards without imposing FH's BRD layout or rules. The screenshot is a useful planning framework, not an established universal 2026 standard.

### Implemented

The editor opens on a living product plan with eight sections: opportunity/evidence, decisions/alternatives, experience/prototype, behaviour/edge cases, measurement/evaluation, scope/constraints, rollout/rollback, and release/learning. It supports existing initiatives without destructive migration. All fields remain optional for drafting; personal review requires filling fields (including explicit unknown/not-applicable answers) and resolving recorded questions. Coverage counts are not readiness or quality scores.

AI drafts a separate proposal from current inputs. Exact source quotes are checked before displaying evidence. The user applies or rejects one section at a time. Context and per-section fingerprints reject stale proposals; applying one section does not invalidate proposals for untouched sections. Changes use existing local saving or shared optimistic-version autosave. A stale team save is still a conflict, not silent merging.

Plan content is passed to every generation request and included in Markdown/Word/JSON exports. The PRD prompt explicitly connects decisions, evidence, prototype, scope, success/evaluation, rollout and release criteria. Shared viewers can read the plan; team AI change review receives the plan as read-only context and must flag required plan follow-up rather than pretend to edit it. No database migration is required.

Identical context or artifact saves no longer erase reviews or stale downstream outputs. Plan review marks become outdated after relevant source/brief/rule changes and are reset on portable import. Personal review is never labelled authenticated team approval.

### Honest boundaries and next validation

This is a product-workflow improvement, not proof of enterprise maturity. Shared editing remains versioned with conflict handling, not simultaneous cursors/CRDT. Field-completeness checks cannot certify evidence quality or release readiness. Prototype outputs remain bounded interactive simulations, not deployable production products. Plan edits conservatively mark generated outputs stale because the full plan is supplied to generation. The existing Figma/Jira integrations still depend on configured OAuth and user actions; no new integration certification is claimed.

Pilot with the existing BA/PM team: give each participant one real but appropriately redacted initiative. Observe time to the first useful reviewed section, unprompted completion of input → plan → prototype → PRD, substantive corrections per AI draft, duplicate/missing requirements, and whether a teammate can resume from the saved plan. Compare against their existing FH workflow before claiming faster delivery or charging for a reliability promise.

Verification: 229 automated tests pass, including plan persistence in the private database document, stale-proposal refusal, selective acceptance, import sanitisation, review freshness, and reversible AI-section acceptance. ESLint passes. Browser checks on the fictional Orbit sample covered a real OpenAI plan proposal, applying one section, rejecting a proposal after a newer manual edit, refresh persistence, and 390px layout with no horizontal page overflow. A second real call generated a six-requirement PRD from the edited plan, including measurement, rollout/rollback and source references. It also repeated one resolved scope question; the prompt was tightened to cross-check questions against current intent. This is a remaining model-quality concern to evaluate in the pilot, not a claim of guaranteed semantic consistency. No employer reference library was sent in these tests.

Applying an AI section retains its previous version, and restoring a version also keeps the replaced draft (up to 12 section checkpoints). The plan remains human-editable. Shared production saving of this new field was not tested with a real user's live initiative; persistence/access control were exercised against the existing database command in the local PostgreSQL-compatible test suite.

## 23 October — make the first PRD visible

User testing exposed a more immediate issue: after generating a brief, the editor stayed on workflow settings and the user could not find the output. The default experience now starts with inputs for empty projects, or opens an existing PRD (otherwise the latest output). Create PRD generates requirements directly, without requiring a separate brief or product-plan exercise. Generation opens the output and retains that view on completion. The canvas and planning tools remain available under More. A single-document Word download sits beside Edit and Review.

XLSX upload now extracts visible sheets/cells with names and addresses, preserving cached formula results and flagging formulas that need recalculation. It does not calculate formulas or read charts/embedded images. Uploads retain the existing 3 MB and 40,000-character limits, with bounded ZIP expansion. Hidden sheets/rows/columns are excluded and disclosed in the preview.

The supplied business intake form informed generic PRD coverage for customer/staff journeys, systems, exceptions, exact business rules, operations, department inputs and open decisions with owners/dates. Its employer-specific content is not bundled. Word extraction now retains table cell positions, empty cells and merged-cell markers. Generation instructions distinguish illustrative rows from confirmed requirements and unknown answers from not-applicable answers.

Verification: unit/integration suite, production build and browser regression covering real XLSX extraction, mocked AI failure/retry, direct PRD routing, edit/reload, single-document Word export, mobile sizing and existing-output recovery. These UI tests do not measure real-model output quality. The supplied Word form was checked locally through the extraction endpoint; it was not sent to an AI provider.

### 23 October: resolve individual queries and continue from the PRD

- Every generated question/finding has Answer, Ignore and Reopen controls. Answers are attached to query identity, persisted in the project JSON and supplied to generation and AI change review. They survive regenerated outputs and appear in Word exports.
- Ignored queries remain explicit deferred decisions. Changed project inputs reopen them; a changed finding severity or source quote is a new finding. Answer changes invalidate previous reviews. None of these actions supplies an authenticated team approval.
- “Continue with this PRD” appears above and below the document. It offers a prototype, user stories or a test plan. Open questions do not block continuation. The chosen PRD, its status, questions and findings reach the next generation, including retry after failure.
- Validation: 241 unit/database tests; lint and production build; fictional browser coverage for answer/ignore/reopen, reload, failed generation, exports, all three next steps, mobile and shared-editor save/reload requests. Shared save regression uses a fake server and does not modify a customer's initiative.
- Follow-up requested: Figma design-system import for company components, typography and colours, with provenance and an explicit choice of which library/version governs generated prototypes. Existing design-reference connections are not equivalent to applying a complete brand system.

### Real-AI quality check follow-up

The user requested an end-to-end quality review after the UI fix. A fictional “Relay Desk” maintenance pilot was uploaded as XLSX to production, then generated a PRD, BRD and prototype using the configured real model. The first PRD/BRD contained excessive speculative questions, an invented default, weak boundary criteria and a manual/automatic pause inconsistency. Prompt instructions now require source-first rule fidelity, fewer material questions, observable criteria and a distinct business-oriented BRD.

The first prototype rendered and submitted a request, but a supposed edit added a second record and accepted a negative estimate. Its claims of role filtering, threshold enforcement and a global pause exceeded the renderer's capabilities. Generation now explicitly constrains itself to supported interactions and must disclose missing capabilities. The prototype inspector exposes scope/limitations. Conditional business rules and real role enforcement remain future runtime work, not verified capabilities.

Failure simulation previously restarted the iframe and lost entered data. It now updates the existing preview through a parent-validated message, preserving inputs and records for retry. A real-browser regression verifies failure → retained input → successful retry. Names are clipped safely in the preview navigation.

The repeat prototype request hit the application's 58-second deadline (production reference `dc3f2cff-8071-44aa-a8c1-187ca2e952a7`). SDK error classes use inherited Error names, so the previous name-only classifier mislabeled the abort as a generic rejection. The handler now recognizes actual SDK constructors and distinguishes deadline expiry from cancellation. Prototypes receive a 150-second request budget inside a 180-second route limit; documents keep 58 seconds. Automatic SDK retries are disabled so one click does not silently begin a second model request. Diagnostics record only class, status, stage and deadline state. See [OpenAI error guidance](https://developers.openai.com/api/docs/guides/error-codes).

Final real-run assessment: revised PRD/BRD each asked three material questions, but still sometimes treated undecided dependencies as exclusions and deferred pilot access controls without source authority. These outputs need human correction before engineering handoff. The retried prototype completed in 34 seconds with five screens; actual browser interactions passed required-field validation, simulated failure preserving input, and successful retry/list creation. Conditional approvals and record-bound editing did not pass. Deterministic capability checks now expose unbound updates, row navigation without detail binding, unsupported form updates and empty card actions; unbound actions no longer report success. Verdict: supervised internal pilot, not autonomous release-ready generation. Raw fictional evidence and downloads are in `.local-backups/relay-desk-qa-2026-10-23/` (not committed).
