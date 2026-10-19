# ASCENT — deployment and owner guide

Updated 18 October 2026. Production: https://stockedby.com/ascent.

## What is live

ASCENT is a private section of the existing StockedBy Next.js 16.4 / React 19 app on Vercel. It includes executive scenarios, storytelling, CDO interviews, a recording studio, daily check-ins, an editable roadmap to March 2027, and a searchable private library. Answers are free-form. The server generates evidence-backed coaching, a stronger draft, and a follow-up. Revisions preserve the original attempt. Progress counts only completed sessions.

The interface uses the installed apple-design skill's principles: restrained hierarchy, direct feedback, visible save states, keyboard focus, responsive navigation and reduced-motion support. This is an implementation and testing record, not an Apple certification or a claim of exhaustive usability testing.

The practice programme contains 50 executive scenarios, 50 storytelling assignments, 50 recording assignments and 50 CDO interview questions: 200 exercises across ten capabilities and four levels. Filters cover module, capability, level and review status. Recommended practice advances through unreviewed exercises. Original scenario/interview IDs remain valid, and coverage counts unique ready exercises rather than repeat attempts or custom topics. Writing and recording assignments share business contexts with distinct tasks.

## Services and configuration

Reuses the existing StockedBy Supabase project and email-link sign-in, server-side OpenAI key, Vercel deployment and CSS modules. No separate app, hosting subscription or service-role key is required. All private API requests require the verified email `rahulkanotra1101@gmail.com` and enabled ASCENT membership server-side. Database and private storage policies enforce the same owner-only condition through `ascent_allowed()`. Other StockedBy accounts retain team access but cannot access ASCENT. The Ascent sign-in form rejects other addresses before sending a link; existing verified owner sessions can continue without signing in again.

Required environment variables are already configured in production:

- `OPENAI_API_KEY`
- `STUDIO_SUPABASE_URL`
- `STUDIO_SUPABASE_PUBLISHABLE_KEY`

Optional overrides: `ASCENT_OPENAI_MODEL` (default `gpt-5.4-mini`) and `ASCENT_TRANSCRIPTION_MODEL` (default `gpt-transcribe`). Keys stay server-side. ASCENT is excluded from analytics and indexing. The public page shell contains no saved practice or account information.

Ascent email sign-in returns to `/ascent`; team sign-in continues to `/workspace`. Both reuse the existing Supabase callback URL. A one-hour, HttpOnly, SameSite=Lax navigation cookie records the fixed Ascent destination and is consumed on callback; a subsequent successful team sign-in request or sign-out clears it. Only the exact `/ascent` value is accepted, never arbitrary redirect URLs. Open the newest email link in the same browser used to request it (the existing PKCE flow). Invalid links return to the originating section with a retry message. Session renewal runs through authenticated route handlers so refreshed cookies can be saved correctly.

## Main source files

- `app/ascent/page.js` — public loading shell, then private authenticated entry.
- `components/ascent/Ascent.js` and `ascent.module.css` — studio interfaces.
- `app/api/ascent/` — authenticated library, review, upload, processing and session endpoints.
- `components/ascent/Programme.js`, `lib/ascent/curriculum.js` — searchable extended practice programme.
- `supabase/migrations/202610180001_ascent_owner_only.sql` — verified owner-only database/storage restriction; applied successfully.
- `lib/ascent/access.js`, `lib/auth/teamReturn.js` — exact account restriction and fixed login destination.
- `lib/ascent/catalog.js`, `schema.js`, `ai.js` — training content, validation and coaching contract.
- `lib/ascent/media.js`, `processing.js`, `database.js`, `server.js` — media processing, job leases and access checks.
- `supabase/migrations/202610170002_ascent.sql` — new ASCENT-only tables, row-level policies, bounded commands and private storage bucket. Applied successfully; existing team projects remain intact.
- `lib/ascent/*.test.js` — AI contract, validation, database isolation, quotas, retries and media tests.
- `scripts/test_ascent_media.mjs` — explicit opt-in real-AI synthetic media test; never run routinely against paid APIs.

## First 90-second recording

