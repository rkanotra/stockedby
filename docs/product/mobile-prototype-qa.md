# Mobile prototypes — 25 October 2026

## Behaviour

- Mobile uses a compact app header, Back action, collapsed screen menu, single-column forms, readable type and one anchored primary action group. Desktop and tablet remain available.
- Entered values survive navigation inside the preview, including the workspace's screen strip and journey map. Reset clears the simulation. Values are not stored across page reloads.
- Intermediate forms validate and continue without creating duplicate records. A review summary binds to the actual entered values. Confirmation checks its referenced fields, and simulated service failure keeps answers available for retry.
- Numeric bounds are enforced only when explicitly supplied. External services, calculations, real authentication and payments remain outside the simulator.
- The journey map derives its connections from actual prototype actions. The setup screen can show an existing upstream process flow. AI generation uses the chosen device, audience, source requirements and this flow.
- Existing prototypes receive the renderer improvements immediately. Rebuild with **Change prototype setup → Mobile → Rebuild prototype** to generate the new screen structure and bound summaries. Existing customer projects are not regenerated automatically.
- HTML downloads contain the same interactive runtime. SVG is explicitly a screen outline, not a faithful Figma export.

## References

The user's FH pipeline v2.7.1 informed device-first journeys, exact source fields, connected outcomes and scenario checks. No employer branding or policy library was copied. [UX Pilot's prototyping overview](https://uxpilot.ai/blogs/best-ai-prototyping-tools) informed the review of connected multi-screen journeys and mobile-specific structure; its vendor claims were not used as product guarantees.

## Verification

Fictional scenario: **Forma meeting-room booking**. Choose room/date/1–8 guests, enter name/email, review entered values, confirm, then start again.

- An actual `gpt-4.1-2025-04-14` response is retained as `scripts/fixtures/generated-mobile-prototype.json`. It produced four connected screens. Validation exposed a summary-confirmation action that the old runtime could not execute; the runtime now supports and validates it. No private project content was used.
- `test_generated_mobile_browser.mjs`: required inputs, numeric boundary, review data binding, Back/correction, simulated failure/retry, confirmation, reset and widths 320–430.
- `test_mobile_prototype_browser.mjs`: additional hand-authored fixture, viewport coverage through desktop, field validation and self-contained HTML export.
- `test_mobile_workbench_browser.mjs`: the generated fixture inside the actual workspace UI, external screen navigation retaining answers, device frame, real journey map, narrow host viewport and HTML download. Team APIs are mocked; no real workspace writes.
- `test_project_delete_browser.mjs`: owner-only controls, unavailable migration hides controls, explicit confirmation, cancel, backup download, stale-version failure, duplicate project names, correct ID/version targeting and reload after success. All deletion uses mocked data.
- `npm test`: 249 tests passed, including schema compatibility, journey reachability and database permissions/atomic deletion. Lint and production build passed.

These checks establish a functioning sample journey. They do not prove that every generated project's business rules or content are complete. Review generated scenarios against the project's actual requirements.

## Database rollout

Project deletion requires `supabase/migrations/202610250001_delete_team_project.sql` on the dedicated `stockedby-team` project (`ggffhcxkywngqijpyeqe`). At preparation time the dashboard session was expired, so application was pending owner sign-in. The API capability check keeps deletion hidden until the migration exists. Mobile improvements have no database migration dependency.
