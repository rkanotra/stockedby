# Team workspace pilot

## Routes and storage

- `/workspace`: authenticated shared workspace.
- `/workspace?demo=1`: fictional walkthrough; changes remain in memory and reset on reload.
- `/studio`: existing browser-local studio; it is not automatically uploaded.
- Supabase project: `stockedby-team`, reference `ggffhcxkywngqijpyeqe`. This is separate from Finpeel and the retired StockedBy database.
- Apply `supabase/migrations/202610170001_team_workspaces.sql` once to an empty dedicated project. It was applied on 17 October 2026. Do not run the unrelated legacy migrations for this feature.

Server configuration: `STUDIO_SUPABASE_URL`, `STUDIO_SUPABASE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`; optional `STUDIO_OPENAI_MODEL` (defaults to `gpt-4.1`). No service-role key is needed. RLS and the authenticated database command enforce membership and role permissions.

## Email and first team

1. Configure custom SMTP in Supabase Auth for teammate sign-in. The default provider restricts recipient addresses and is unsuitable for the team pilot. The prepared Resend settings require the owner's existing API key and a verified sender address. Never commit that key.
2. Set Site URL to `https://stockedby.com/workspace` and allow `https://stockedby.com/api/team/auth/callback`. Local testing currently also allows `http://localhost:3002/api/team/auth/callback`.
3. Sign in from `/workspace` and open the magic link in the same browser. Create the workspace, then create or import an initiative.
4. From People & access, create an email-bound invitation. Copy and share it yourself; StockedBy does not send invitations automatically. Invitations expire after seven days and can be revoked. The teammate signs in with the invited email and accepts.
5. Invite an independent reviewer. Authors cannot decide on their own AI proposals, even when they are workspace owners.

## Roles and review rules

| Role | Permissions |
| --- | --- |
| Owner | Manage membership, edit initiatives, request AI changes, review another author's proposal |
| Editor | Edit initiatives, request AI changes, discuss work |
| Reviewer | Read documents and prototypes, discuss work, decide on another author's proposal |
| Viewer | Read initiatives and review history |

AI change review sends the saved initiative's editable text, sources, grounded confirmed rules and decisions to OpenAI with `store: false`. It prepares replacements for supported text fields only. Questions block approval. Approval validates the exact project revision and original text before applying all changes atomically. It records the authenticated reviewer and decision. Downstream documents and prototypes are marked as needing review; prose approval does not execute tests or update prototype behaviour, Jira or Figma.

Editors can directly save their own manual edits without an approval step. This release gates AI proposals, not all document changes. AI proposal records are not a cryptographic attestation of model authorship; authenticated editors can also call the database proposal command.

## Collaboration and operating limits

- Shared editing uses an isolated draft with explicit **Save to team**. Version checks reject a stale save; the draft remains available to download before loading the latest revision. There is no simultaneous text merge or live cursor presence.
- The overview refreshes every 15 seconds and on focus, except while editing.
- API lists return up to 150 rows per table. Pagination and large-workspace reporting are not implemented; keep the initial pilot small.
- Each workspace can start 50 AI change reviews per UTC database day. Failed model calls consume an attempt. This limit is persisted in the database; ordinary local-studio generation has its existing limits.
- Save a JSON backup from the editor regularly. The activity log and proposal before/after text are not a complete versioned backup of every initiative. Review the Supabase plan's backup and availability provisions before accepting production-critical work.
- No SSO, enterprise retention controls, billing or compliance certification is claimed by this pilot. A second teammate's live invitation acceptance and approval still need pilot verification.
- Private studio/workspace routes and invitation tokens are excluded from Google Analytics.

## Checks

`npm test` includes PostgreSQL-compatible PGlite tests for outsider isolation, role permissions, bound/expired/used invitations, token-hash restrictions, author separation, stale saves/reviews, prohibited patch paths, revocation and the persisted AI quota.

Run `npm run lint` and `npm run build` before deploying. An optional live smoke check is `node --env-file=.env.local scripts/test_team_ai.mjs`; it sends only the fictional Orbit sample to OpenAI and prints counts, not credentials or company content.

### Production verification — 17 October 2026

- Resend delivered the confirmation email; Supabase recorded successful verification and login. The owner reached the authenticated workspace in Chrome.
- Created `StockedBy product team` with the owner as its sole member and a clearly labelled fictional Orbit pilot sample.
- Edited the sample, saved version 2 to the team database, reloaded the page and verified that the name, document set and version persisted.
- The first live AI request was safely rejected for an unsupported edit or evidence reference. Generation now constrains target and evidence IDs to the supplied revision using Structured Outputs enums, while retaining server-side validation. This follows [OpenAI's supported JSON Schema constraints](https://developers.openai.com/api/docs/guides/structured-outputs).
- Automated tests cover independent approval and atomic application. This is not a claim of a completed two-person production review.
