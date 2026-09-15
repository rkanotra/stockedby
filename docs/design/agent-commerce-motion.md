# Agent commerce hero motion

Approved interactive concept implemented in the homepage hero on 15 September 2026.

The existing product display stays unchanged. A shopping-agent card progresses through a request, product discovery and verification, then waits for the visitor to approve an illustrative payment. Approval reveals a demo receipt. This component makes no checkout, payment or order API calls.

## Behavior

- Pause, resume and replay controls.
- Timers and CSS motion pause when the component leaves the viewport or the tab becomes hidden.
- Reduced-motion preferences show the approval state directly and complete instantly after approval.
- The approval action moves keyboard focus to the persistent player control; a polite status announces approval and completion states.
- Layouts adapt to desktop, tablet and mobile without horizontal overflow.

## Validation

- 105 unit tests pass, including approval gating, pause/replay and reduced-motion state transitions.
- ESLint and production build pass.
- Browser checks at 360, 390, 768, 1024 and 1440 pixels; approval card containment checked after responsive adjustments.
- Verified approval-to-receipt flow, keyboard focus after approval, pause/replay and offscreen pause in browser. No browser console errors observed.
- Reduced-motion behavior is covered by state tests and CSS; operating-system preference emulation was not exercised in browser.
