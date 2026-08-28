---
title: "ChatGPT Checkout Is Live. Here's What D2C Brands Actually Need to Know"
metaTitle: "ChatGPT Instant Checkout & Agentic Commerce Protocol (ACP) Guide | StockedBy"
description: "OpenAI's Instant Checkout lets shoppers buy inside ChatGPT. Here's what the Agentic Commerce Protocol requires from your store, and how to check if you're ready."
slug: "chatgpt-instant-checkout-agentic-commerce-protocol"
date: "2026-08-28"
---

Until early 2026, ChatGPT could recommend a product. It couldn't sell one. That gap closed with **Instant Checkout** — shoppers on ChatGPT can now buy directly inside the conversation, no trip to your website required.

If your brand isn't set up for this, the AI can still recommend you. It just can't close the sale for you the way it can for a competitor who is.

## What actually launched

OpenAI's Instant Checkout lets US ChatGPT users complete a purchase without leaving the chat — starting with Etsy sellers, expanding to over a million Shopify merchants, including brands like Glossier, Vuori, Spanx and SKIMS. The payment infrastructure is built and run by Stripe.

The part that matters beyond ChatGPT itself: the protocol underneath it is **open**, not locked to OpenAI. It's called the **Agentic Commerce Protocol (ACP)**, co-developed by Stripe and OpenAI, and it's open-sourced so any AI app or any merchant can build on it — not just the two companies that created it.

## What ACP actually requires from a merchant

ACP is a blueprint for three things:

1. **A product feed the agent can read** — accurate names, prices, variants and stock status, in a structured format, not just rendered on a webpage for a human to read.
2. **A secure way to pay** — a payment token the agent can use to complete checkout without ever handling your customer's raw card details.
3. **An order confirmation the merchant controls** — the sale still completes on the merchant's side, at the merchant's price, not through some separate ChatGPT-owned checkout.

If you already process payments through Stripe, enabling this is close to trivial — Stripe has said it can be a single line of code. If you're not on Stripe or Shopify, the requirement doesn't go away — you just have to build the product feed and the checkout integration yourself, or through whichever platform you use.

## Why "being recommended" and "being buyable" are now two different things

Before Instant Checkout, every AI recommendation ended the same way: a link out to a website. The brand's own site had to do the rest — load fast, show the price, let the customer check out.

Now the sale can complete without your website in the loop at all. That's good news if you're ready — the friction between "AI mentions you" and "customer bought" nearly disappears. It's a real problem if you're not: the AI can still name your brand, but if a competitor has ACP wired up and you don't, the agent has a working path to sell *their* product on the spot and only a website link for yours. Given a choice between a completed transaction and an extra step, don't assume the agent — or the shopper — picks the extra step.

## How to check where you stand

This isn't theoretical infrastructure anymore — it's live, and merchants are already checkout-ready on it. Two things worth doing this week:

- **[Check whether ChatGPT, Gemini and Claude already recommend your brand](https://stockedby.com/test)** — free, in about two minutes, using the real questions shoppers in your market ask.
- **[Check whether AI agents can actually read your product data and reach a checkout](https://stockedby.com/audit)** — the same technical groundwork ACP (and Google's own [Universal Commerce Protocol](/blog/google-universal-commerce-protocol-ap2-explained)) both need before an agent can complete a purchase on your store.

Recommendation gets you into the conversation. Readiness is what decides who actually gets paid.

*StockedBy checks whether ChatGPT, Gemini and Claude recommend your brand, and whether your store is ready for AI agents to buy from it — free, for brands in India, UAE and Saudi Arabia.*
