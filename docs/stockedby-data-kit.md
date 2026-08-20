# ShelfShare Data Kit
Manual multi-engine collection system for the category query bank.

---

## 1. The JSON schema

One file per market. Every manual run you do in ChatGPT / Gemini / Perplexity gets pasted in as a `snapshot`.

```json
{
  "market": "India",
  "categories": [
    {
      "id": "sunglasses-men",
      "name": "Men's sunglasses",
      "group": "Fashion & Accessories",
      "queries": [
        {
          "qid": "sunglasses-men-budget",
          "text": "best polarized sunglasses under ₹2000 for driving",
          "archetype": "category-discovery",
          "intent": "commercial",
          "language": "en"
        },
        {
          "qid": "sunglasses-men-hinglish",
          "text": "acha sunglasses brand konsa hai 2000 ke andar",
          "archetype": "category-discovery",
          "intent": "commercial",
          "language": "hi-en"
        },
        {
          "qid": "sunglasses-men-branded",
          "text": "I want to buy new Lenskart Vincent Chase aviators, where should I get them",
          "archetype": "branded-routing",
          "intent": "commercial",
          "language": "en"
        }
      ],
      "snapshots": [
        {
          "qid": "sunglasses-men-budget",
          "engine": "chatgpt",
          "surface": "consumer-app",
          "collected_on": "2026-08-18",
          "recommendations": [
            { "rank": 1, "brand": "", "product": "", "why": "", "destination": "brand-direct | marketplace | aggregator | none", "destination_domain": "" }
          ],
          "sources_cited": ["domain1.com", "domain2.com"]
        }
      ]
    }
  ]
}
```

Rules:
- `engine`: chatgpt | gemini | claude | grok | perplexity | copilot
  (all six are TEST engines for snapshot harvesting; query-bank GENERATION is Claude/ChatGPT only — Perplexity and Gemini-unbatched failed generation QA)
- `surface`: consumer-app (you ran it in the real app) or api
- Never edit a snapshot after saving — collect a new one with a new date. Staleness is data too: "Gemini changed its answer in 30 days" is an insight you can publish.
- Refresh cadence: top-20 categories monthly, long tail quarterly.
- `destination`: where the engine sends the buyer to complete the purchase — this is the agentic checkout metric. brand-direct = the brand's own site; marketplace = Amazon/Flipkart/Noon/Daraz listing; aggregator = OTA/comparison site; none = no link given.

---

## 1b. Query archetypes — collect all of these per category

Category discovery alone misses most of the funnel. Each archetype measures something different:

| Archetype | Example | What it measures |
|---|---|---|
| `category-discovery` | "best polarized sunglasses under ₹2000" | Which brands get shelf space |
| `branded-routing` | "I want new Levi's jeans, where should I buy" | Brand wins the mention — but does AI route to levi.in or the Amazon listing? The checkout battle. |
| `replacement` | "my dumbbell set broke, need a replacement" | Repurchase loyalty: does AI suggest same brand, upgrade, or switch? Huge for retention categories. |
| `problem-first` | "my hair is falling out, what should I use" | Brand isn't in the shopper's mind at all — the biggest discovery surface, hardest to win |
| `comparison` | "boAt vs Noise smartwatch which is better" | Head-to-head framing and which sources decide it |
| `occasion-gifting` | "gift for my father under AED 200" | Seasonal/gifting shelf — spikes matter (Eid, Diwali, Ramadan) |
| `service-booking` | "book flight Dubai to Chennai cheapest" | Direct vs aggregator in services: airline site vs MakeMyTrip/Cleartrip/OTAs. Same fight, different vertical. |

