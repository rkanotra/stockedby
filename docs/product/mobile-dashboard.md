# Mobile dashboard

Public route: `/dashboard`. No sign-in, saved portfolio, AI call, or analytics is used on this display. The previous commerce subroutes stay redirected to the investment site.

- Device-clock time and date in the chosen city's timezone. Dubai is the labelled default; city, temperature unit and clock format persist on that device.
- Open-Meteo current model weather, checked every 15 minutes while visible. Optional geolocation is rounded to two decimal places and sent directly to Open-Meteo only after the user requests it. Free endpoint is for this personal/non-commercial display; reassess its terms before a paid or advertising-supported launch.
- Six official TradingView embeds: BSE Sensex (end-of-day), FOREX.com US 500 and Nasdaq 100 CFDs (not the cash indices), OANDA spot gold in USD/troy oz, Coinbase BTC/USD and ETH/USD. Provider widgets own their streaming data and delays. They are not a portfolio quote API.
- Four public RSS news lanes (India, US, gold, crypto), curated publishers, bounded requests and ten-minute caching. Headlines older than 72 hours or lacking a valid date/HTTPS link are excluded. Earlier results remain visibly dated during a source outage. Rotation every 15 seconds can be paused.
- User-activated fullscreen and Screen Wake Lock where supported; standalone home-screen manifest for iPhone/Android. No service-worker cache of market data: network connectivity is required. Browser/OS may release the wake lock; the control reflects the current state and reacquires when visible.

Sources: [TradingView widget data](https://www.tradingview.com/widget-docs/faq/data/), [BSE widget coverage](https://www.tradingview.com/widget-docs/markets/asia-pacific/), [Open-Meteo terms](https://open-meteo.com/en/terms), [Open-Meteo API](https://open-meteo.com/en/docs), [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

Verification: automated tests cover timezone boundaries, weather validation, location bounds, stale/unsafe headline exclusion, news-cache failures; browser checks cover 390×844, 844×390 and 1440×1000, fullscreen, wake lock, paused headlines, saved settings, light mode, offline/reconnect and manifest. Real provider widgets, weather and headlines were also inspected. No private holdings were changed.
