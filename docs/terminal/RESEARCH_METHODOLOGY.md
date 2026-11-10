# Research challenge and decision lab

Shipped 10 November 2026. Available for held securities and authorized recent market-scanner discoveries. No trading execution.

## What informed the design

- [Jane Street's agent_skills](https://github.com/janestreet/agent_skills) currently publishes a Socratic tutoring skill, not a trading algorithm. Its useful idea here is asking one diagnostic question, exposing misconceptions and adapting to the answer. StockedBy implements an original investment-research interaction inspired by that approach; it does not run the skill as a trading agent or copy its prompt.
- [hft.md's Jane Street directory](https://hft.md/jane-street/) is an independent index, not an official Jane Street product. We used it to locate primary material, not as a source of proprietary strategies.
- [Finding Signal in the Noise](https://signalsandthreads.com/finding-signal-in-the-noise/) discusses noisy market data, simple baselines, overfitting and out-of-sample evaluation.
- [Wrestling the World into Rows](https://signalsandthreads.com/wrestling-the-world-into-rows/) discusses entity mapping, vendor revisions and the importance of when information actually became knowable.

No affiliation, endorsement, proprietary model, or independently established investment edge is claimed.

## Research challenge

Every new detailed AI review produces three evidence-linked arguments: the central assumption, the strongest competing explanation and what would invalidate the case. It also asks one evidence-seeking question. Evidence references are validated against supplied IDs and returned search URLs; this establishes traceability, not truth or entailment.

An optional answer saves to the authenticated owner's existing dossier cache without an AI call. The server retrieves the question from the latest stored report, rejects stale/foreign report IDs, limits answers to 2,000 characters and retains up to six responses. A new review receives at most three recent answers, explicitly labelled unverified user hypotheses. Quantities, account names and balances are not added to this context. Users should not put sensitive account details in free text.

Answers change the review fingerprint. Unchanged recent reviews reuse the saved result; a changed answer triggers new analysis only on an explicit review request. Reports retain the response context and evidence used to generate them. Lost browser responses recover through read-only polling, never an automatic repeat of a paid request. Existing older reports remain readable without a challenge.

## Historical risk

These are descriptive statistics calculated locally from the server-fetched, provider-adjusted series. They are not a strategy backtest, a forecast or a trading signal. The available window is typically around one year, capped at 300 observations by the evidence collector.

- Require positive finite numeric closes and valid ISO dates. Reject conflicting duplicate dates. Deduplicate identical observations and sort chronologically. Exclude bars on or after the evidence snapshot's UTC date because date-only bars have no intraday completion timestamp.
- Maximum drawdown: minimum of `close / running_peak − 1`. Latest drawdown uses the same observed-window peak; it is not necessarily an all-time high.
- Volatility: sample standard deviation of the latest 60 log returns, annualized with `sqrt(252)`. Requires 61 observations. It is not a predicted loss boundary.
- Worst rolling 20-session return: minimum of `close[t+20] / close[t] − 1` across the available window.
- Outcome sample: 20-session intervals starting at observation 0, advancing 20 observations per interval; discard incomplete tails. Adjacent periods share an endpoint but not return increments. They can still be statistically dependent. Counts and median are shown, not a predictive hit rate.
- Gaps longer than seven calendar days exclude affected return windows and withhold volatility when present in the latest 61 observations. Missing single sessions and vendor adjustment errors cannot be independently reconstructed from this series.
- Source, period, sample size and stale data are visible. Costs, taxes and FX effects are not included. Provider-adjusted returns can differ from broker price returns, and later vendor revisions can change the measurements.

## Scenario calculation

The scenario calculator is a two-outcome thought experiment. Inputs are explicitly illustrative, editable and unsaved. They are not inferred from the historical sample or sent to AI.

`Expected return = p × gain − (1 − p) × loss − round-trip costs`

`Break-even p = (loss + costs) / (gain + loss)`

All returns and costs use the initial capital denominator and the same assumed horizon. Costs apply to either outcome. Empty or invalid fields return no calculation. A break-even chance above 100% is labelled unattainable. Taxes, currency moves and intermediate outcomes are omitted.

## What is still required to claim predictive performance

Point-in-time statement publication histories, a historical investable universe including delisted names, corporate-action verification, execution costs and an untouched out-of-sample evaluation are not currently available. Today's financial statements and today's discovered stocks cannot honestly be used to reconstruct a past trading strategy. Do not display Sharpe ratios, predictive win rates or an optimized ranking as proven performance without those foundations.

## Verification

Unit coverage includes drawdown/recovery, sample volatility, overlapping versus disjoint windows, date cutoffs, duplicate/invalid history, missing intervals, scenario algebra and invalid inputs. Dossier tests cover owner-scoped report binding, stale-question rejection, concurrent review changes, no-AI answer saves, revised-review fingerprints, immutable report context and dropped-response recovery. Real-provider and responsive UI checks are performed before deployment.

On 10 November 2026, all 365 tests, targeted ESLint checks and the production build passed. Two live OpenAI reviews of the existing RateGain dossier completed; the second verified a tighter prompt against invented falsification thresholds. The resulting review challenged the unverified monopoly thesis and requested primary-source market-share evidence. Previous reports and holdings were preserved. Historical risk used 283 observations. Browser checks covered light/dark rendering, a 390px viewport without horizontal overflow, answer-save feedback with a simulated local transport, and valid/invalid scenario calculations. The temporary QA route and fixture are excluded from the release.
