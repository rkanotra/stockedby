import test from "node:test";
import assert from "node:assert/strict";
import { teamReturnPath } from "./teamReturn.js";

test("Ascent sign-in and verification errors return to Ascent", () => {
  assert.equal(teamReturnPath("/ascent"), "/ascent");
  assert.equal(teamReturnPath("/ascent", true), "/ascent?authError=1");
});

test("team sign-in defaults to Workspace and arbitrary redirect targets are rejected", () => {
  for (const value of [undefined, null, "", "/workspace", "https://evil.example", "//evil.example", "/\\evil.example", "/ascent/../admin", "/ascent?next=https://evil.example", "/ascent#fragment", "%2Fascent", ["/ascent"]]) {
    assert.equal(teamReturnPath(value), "/workspace");
    assert.equal(teamReturnPath(value, true), "/workspace?authError=1");
  }
});

 test("password setup returns to account settings only after verified callback", () => {
  assert.equal(teamReturnPath("/ascent#view=account"), "/ascent#view=account");
  assert.equal(teamReturnPath("/ascent#view=account", true), "/ascent?authError=1#view=account");
  assert.equal(teamReturnPath("/ascent#view=account&next=https://evil.example"), "/workspace");
});
