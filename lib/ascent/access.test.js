import test from "node:test";
import assert from "node:assert/strict";
import { isAscentOwner, isAscentOwnerEmail } from "./access.js";
test("Ascent accepts only the exact owner address, with case and whitespace normalised", () => {
  assert.equal(isAscentOwnerEmail(" RAHULKANOTRA1101@gmail.com "), true);
  for (const email of [null, "", "other@gmail.com", "rahulkanotra1101+test@gmail.com", "rahul.kanotra1101@gmail.com", "rahulkanotra1101@gmail.com.evil.example"])
    assert.equal(isAscentOwnerEmail(email), false);
});
test("email knowledge alone does not grant studio access; verified authentication is required", () => {
  assert.equal(isAscentOwner({email:"rahulkanotra1101@gmail.com"}), false);
  assert.equal(isAscentOwner({email:"other@gmail.com",email_confirmed_at:"2026-10-18"}), false);
  assert.equal(isAscentOwner({email:"rahulkanotra1101@gmail.com",email_confirmed_at:"2026-10-18"}), true);
});
