# StockedBy homepage rebuild

## Direction

An original shopping-shortlist identity: a new S-shaped shelf mark, editorial type, original studio artwork, and a white/charcoal base with terracotta actions, mist-blue report panels and a warm closing section. Copy rewritten with user authorization. The final colour pass responds to the request for a little more colour without returning to the multicolour pastel design.

## Implementation

- `app/page.js`: preserves existing metadata, canonical and structured data; renders the new homepage. Structured-data logo points to the new local asset.
- `components/home/Homepage.js`: server-rendered homepage content and sections.
- `components/home/home.module.css`: scoped responsive design and reduced-motion rules.
- `components/home/Navigation.js`: desktop navigation and accessible mobile disclosure with Escape/focus-leave dismissal.
- `components/home/ExampleReport.js`: keyboard-operated assistant tabs, actual rankings, destination comparison, dates and cited sources.
- `components/home/Brand.js`, `public/brand/stockedby-mark.svg`, `app/icon.svg`, `app/apple-icon.png`: new identity.
- `components/DomainCheckForm.js`: original safeDecode/encodeURIComponent handoff preserved; visible label and actual navigation-pending state, duplicate-submission guard.
- `lib/heroExample.js`: exposes existing snapshot citations to the preview. No scoring or data changes.
- Shared Nav/Footer and the existing login, dashboard, report, privacy, test, audit and fix headers: logo replacement only. Their page themes and functionality are unchanged.
- `public/brand/commerce-shelf.png`: original generated source artwork; `commerce-shelf.webp`: optimized 32,670-byte serving asset. No third-party brand imagery.

The old preview combined ChatGPT's actual #2 rank with a static #1 summary and hard-coded 24%/39%/37% voice-share figures. Those ungrounded summary figures are omitted in the rebuilt preview. Each assistant's actual rows remain unchanged. Claude's historical August 18 snapshot is labelled as collected, rather than live. The page explicitly explains that Claude's question differs and the snapshots have different dates. No working full-example report link existed; no fictitious report destination was introduced.

## Checks performed

- `npm run lint`: passed.
- `npm test`: 102 tests passed.
- `npm run build`: passed, including Next's TypeScript phase and static generation. There is no separate type-check command in package.json.
- `git diff --check`: passed.
- Browser: 360, 390, 430, 768, 1440px. All have document width equal to viewport width; no horizontal overflow. Inspected actual desktop/mobile/tablet renders and refined layout, typography, artwork and colour afterward.
- Mobile Menu open/close, Escape dismissal; report ArrowRight, Home and End keys switch the selected tab and its actual content.
- Long percent-encoded website: decoded, trimmed and carried into /test correctly. Observed the genuine pending button become disabled before navigation completed.
- Invalid text `not a domain` still enters the existing wizard, matching the original homepage's permissive handoff. The wizard owns subsequent validation. No new domain-validation policy added.
- No browser console errors in the final local homepage session.
- Explicit computed `color-scheme: light` and light background verified at all five widths.
- Contrast: ink/paper 14.40:1; muted/paper 5.60:1; muted/blue 5.23:1; muted/warm 4.87:1; white/terracotta CTA 6.06:1; meaningful form boundary/white 3.50:1.
- CTA focus sheen captured from the browser, 12 frames spanning 1.864 seconds, assembled as an animated WebP. Decorative artwork is static. Entrance and tab transitions are finite; there is no continuous motion requiring a pause control.

## Evidence

- `homepage-360.png`, `homepage-390.png`, `homepage-430.png`, `homepage-768.png`, `homepage-1440.png`: final full-page captures.
- `hero-desktop.png`: desktop hero.
- `cta-sheen.webp`: recording of the actual focus sheen, with `sheen-*.png` and `frame-times.json` as captured frames/timing.

## Limits

- No paid AI scans, production writes, deployment, authentication, billing or integration tests were performed.
- Form verification stops at the existing wizard. It is not a live end-to-end AI-report test.
- Reduced-motion CSS is implemented, but OS/browser preference emulation and actual 200% browser/text zoom were not verified with the available browser interface. No claim is made that those checks passed. Dark-preference behaviour is protected by the scoped explicit light scheme; a dark-preference emulation was not completed.
- Historical example snapshots are not new measurements. Artwork is decorative, not a customer endorsement.
- Existing unrelated page styles and social-preview artwork were not redesigned.

## Preview and commit

From the repository:

```sh
npm run dev
```

Open http://localhost:3000 and review the changes. Then:

```sh
git status --short
git diff --stat
git add app components lib/heroExample.js public/brand docs/design/rebuild
git diff --cached --stat
git commit -m "Rebuild StockedBy homepage and refresh brand identity"
```

The staging command includes the changed application files, new homepage components, local artwork and verification evidence. Check the staged list first if you have made additional changes since this task. A commit saves the changes locally. It does not publish the website. Nothing has been committed or pushed by this task.
