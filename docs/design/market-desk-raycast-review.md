# StockedBy design reference review — 3 November 2026

The owner selected **Raycast** after reviewing the shortlist below. The earlier ivory/apricot direction is superseded. These are observations of public websites and visible product previews, not a usability study or an objective ranking of the world's best products.

## Ten references checked

| Website | What makes it useful | What StockedBy should learn |
| --- | --- | --- |
| [Raycast](https://www.raycast.com/) — selected | Near-black surfaces, vivid directional light, precise type and floating navigation | Confident identity with short motion; information stays readable |
| [Linear](https://linear.app/) | Quiet chrome, sharp hierarchy and careful product detail | Compact controls and consistent spacing in the workspace |
| [Robinhood Legend](https://robinhood.com/us/en/legend/) | Strong contrast and an organized trading product | Useful market information before long marketing explanations |
| [Public](https://public.com/) | Investing context and AI research together | Research starts from the company or portfolio question on screen |
| [Quartr Pro](https://quartr.com/products/quartr-pro) | Company research, source material and AI in one workflow | Evidence beside analysis, linked to filings and calls |
| [Fiscal.ai Terminal](https://fiscal.ai/products/terminal/) | Distinctive presentation around deep company data | A clear path from company overview to metrics and research |
| [Perplexity Finance](https://www.perplexity.ai/finance) | Search, summaries, asset views and heatmaps | An obvious AI entry point with structured market context |
| [Revolut](https://www.revolut.com/) | Bold hierarchy and energetic consumer presentation | An obvious next action, including on a phone |
| [Wealthsimple](https://www.wealthsimple.com/en-ca) | Editorial identity and playful visual campaigns | A welcoming financial product that retains clarity |
| [Framer](https://www.framer.com/) | Product demonstrations, strong typography and controlled motion | Demonstrate working features rather than decorative claims |

Fey was considered but excluded: its current site says it joined Wealthsimple and closed new sign-ups.

## Applied direction

- Dark by default; explicit saved light preferences still work. Theme changes also update widgets.
- Near-black surfaces, violet/blue accents, neutral text and directional light. No orange brand palette.
- Compact navigation, shorter market heading, chart/watchlist area and a phone layout.
- Short entrance animation; reduced-motion and reduced-transparency preferences respected.
- No fictional portfolio balances or price histories.
- India and US are active. Legacy records are preserved but excluded from automatic scan scope.
- Screenshot import: choose/drop/paste → explicit AI read → edit rows → duplicate check → confirm. CSV and manual entry remain.

## Validation

- Production build completed; 273 automated tests passed.
- OCR tests cover exact fractional units, unknown cost, incomplete responses, selected rows, currency mismatch, snapshots excluded from live valuation and duplicates when the exchange is omitted.
- Real OpenAI test on a fictional two-row screenshot correctly extracted currencies/exchanges, kept `1.23456789` shares intact and left missing cost blank. Model `gpt-4.1-mini-2025-04-14`: 1,336 input and 110 output tokens. No real holdings transmitted or saved.
- Dark/light desktop inspected. At 390 px, decorative overflow was found and fixed; document width equals viewport width.
- Default-dark, explicit light and blocked browser storage covered by tests.
- Existing database tests cover authorization, quotas, version conflicts and portfolio isolation.

This release does not claim global-best usability or add an automatic broker connection. Prioritize coverage and pilot observation next. See [the feed and company-research plan](../product/india-us-data-and-research.md).