1. Sign in, open `/ascent`, choose **Recording studio**, a topic, audience and 90-second target.
2. Use the talking points: hook, business problem, trade-off, recommendation, measure, takeaway.
3. For the first test, use iPhone Voice Memos and save the M4A to Files. This avoids large video sizes. For video, export or trim a MOV/MP4 to under 50 MB; a full-resolution iPhone video may exceed the limit.
4. Read the privacy notice, confirm the recording contains no confidential information, then choose the file and upload.
5. Wait for Processing → Transcribing → Reviewing → Ready. The session remains in the private library if you leave. Failed jobs have a retry action.
6. Play the recording, inspect the transcript and coaching, add notes at specific seconds, and export the report. Upload a second take from the review to compare attempts.

## Limits and honest assessment boundaries

- Maximum 50 MB and three minutes per recording; MOV, MP4, M4A, WAV, MP3 and WebM accepted subject to real file validation and decodable audio.
- 500 MB per user, 1,000 sessions, 30 review attempts and 10 media processing attempts per UTC day. Up to three processing attempts per session; retries count toward daily limits. Each attempt permits at most one automatic format repair (two model calls total), with cumulative token usage saved on success. Provider errors and incomplete responses are not automatically retried.
- Direct uploads go to a private bucket, avoiding Vercel's request-body limit. Playback links expire after five minutes.
- Vercel `after()` continues processing after the request, with a five-minute function/job lease. This is not a separate durable worker service: stalled jobs require a user retry after the lease expires.
- FFmpeg extracts audio; OpenAI transcribes it; the coaching model reviews the transcript. Duration and approximate words/minute are measured from extracted audio duration and transcript length. Fillers may be omitted by transcription.
- No acoustic delivery, emotion, eye-contact, body-language or video-frame analysis is claimed. Default transcription does not provide automatic segment timestamps; manual timestamped notes work.
- Reports are AI judgements about an attempt, not objective career-readiness or employment predictions. Model, rubric, prompt and audience can affect scores.
- Nothing is published publicly. Titles and captions are export drafts only.

## Retention and recovery

Saved sessions and recordings remain until the owner deletes them. Deleting a session removes its media, transcript, report and notes. A failed storage deletion keeps a tombstone so deletion can be retried. Abandoned upload entries should be removed from the library to release reserved quota. Previously downloaded files remain on the user's own device.

Export important reports and retain original recordings separately. This release does not add scheduled backups or guarantee point-in-time recovery. Existing Supabase plan availability and retention apply. `store: false` is sent for coaching responses; this does not promise zero retention across all provider systems. Do not upload employer/customer secrets or personal identifiers.

## Verification record

