# StockedBy

An investment research desk for India and US holdings, with a separate public daily dashboard for markets, weather and headlines.

- `/` — light public website.
- `/brief` — public, region/topic-filtered market headlines, IPO and fund discovery.
- `/terminal` — invited users' private portfolios, watchlists, source-linked AI research, daily history, screens and alerts.
- `/terminal#Screener` — market discovery beyond owned holdings, with dated catalysts, risk flags, US movers and search-attention topics.
- `/dashboard` — mobile/full-screen clock, weather, Sensex, Nasdaq, metals, Bitcoin, FX and regional news.

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

`vercel.json` invokes two separate daily jobs at 06:00 and 15:00 UTC. On Vercel Hobby they run during 10:00–10:59 and 19:00–19:59 Asia/Dubai, respectively. Each window checks regional holdings and then runs regional market discovery; an empty portfolio does not disable discovery. This uses up to four AI requests per account per day, plus manual requests. They run sequentially because each owner has a single database run lease. Scheduled provider retries are disabled to reserve time within the 300-second function deadline. Daily account limit: 12 research runs; all runs: 30/hour. These are request limits, not guarantees of a fixed dollar bill. Check provider billing and project-wide quotas separately. Alerts are in-app only.

## Market discovery and company research

The scanner combines bounded US mover screens, Google News leads, Google Trending Now topics and web-search-backed analysis. Company signals need a returned source URL, publication/event dates, an identifiable listing, a business mechanism, contrary evidence and a next check. Insider purchase signals require an SEC/exchange filing and an open-market purchase classification; they remain search-based, not an exhaustive transaction monitor. General search topics are never relabelled as company search-growth signals.

Ranking prioritizes corroborated urgent risks, held-company relevance and multiple signal types. It is not a probability of profit or a backtested trading strategy. Source validation establishes traceability, not independent verification of every extracted claim. India-wide quantitative ranking and historical company Google Trends data are not connected; coverage status remains visible.

Researching a discovered company is authorized only by a recent signal saved in that user's private scan. The provider must confirm the exact listing. This creates a research file, never a position. Deep reviews combine financial statements, adjusted price history, technical indicators, dated sources, optional investment thesis and a conditional Buy/Hold/Sell/Wait stance. The case, countercase, confidence, invalidation and missing evidence stay attached to the conclusion. Evidence saves before the AI stage so an AI failure cannot hide financials or the chart. Prior versions remain available.

Manual combined scans and scheduled regional scans merge by each region's latest analysis and feed timestamps. No saved snapshot is relabelled as a fresh scan. Actual execution and backtested/forward-tested investment performance are not part of this release.

## Data coverage and limitations

- Headlines: selected Google News RSS lanes, publisher links, timestamps, deduplication and one-hour cache. Not exhaustive; IPO headlines are not a verified subscription calendar.
- FX: ExchangeRate-API open feed, daily indicative conversions with attribution; rates older than 72 hours are unavailable.
- Crypto: Coinbase Exchange USD spot and up to 299 completed daily bars, restricted to the original owner's personal research. Not redistributed publicly or sent to AI.
- Equities/ETFs: current integrations provide delayed public quotes and financial evidence where available; these are not licensed exchange-wide real-time feeds. Sourced OHLCV and ratio CSV imports remain supported. Missing, stale and unmapped positions are excluded from totals, never priced at zero.
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
