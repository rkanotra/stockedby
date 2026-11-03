# India and US data plan — 3 November 2026

## Accounts to use

| Need | Recommended starting point | Important limit |
| --- | --- | --- |
| ICICI Direct Indian holdings and quotes | Activate the existing account's [Breeze API access](https://api.icicidirect.com/apiuser/home) | Technical documentation supports NSE/NFO; do not promise BSE/MCX. Sessions require renewal through broker login. |
| US market data for a private pilot | [Alpaca developer/paper account](https://docs.alpaca.markets/us/docs/about-market-data-api), Basic data | Free real-time data is IEX-only, not consolidated US data. Does not sync Wio holdings. |
| Wio US holdings | Screenshot, statement/CSV or manual import | No public retail Wio Invest holdings API was verified. Its published banking API is not evidence of investment-account support. |
| US filings and fundamental facts | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | No API key needed; filings/XBRL, not prices. Respect fair-access requirements. |

[Breeze documentation](https://api.icicidirect.com/breezeapi/documents/index.html) lists 100 calls/minute and 5,000/day. Its [session-key explanation](https://www.icicidirect.com/futures-and-options/api/breeze/article/what-is-a-session-key-and-how-to-generate-it-for-using-breezeapi) says sessions expire after 24 hours or midnight, whichever comes first. Build a visible reconnect state, not a stored-password/TOTP workaround.

Alpaca Basic documents 30 WebSocket symbols, 200 historical calls/minute and a restriction on the latest 15 minutes of history. Exchange entitlements and public redistribution rights must be checked separately before displaying a personal-account feed to all users.

[NSE MCP](https://www.nseindia.com/nse-mcp) offers useful end-of-day and near-real-time information, but its free-use terms are informational/non-commercial. MCP is a protocol, not a data license, uptime guarantee or brokerage connection.

TradingView widgets remain embedded public tools. Their displayed quotes do not enter portfolio valuations. That needs an authorized structured feed with instrument identity, currency, source and timestamp.

## Screener.in observations

Public pages inspected: [Avantel consolidated](https://www.screener.in/company/AVANTEL/consolidated/), [screen discovery](https://www.screener.in/explore/) and [golden crossover](https://www.screener.in/screens/336509/golden-crossover/). Login-gated forecasts, custom-query execution and announcement search were not tested.

Strong patterns:

1. Company pages combining financial history, peers, quarterly results, valuation and ownership.
2. Source documents: annual reports, exchange announcements, credit ratings, calls and transcripts.
3. Explicit formulas: the crossover screen exposes `DMA 50 > DMA 200 AND DMA 50 previous day < DMA 200 previous day`.
4. Working capital, cash conversion and cash flow beside earnings.
5. Watchlists and changes over time that give users a reason to return.

These are patterns to implement with authorized sources, not permission to copy its dataset. [Screener's terms](https://www.screener.in/guides/terms/) describe personal, non-commercial use. Premium is not a redistribution license.

## Prioritized product work

1. Reliable portfolio coverage: reconnect status, listing matches, timestamps and missing-price coverage before combined totals.
2. Company research: sourced financial history, peers, filings and announcements. Each fact needs its period, currency/unit and consolidated/standalone basis. Missing never means zero.
3. Explainable screens: AI translates requests into visible deterministic filters; show the formula and missing-data exclusions.
4. Portfolio impact: connect a sourced development to held companies, distinguish fact from interpretation and show the opposing case.
5. Change tracking: guidance versus results, filing revisions, corporate actions and deduplicated source-based alerts.

The current release has public chart/screener widgets, source-linked news, private holdings, imported metrics/history, conditional AI research, scheduled scans and reviewed screenshot imports. It does **not** yet have the full Screener financial dataset, live ICICI connection, Wio holdings API or consolidated real-time US portfolio pricing.