- Full automated suite: 218 passing tests; ESLint and production build pass.
- Programme checks cover all 200 exercise IDs, legacy progress, unique coverage, canonical server-side assignment prompts and revision context. Browser checks verify module/level filters, assignment launch and a 390px layout with no horizontal overflow.
- Redirect checks cover Ascent, default team and malicious destination hints; invalid callbacks clear the hint. A fresh successful email-link callback has not been manually clicked for this release.
- Database tests use a local PostgreSQL-compatible test instance: unauthorised access, cross-user isolation, forbidden direct writes, private storage paths, duplicate claims, stale leases, quotas, settings conflicts and deletion.
- Real production CBO review: completed, with five scored dimensions, a rewrite and a relevant follow-up; saved response survived reload; exported report downloaded successfully. The first attempt failed validation/processing; after tightening the response schema, retry completed. The initial error did not record enough detail to establish its precise cause, so safe diagnostic categories were added.
- Real audio smoke test: synthetic 16.72-second M4A, real FFmpeg extraction, `gpt-transcribe` transcription and `gpt-5.4-mini` coaching completed. Storage/database were mocked for this particular test; it is not proof of production upload or iPhone playback.
- Synthetic MOV/M4A extraction, oversized-duration rejection and renamed-text rejection pass locally.
- Responsive 390×844 layout verified using the actual component with a temporary local fixture: no horizontal overflow, usable input/review action and navigation. The temporary route was removed before deployment.
- Signed-out Ascent APIs return 401; page source contains no private test answer. Home, Studio and Workspace return 200.
- Real AI test spend is estimated below US$0.10 including the written retry, within the approved US$1 budget. This is a conservative estimate based on capped outputs and the published model prices, not a retrieved invoice. [Coaching model pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [transcription pricing](https://developers.openai.com/api/docs/pricing).

### Still requires device acceptance

Actual iPhone Safari MOV/M4A selection, direct production upload, production FFmpeg execution, playback on a second device, and reconnect during upload have **not** been verified end to end. Chrome's automation file upload was blocked by its extension file-access setting; no recording was represented as uploaded when it was not. Use the first-recording guide above for this final acceptance check. Story/interview modes share the tested review engine and have automated prompt-contract coverage, but were not each given an additional paid live review.

## 18 October — saved review recovery

Production logs showed repeated `Review response could not be validated` failures for scenario reviews, including a follow-up and its retry. This confirms review validation failed after the response was saved; the old diagnostics did not identify the specific field. The AI schema previously allowed empty essential strings and unlimited strings/arrays, while local validation rejected them; an empty supplementary coaching note also incorrectly failed the entire report.

The schema now matches the validator's length/count bounds, requires essential text, accepts an empty optional coaching note and allows one bounded format repair. Safe diagnostics identify the failed response field without logging private content. Failure copy no longer advises shortening an already short answer. Failed written responses can be edited into a new review while preserving the original question and recovery reference. No database migration is required.

Saved sessions now have an opaque URL fragment and are loaded from the authenticated API on refresh. Library views also survive refresh. Refresh status explicitly reloads the current saved session; entering the library/programme/dashboard refreshes their data. Unsaved text remains a draft with the existing leave-page warning; this release does not claim draft autosave.

Regression coverage includes empty optional notes through the processing pipeline, missing essential fields with bounded repair and cumulative usage, failed follow-up recovery, and valid/invalid session navigation.

Production acceptance for the recovery release (`ad54365`): the owner approved one retry of the saved failed follow-up, capped at US$0.10. The same session completed with a real AI report and the original answer intact. Its returned coaching note was empty and the substantive review remained valid. Refresh status, full page reload and opening the saved session link were checked in authenticated Chrome; no second AI submission was needed for those reads. All four existing sessions remained in the online library. Signed-out Ascent API returned 401; Ascent, Workspace and home returned 200. The paid test is estimated below US$0.05 from the bounded output allowance and model pricing, not an invoice measurement. No additional audio test was run.

## 19 October — password sign-in

Ascent now uses email/password sign-in through `/api/ascent/auth`, retaining the existing verified owner restriction, Supabase identity, secure session cookies and database policies. It does not create new users or bypass membership. Passwords are verified/stored by Supabase, never hardcoded into client code or stored in application tables. Team email-link sign-in remains available through the team workspace.

The signed-in **Account & sign-in** view lets the owner set a password with matching confirmation, then use it from another browser without an email link. Supabase enforces its configured policy; the form requires at least six characters, so the requested five-character password cannot be used. Setting a credential requires the user to enter and submit it personally in the browser. Successful real password sign-in remains pending that one-time setup. No database migration or new environment variable is needed.

Password requests require same-origin checks and bounded request bodies. App-level throttling is per-process (resets on cold starts), supplemented by Supabase Auth's provider limits. Neither passwords nor auth tokens are returned in endpoint JSON or logged. Regression tests cover verified-owner sign-in, rejected alternate emails, invalid credentials, disabled/unverified accounts, provider throttling, and password confirmation.

### Password setup recovery

The signed-out gate now offers **Set or reset password**, using the existing email verification flow with account creation disabled for Ascent. Successful verification returns to the fixed `/ascent#view=account` destination; failed callbacks return to the sign-in gate with recovery instructions. Owner and enabled membership checks remain in force for password updates and private data. The emailed link must open in the same browser that requested it (PKCE).

All 219 tests, ESLint and production build pass. Chrome's existing owner session was verified to reach the actual account form; Codex's separate browser was signed out. Actual password saving and subsequent password login still require user completion and have not been verified. No recovery email was sent during this change.
