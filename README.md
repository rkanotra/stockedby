# StockedBy

An investment research desk for India, UAE and US markets, plus metals and crypto.

- `/` — light public website.
- `/brief` — public, region/topic-filtered market headlines, IPO and fund discovery.
- `/terminal` — invited users' private portfolios, watchlists, source-linked AI research, daily history, screens and alerts.

Older commerce, product-studio and Ascent entry points redirect to the new site. Their records remain intact. Their APIs return 410; the existing authentication callback and mail webhook remain available.

## Development and verification

Run `npm run dev`, `npm test`, `npm run lint`, and `npm run build`.
For the isolated fictional-data browser journey, start port 3004 and run `node scripts/test_terminal_browser.mjs`.
It checks desktop/phone rendering, save/reload, exact quantity retention, import deduplication, charts, settings and version conflicts.
The SQL tests use PGlite to exercise roles, ownership, version checks, run locks and scoped job access.

## Production configuration

Apply `supabase/migrations/202611030001_terminal.sql` in a transaction to the existing StockedBy team project. No personal positions are included. Existing verified owner access is seeded; the owner can invite pilot accounts from Settings. Every user has a separate portfolio, with RLS and protected mutation functions.

Required server-only variables: `STUDIO_SUPABASE_URL`, `STUDIO_SUPABASE_PUBLISHABLE_KEY`, and `OPENAI_API_KEY`. Research defaults to `gpt-5.4-mini` through the Responses API with web search, strict structured output, `store:false`, returned-source validation and usage accounting. `TERMINAL_OPENAI_MODEL` overrides the model; estimates are withheld for unknown pricing. `TERMINAL_AI_PROVIDER=gemini` selects the existing Gemini client instead. Never expose keys in browser code.

Set a random `CRON_SECRET` of at least 40 characters in Vercel. Enable tracking for an account in Settings: only its hash is stored in Supabase. Jobs can read/cache/scan configured accounts but cannot edit holdings, invite people or enable themselves. The pilot scheduler supports at most three accounts; expansion requires a durable queue.

`vercel.json` invokes two separate daily jobs at 06:00 and 15:00 UTC. On Vercel Hobby they run during 10:00–10:59 and 19:00–19:59 Asia/Dubai, respectively. One bounded regional research request runs per account per window. Daily account limit: 12 research runs; all runs: 30/hour. These are request limits, not guarantees of a fixed dollar bill. Check provider billing and project-wide quotas separately. Alerts are in-app only.

## Data coverage and limitations

- Headlines: selected Google News RSS lanes, publisher links, timestamps, deduplication and one-hour cache. Not exhaustive; IPO headlines are not a verified subscription calendar.
- FX: ExchangeRate-API open feed, daily indicative conversions with attribution; rates older than 72 hours are unavailable.
- Crypto: Coinbase Exchange USD spot and up to 299 completed daily bars, restricted to the original owner's personal research. Not redistributed publicly or sent to AI.
- Equities/ETFs: no licensed automated quote/fundamentals feed yet. Sourced OHLCV and ratio CSV imports are supported. Missing, stale and unmapped positions are excluded from totals, never priced at zero.
- Metals: broker product and unit must be confirmed. A spot quote is not substituted for a broker product.
- Technical observations use verified adjustment basis. Common-date comparisons are native-currency price returns, excluding dividends. Corporate actions do not automatically alter user quantities.
- Research shares security identifiers and optional research preferences, not account labels, position quantities or balances. AI statements remain analysis; a returned source URL does not establish that every claim is true. Unknown dates and unsupported facts remain gaps. Public research was exercised with OpenAI on 3 November 2026; Gemini returned depleted-credit status.
- No trade execution, brokerage connection, exchange-wide live screener, or promised investment returns.

## NSE MCP investigation

Both official servers completed initialization and returned tool lists (21 bhavcopy and 15 market tools):

- `https://mcp.nseindia.in/bhavcopy/cm/mcp`
- `https://mcp.nseindia.in/cmmkt/mcp`

The supplied `nseinsiia.in` spelling is not used. [NSE's official documentation](https://www.nseindia.com/nse-mcp) describes delayed market data and raw history, and limits use to informational/educational noncommercial purposes. These endpoints are not used as a public or commercial StockedBy price feed. Commercial display and use rights must be established first.

Reference terms: [Coinbase market data](https://www.coinbase.com/legal/market_data), [open FX feed](https://www.exchangerate-api.com/docs/free), [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search), [GPT-5.4 mini pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini).
