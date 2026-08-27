import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidEmailFormat,
  isDisposableEmail,
  isFreeProvider,
  suggestEmailCorrection,
} from "./emailValidation.js";

test("isValidEmailFormat: accepts normal addresses, rejects malformed ones", () => {
  assert.equal(isValidEmailFormat("founder@brand.com"), true);
  assert.equal(isValidEmailFormat("founder@brand.co.in"), true);
  assert.equal(isValidEmailFormat("not-an-email"), false);
  assert.equal(isValidEmailFormat("missing@domain"), false);
  assert.equal(isValidEmailFormat("@nouser.com"), false);
  assert.equal(isValidEmailFormat(""), false);
});

test("isDisposableEmail: flags known throwaway providers", () => {
  assert.equal(isDisposableEmail("test@mailinator.com"), true);
  assert.equal(isDisposableEmail("test@guerrillamail.com"), true);
  assert.equal(isDisposableEmail("test@yopmail.com"), true);
  assert.equal(isDisposableEmail("test@10minutemail.com"), true);
  assert.equal(isDisposableEmail("founder@realbrand.com"), false);
});

test("isFreeProvider: flags gmail etc as free but never disposable", () => {
  assert.equal(isFreeProvider("founder@gmail.com"), true);
  assert.equal(isFreeProvider("founder@yahoo.com"), true);
  assert.equal(isFreeProvider("founder@realbrand.com"), false);
  assert.equal(isDisposableEmail("founder@gmail.com"), false);
});

test("suggestEmailCorrection: catches the spec's exact typo examples", () => {
  assert.equal(suggestEmailCorrection("a@gmial.com"), "a@gmail.com");
  assert.equal(suggestEmailCorrection("a@gmai.com"), "a@gmail.com");
  assert.equal(suggestEmailCorrection("a@yahooo.com"), "a@yahoo.com");
  assert.equal(suggestEmailCorrection("a@hotmial.com"), "a@hotmail.com");
});

test("suggestEmailCorrection: never suggests a change for an already-correct or unrelated domain", () => {
  assert.equal(suggestEmailCorrection("a@gmail.com"), null);
  assert.equal(suggestEmailCorrection("a@realbrand.com"), null);
  assert.equal(suggestEmailCorrection("a@stockedby.com"), null);
});

test("suggestEmailCorrection: never auto-changes — returns a suggestion string, not a mutation", () => {
  const original = "founder@gmial.com";
  const suggestion = suggestEmailCorrection(original);
  assert.notEqual(suggestion, original);
  assert.equal(suggestion, "founder@gmail.com");
});