Collection guidance:
- For every ★ category, collect at least: 1 category-discovery, 1 branded-routing (use the category leader's name), 1 problem-first or replacement.
- `leader_brand` on a branded-routing query is a bank-authoring convenience,
  not what actually gets asked. At test time the app rewrites that query to
  the merchant's OWN entered brand by default (see lib/queryPersonalize.js)
  — testing the bank's original leader-brand routing question is a later
  competitive-intel feature, not the free test's default behavior.
- For branded-routing and service-booking, the `destination` field is the whole point — always record which link/domain the engine offered for the actual purchase.
- Services (flights, hotels, salon booking, insurance) get their own category group — the "shelf" concept applies to any market where direct sellers fight aggregators.

---

## 2. The Harvest Prompt

Paste this into any engine (ChatGPT / Gemini / Perplexity), replacing the placeholders. It forces the engine to answer AND self-report in your schema, so you copy one JSON block straight into the file.

```
I'm going to ask you a shopping question. Answer it the way you normally would
for a real customer — search the web if you can — then convert YOUR OWN answer
into the JSON format below.

My question: "{QUERY_TEXT}"

After deciding your genuine recommendations, output ONLY this JSON, nothing else:

{
  "qid": "{QID}",
  "engine": "{ENGINE_NAME}",
  "surface": "consumer-app",
  "collected_on": "{TODAY_YYYY-MM-DD}",
  "recommendations": [
    { "rank": 1, "brand": "", "product": "", "why": "one line on why you picked it", "destination": "brand-direct | marketplace | aggregator | none", "destination_domain": "the exact site you would send me to buy this" },
    { "rank": 2, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" },
    { "rank": 3, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" },
    { "rank": 4, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" },
    { "rank": 5, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" }
  ],
  "sources_cited": ["list the domains you actually used, if any"]
}

Important: your recommendations must be your real answer to the question — do
not change them because of the format. Name actual brands.
```

Tip: ask the question naturally first in a fresh chat, THEN send the JSON
conversion as a follow-up message. The first answer is the authentic one;
the follow-up just structures it. This avoids the format nudging the engine's picks.

---

## 2b. Query Bank Generation Prompt

Use this to make any engine (ChatGPT / Gemini / Claude) generate the query bank
itself. It is engineered against the five known failure modes: template collapse,
unfilled placeholders, label leakage, market mixing, and fake problem-first queries.

**Rule 1: never ask for all 100 categories in one go.** Template collapse is
guaranteed at that scale. Run this prompt once per batch of 8-10 categories,
per market. ~12 runs total for one market's full bank.

```
You are generating shopper queries for a market-research query bank. Market: {MARKET}.
Categories for this batch (generate for ALL of them):
{LIST 8-10 CATEGORY NAMES — strip any annotations like "(GCC priority)" first}

For EACH category, write exactly 4 queries:

1. archetype "category-discovery" (language: en) — MUST include a concrete budget
   in {LOCAL_CURRENCY} realistic for this category in {MARKET} (a ₹350 kajal and a
   ₹15,000 mattress have different budgets — pick sensible numbers per category),
   plus a use-case, occasion, or skin/body/context detail.
2. archetype "category-discovery" (language: {LOCAL_LANGUAGE_CODE}) — written the
   way locals actually type: colloquial, code-mixed where natural. NOT a translation
   of query 1 — a different angle.
3. archetype "branded-routing" (language: en) — the customer already wants a REAL,
   NAMED market-leading brand in this category in {MARKET} and asks where to buy it
   cheapest/genuinely. You must name an actual brand (e.g. Minimalist for serums,
   boAt for earbuds, Lattafa for perfume). NEVER use a placeholder.
4. archetype "problem-first" (language: en) — the customer describes the PROBLEM
   only. The category name must NOT appear. "My face looks dull and dark spots
   won't fade" is problem-first; "I need a face serum but don't know which brand"
   is NOT (it names the category — forbidden).

HARD RULES:
- No two queries in this entire batch may share the same sentence structure.
  Banned patterns: "best X to buy in {MARKET} right now", "{MARKET} mein achha X
  kaunsa hai", or any repeated stamp. Vary openings: questions, statements,
  budget-first, problem-first, comparison phrasing.
- Never copy the category label verbatim into a query if it contains slashes or
  parentheses — write how a human says it ("vitamin C serum", not "face serum /
  vitamin C").
- Only generate for categories relevant to {MARKET}. If a category in the list
  doesn't fit this market, output it with "skipped": true and a one-line reason.
- Sound like real people typing on phones: contractions, small imperfections fine.

Output ONLY valid JSON:
{"categories":[{"id":"kebab-case-id","name":"","queries":[
{"qid":"<id>-discovery","text":"","archetype":"category-discovery","intent":"commercial","language":"en"},
{"qid":"<id>-local","text":"","archetype":"category-discovery","intent":"commercial","language":""},
{"qid":"<id>-branded","text":"","archetype":"branded-routing","intent":"commercial","language":"en","leader_brand":""},
{"qid":"<id>-problem","text":"","archetype":"problem-first","intent":"commercial","language":"en"}
]}]}

Before outputting, self-check every query against the HARD RULES and rewrite any
that fail. Then verify: 0 placeholders, 0 category-label leaks, every discovery
query has a number in it, no repeated sentence stamps.
```

Fill-ins per market: India → INR ₹, hi-en (Hinglish); GCC → AED, ar (Gulf Arabic);
Pakistan → PKR, ur-en (Roman Urdu); SEA → per-country (IDR + id, THB + th…).

**Acceptance check before committing a batch** (30 seconds): scan for (a) any
`{` placeholder, (b) any "(priority)" text inside queries, (c) three queries
starting with the same three words, (d) discovery queries missing numbers.
Any hit → rerun that batch, don't hand-fix; a prompt that needed hand-fixing
will fail again next refresh.

---

## 3. Top 100 D2C categories (grouped)

Start with ★ = priority 20 for India + GCC.

**Beauty & Personal Care**
1. ★ Face serum / vitamin C
2. ★ Sunscreen
3. ★ Hair oil (cold-pressed / ayurvedic)
4. ★ Beard grooming
5. Shampoo (sulfate-free)
6. Face wash (men)
7. Kajal / eyeliner
8. Lipstick (long-stay)
9. Body lotion
10. Perfume / attar ★ (GCC priority)
11. Oud products ★ (GCC priority)
12. Hair styling (women)
13. Skin brightening cream
14. Face masks / sheet masks
15. Nail care

**Fashion & Accessories**
16. ★ Men's sunglasses
17. ★ Women's ethnic wear / kurtis
18. ★ Abayas & modest fashion (GCC/Pak priority)
19. ★ Sneakers / casual shoes
20. Men's formal shoes
21. Handbags
22. Men's watches
23. Athleisure / gym wear
24. Innerwear (men)
25. Innerwear (women)
26. Sarees
27. Hijabs & scarves (GCC/Pak)
28. Kids' clothing
29. Artificial jewelry
30. Gold-plated / demi-fine jewelry

**Food & Beverage**
31. ★ Protein powder / whey
32. ★ Healthy snacks / makhana
33. ★ Coffee (specialty / instant)
34. Green tea / wellness tea
35. Dry fruits & nuts
36. Dates (GCC priority)
37. Honey (raw / organic)
38. Ghee (A2 / organic)
39. Spices & masalas
40. Breakfast cereals / muesli
41. Peanut butter
42. Millet products
43. Cold-pressed oils
44. Chocolates (artisanal)
45. Energy drinks

**Health & Wellness**
46. ★ Multivitamins
47. ★ Ayurvedic supplements
48. Sleep aids / melatonin
49. Hair growth supplements
50. Omega-3 / fish oil
51. Apple cider vinegar
52. Diabetic care foods
53. Immunity boosters
54. Period care / menstrual cups
55. Pain relief (topical)

**Baby & Kids**
56. ★ Baby skincare
57. Diapers
58. Baby food
59. Kids' toys (educational)
60. School bags
61. Baby carriers
62. Kids' nutrition drinks

**Home & Living**
63. ★ Bedsheets / bedding
64. ★ Cookware (non-toxic / cast iron)
65. Home fragrance / candles
66. Wall decor
67. Storage & organizers
68. Water bottles / flasks
69. Air purifiers
70. Mattresses
71. Curtains
72. Prayer mats (GCC/Pak)
73. Kitchen appliances (small)
74. Plants / gardening kits

**Electronics & Accessories**
75. ★ TWS earbuds
76. ★ Smartwatches
77. Phone cases
78. Power banks
79. Mobile chargers / cables
80. Bluetooth speakers
81. Laptop bags & sleeves
82. Gaming accessories
83. Smart home devices

**Fitness & Sports**
84. ★ Yoga mats
85. Home gym equipment
86. Cricket gear (India/Pak)
87. Cycling accessories
88. Running gear
89. Sports nutrition

**Pets**
90. Pet food (dogs)
91. Pet food (cats)
92. Pet grooming

**Other high-velocity D2C**
93. ★ Fragrance-free / sensitive skincare
94. Stationery & planners
95. Backpacks
96. Travel accessories
97. Grooming kits (gifting)
98. Festive gifting hampers
99. Car accessories
100. Eyewear (prescription / blue-light)

---

## 4. Workflow

1. Pick a ★ category → write/adapt 3 queries (budget / use-case / comparison), one in the local language.
2. Fresh chat in each engine → ask naturally → then send the harvest prompt follow-up → copy JSON.
3. Paste into the market file under `snapshots`.
4. Log `collected_on`. Re-run monthly for ★ categories.
5. The ShelfShare app then reads this file: a brand picks their category, and their shelf test compares them against ALL engines' stored snapshots instantly — zero API cost, sub-second results, multi-engine from day one.

Per-brand live testing (with their custom queries) stays as the premium/deeper tier that uses the API.
