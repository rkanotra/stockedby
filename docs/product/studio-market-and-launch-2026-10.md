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
