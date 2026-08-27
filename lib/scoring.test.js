import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBrand,
  matches,
  matchesAny,
  categoryMidSentence,
  guessBrandFromDomain,
  sanitizeBrandLabel,
} from "./scoring.js";

// Root-cause coverage for the production bug this normalizer fixes: a
// brand's own report reading NOT STOCKED, 0 of 3, while that same brand
// ranked #1 with 3 mentions in its own leaders table — the old normalize()
// stripped "&" and all whitespace with nothing put back, so "Dot & Key" and
// a slug/guess-derived "Dot and Key" normalized to different strings.
test("normalizeBrand: & <-> and, both directions, case/whitespace-insensitive", () => {
  assert.equal(normalizeBrand("Dot & Key"), normalizeBrand("Dot and Key"));
  assert.equal(normalizeBrand("Dot & Key"), normalizeBrand("dotandkey"));
  assert.equal(normalizeBrand("Dot & Key"), normalizeBrand("DOT & KEY"));
});

test("normalizeBrand: punctuation stripped as word breaks, not deleted", () => {
  assert.equal(normalizeBrand("Dr. Sheth's"), normalizeBrand("Dr Sheths"));
});

test("normalizeBrand: case-only differences", () => {
  assert.equal(normalizeBrand("mCaffeine"), normalizeBrand("mcaffeine"));
});

test("normalizeBrand: trailing corporate suffix stripped, substring match still holds", () => {
  assert.equal(normalizeBrand("The Derma Co"), "thederma");
  assert.equal(normalizeBrand("Derma Co"), "derma");
  assert.ok(matches("The Derma Co", "Derma Co"));
});

test("matches: real brand matching survives all the cases above end to end", () => {
  assert.ok(matches("Dot & Key", "Dot and Key"));
  assert.ok(matches("Dot & Key", "dotandkey"));
  assert.ok(matches("Dot & Key", "DOT & KEY"));
  assert.ok(matches("Dr. Sheth's", "Dr Sheths"));
  assert.ok(matches("mCaffeine", "mcaffeine"));
});

test("matches: different brands never collide (no over-matching regression)", () => {
  assert.equal(matches("Nike", "Adidas"), false);
  assert.equal(matches("Dot & Key", "Sugar Cosmetics"), false);
  assert.equal(matches("", "Dot & Key"), false);
  assert.equal(matches(null, "Dot & Key"), false);
});

test("matchesAny: falls back to brand_aliases when the normalized name alone doesn't match", () => {
  assert.equal(matchesAny("TDC", "The Derma Co", ["TDC"]), true);
  assert.equal(matchesAny("TDC", "The Derma Co", []), false);
  assert.equal(matchesAny("TDC", "The Derma Co", undefined), false);
});

test("categoryMidSentence: lowercases first letter, preserves a leading acronym", () => {
  assert.equal(categoryMidSentence("Hair oil (cold-pressed / ayurvedic)"), "hair oil (cold-pressed / ayurvedic)");
  assert.equal(categoryMidSentence("TWS earbuds"), "TWS earbuds");
  assert.equal(categoryMidSentence(null), null);
});

test("sanitizeBrandLabel: strips a stray '/' after an abbreviation period, leaves genuine slashes alone", () => {
  assert.equal(sanitizeBrandLabel("Dr. /Sheth's"), "Dr. Sheth's");
  assert.equal(sanitizeBrandLabel("Brooklinen / Quince / West Elm"), "Brooklinen / Quince / West Elm");
  assert.equal(sanitizeBrandLabel(""), "");
  assert.equal(sanitizeBrandLabel(null), null);
});

test("guessBrandFromDomain: a hyphenated 'and' segment renders as & (a domain can't contain one)", () => {
  assert.equal(guessBrandFromDomain("dot-and-key.com"), "Dot & Key");
  assert.equal(guessBrandFromDomain("bath-and-body-works.com"), "Bath & Body Works");
  assert.equal(guessBrandFromDomain("the-nice-shop.in"), "The Nice Shop");
  assert.equal(guessBrandFromDomain("mamaearth.in"), "Mamaearth");
});
