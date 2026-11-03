# Investment desk design review — 3 November 2026

Historical review of the earlier apricot/light-default release. Superseded by the [Raycast direction](market-desk-raycast-review.md), selected by the owner later on 3 November.

This is a comparison of public product pages and available product previews, not an independent user study or a claim of global-best quality.

| Reference | Observed strength | Applied to StockedBy |
| --- | --- | --- |
| [Robinhood](https://robinhood.com/us/en/) | Clear hierarchy, strong primary action, restrained interface chrome | One main action per private section; compact navigation. Use apricot instead of its bright green. |
| [Public](https://public.com/) | AI briefings and explanations placed in the investing context | Research entry points beside charts and holdings, with a distinct lavender surface. |
| [Koyfin](https://www.koyfin.com/) | Market research, portfolios and customizable data views form one product | Public chart/heatmap/screener navigation; clearly separated personal holdings. |
| [Sharesight](https://www.sharesight.com/) | Consolidated portfolio view and an explicit import/setup path | Import → preview → confirm, allocation, separate cost/P&L/coverage; mobile holding cards. |

## Release changes

- Warm ivory and apricot identity, lavender research panels and pale blue tracking panels.
- Optional dark mode, remembered on this browser and shared between tabs; light remains the default.
- TradingView charts, heatmap and screener use the selected appearance. A theme change remounts the widget with its new configuration.
- Private overview shows actual priced holdings, missing-price coverage and concentration. No invented performance series.
- Browser Back and refresh preserve the private section. Section navigation returns to the top.
- Desktop holding table and mobile cards retain exact quantities and distinguish unknown values from zero.
- Saved research picker displays one report at a time.
- Optional position details are progressively disclosed; import shows ready/skipped counts.
- Pastel text contrast was checked and strengthened, with keyboard focus and reduced-motion behavior retained.

## Validation

- Production build and ESLint pass.
- Existing suite: 267 tests passed.
- Browser checks use fictional local state; no real holdings or paid AI runs were changed for UI testing.
- Add position → save → reload preserves a long decimal quantity.
- CSV preview identifies duplicate rows and imports the ready row only.
- A simulated version conflict keeps the edit dialog and draft visible.
- Research selector shows the selected report alone.
- Desktop (1440 px) and phone (375/390 px) checked for overflow and readable controls.
- Theme switch, refresh persistence, page-to-page persistence and matching chart configuration checked.

## Remaining product gaps

A visual refresh does not create live valuation coverage. Public widgets are separate from the private portfolio. A licensed data feed covering the actual holdings is still needed for reliable automatic equity valuation across the target exchanges.

MCP is a connection protocol, not a data license or availability guarantee. Use direct feeds for deterministic price calculations and selected MCP tools for research. [NSE's published MCP terms](https://www.nseindia.com/nse-mcp) restrict its free data to informational, non-commercial use. [TradingView's widget FAQ](https://www.tradingview.com/widget-docs/faq/data/) says widget data cannot be exported or obtained through a widget data API. Neither should be presented as a universal commercial portfolio-price feed.

Further investment should prioritize verified data coverage, freshness monitoring and actual pilot usability sessions before additional decorative features or more connectors.
