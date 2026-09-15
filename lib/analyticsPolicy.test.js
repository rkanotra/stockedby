import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsPath,
  safeAnalyticsParams,
  validMeasurementId,
} from "./analyticsPolicy.js";
import { safeReturnPath } from "./auth/returnPath.js";
test("analytics excludes entered and payment data", () => {
  assert.deepEqual(
    safeAnalyticsParams({
      email: "someone@example.in",
      domain: "private-store.in",
      reference: "123456789012",
      product_count: 5,
      platform: "shopify",
    }),
    { product_count: 5, platform: "shopify" },
  );
  assert.equal(analyticsPath("/report/private-id"), "/report/[report]");
  assert.equal(analyticsPath("/stores/secret-id"), "/stores/[store]");
  assert.equal(analyticsPath("/api/auth/verify"), null);
  assert.equal(analyticsPath('/dashboard/purchase-check/private-id?token=secret'), '/dashboard/purchase-check/[check]');
  assert.equal(analyticsPath("/test?email=private@example.in"), "/test");
});
test("configuration and login return paths reject injection and external redirects", () => {
  assert.equal(validMeasurementId("G-ABC123456"), true);
  assert.equal(validMeasurementId("G-ABC123';alert(1)"), false);
  assert.equal(safeReturnPath("//evil.example"), "/dashboard");
  assert.equal(safeReturnPath('/dashboard/operations'), '/dashboard/operations');
  assert.equal(safeReturnPath('/dashboard/purchase-check'), '/dashboard/purchase-check');
  assert.equal(safeReturnPath('/dashboard/purchase-check/12345678-1234-1234-1234-123456789012'), '/dashboard/purchase-check/12345678-1234-1234-1234-123456789012');
  assert.equal(safeReturnPath('/dashboard/purchase-check/../../evil'), '/dashboard');
  assert.equal(
    safeReturnPath("/checkout/agent-store"),
    "/checkout/agent-store",
  );
});
