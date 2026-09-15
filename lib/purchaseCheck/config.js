import { salesConfig } from "../agentStore/config.js";
import { CHECK_PACK_CREDITS } from "./model.js";
export function purchaseConfig() {
  const existing = salesConfig();
  const amount = Number(process.env.PURCHASE_CHECK_PRICE_INR);
  const ready =
    Number.isInteger(amount) &&
    amount > 0 &&
    amount <= 100000 &&
    /^\/brand\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(existing.qrPath) &&
    existing.payee &&
    /^[\w.\-]+@[\w.\-]+$/.test(existing.upiId) &&
    existing.support &&
    existing.seller;
  return {
    ...existing,
    amount: Number.isInteger(amount) && amount > 0 ? amount : null,
    enabled: Boolean(
      ready && process.env.PURCHASE_CHECK_SALES_ENABLED === "true",
    ),
    credits: CHECK_PACK_CREDITS,
  };
}
export function operatorEmail() {
  return (
    process.env.STOCKEDBY_OPERATOR_EMAIL ||
    process.env.STOCKEDBY_PAYMENTS_ADMIN_EMAIL ||
    ""
  );
}
