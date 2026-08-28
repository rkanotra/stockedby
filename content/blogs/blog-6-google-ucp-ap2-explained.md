---
title: "Google's UCP and AP2: The Other Half of Agentic Checkout, Explained"
metaTitle: "Google Universal Commerce Protocol (UCP) & AP2 Explained | StockedBy"
description: "Google now has two protocols for AI-led shopping: UCP for checkout, AP2 for payment. Here's what they actually do, and what your store needs to support them."
slug: "google-universal-commerce-protocol-ap2-explained"
date: "2026-08-28"
---

OpenAI isn't the only one building a checkout an AI agent can use. Google is too, and its version is bigger in scope: it now touches Search, Gemini, YouTube and Gmail through something called **Universal Cart**, backed by two separate protocols doing two separate jobs — **UCP** for checkout, and **AP2** for payment.

They solve different problems, and a store that's ready for one isn't automatically ready for the other.

## UCP: how an agent finds out what you sell and how to buy it

The **Universal Commerce Protocol (UCP)** is how an AI agent discovers what a merchant can actually do — which checkout flows you support, what fulfillment options exist, whether discounts apply — before it tries to buy anything from you.

The mechanic is a single file: a manifest published at `/.well-known/ucp` on your own domain, publicly readable, no login required. It lists your store's capabilities, which version of the UCP spec you're using, and where to send requests for each one. An agent fetches that file first, then talks to your store using it as the map.

This is the same `/.well-known/` pattern OpenAI's ACP checkout uses too — just a different filename and a different company behind it. If you've never heard of a "well-known manifest" before, that's fine. It's meant to be something your platform or developer sets up once, not something a shopper or a marketer ever sees.

## AP2: how an agent proves it's allowed to spend your money

UCP tells an agent what's for sale. It doesn't answer a harder question: how does a merchant know the agent is actually authorised to spend on this shopper's behalf, and isn't just acting on its own?

That's what the **Agent Payments Protocol (AP2)** is for. Every payment an AP2-enabled agent makes carries a **Mandate** — a cryptographically signed digital contract proving the shopper actually authorised this specific purchase, within limits they set. It creates a tamper-proof record for every transaction, which matters the moment something goes wrong and someone has to prove who authorised what.

AP2 launched with more than 60 partners — card networks like Mastercard and American Express, processors like PayPal and Adyen, and merchants like Etsy and Lowe's. Google has since donated AP2 to the FIDO Alliance, the same body behind passkeys — a strong signal it's aiming to become an industry standard other companies build on, not a Google-only feature.

## Universal Cart: why this is bigger than "Google shopping"

At Google I/O 2026, this stopped being background infrastructure and became a real product: **Universal Cart**. Add a product from a Google Search result, from Gemini, from a YouTube video, or from an email in Gmail, and it lands in one persistent cart that tracks price drops and restocks in the background — across every surface, not just search.

For a merchant, the practical result is that Google is now a serious checkout surface in its own right, not just a place where shoppers discover you and then leave. Supporting both UCP and AP2 is becoming close to a requirement for showing up properly across Google's ecosystem — not a future nice-to-have.

## What to actually check

Two separate readiness questions, and most stores haven't checked either:

1. **Does Google (or ChatGPT, via [ACP](/blog/chatgpt-instant-checkout-agentic-commerce-protocol)) even know what you sell?** — [Check whether AI recommends your brand →](https://stockedby.com/test)
2. **Could an agent actually complete a purchase on your store today?** — [Run the free agent-readiness check →](https://stockedby.com/audit)

UCP, AP2, ACP, and India's own [NPCI Unified Agent Protocol](/blog/npci-unified-agent-protocol-upi-ai-agents) are all racing toward the same outcome from different directions: a shopper who never has to leave the AI they're already talking to. Whether your store is part of that transaction or gets quietly routed around depends on groundwork most brands haven't started yet.

*StockedBy checks whether ChatGPT, Gemini and Claude recommend your brand, and whether your store is ready for AI agents to buy from it — free, for brands in India, UAE and Saudi Arabia.*
