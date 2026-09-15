# StockedBy — remaining pages

Extends the approved homepage palette, shelf-S identity, serif highlights and Jakarta typography to How it works, Why StockedBy, Journal, all journal articles, Privacy, brand checks, audit/fix flows, saved reports, sign-in and the merchant dashboard. Includes a matching 404 and social preview image.

## Verification

- ESLint, all 102 existing tests and production build passed.
- Browser layout checks at 390px and 1440px: How, Why, Journal, one full article, Privacy, Test, Audit, Fix and Login. No horizontal overflow. Mobile 404 checked too.
- Brand-check flow: website → brand → market → product → questions. Product selection tested with Enter; stopped before submitting a scan.
- Local fixture: report summary, engine ranking, audit findings, expanded technical details, expanded product code, Shopify connection form and email dialog. No real scan or email submission.
- Email dialog: Tab wraps to Close and Escape dismisses. Background scrolling is locked while open.
- Production HTTP checks: all public page responses 200, dashboard redirects to login (307), missing pages and the removed fixture route return 404, share image returns PNG (200).
- Social preview image visually inspected from the production build.

## Scope and limits

The fixture page was removed before building. Fixture screenshots use clearly labelled synthetic data and are only design QA evidence. Captures show the design during review; editorial serif highlights were added after mobile captures. No authenticated Shopify sync, live paid model calls, report unlock or email delivery was exercised. Existing scoring, API, authentication, stored data and legal wording are unchanged. OS-level dark-mode/reduced-motion emulation was not exercised; local light theme and reduced-motion CSS rules are present.
