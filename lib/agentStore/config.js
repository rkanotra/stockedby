export function salesConfig() {
  const amount = Number(process.env.AGENT_STORE_PRICE_INR);
  const qrPath = process.env.STOCKEDBY_UPI_QR_PATH || "";
  const payee = process.env.STOCKEDBY_UPI_PAYEE || "";
  const upiId = process.env.STOCKEDBY_UPI_ID || "";
  const support = process.env.STOCKEDBY_SUPPORT_EMAIL || "";
  const seller = process.env.STOCKEDBY_SELLER_NAME || "";
  const configured =
    Number.isInteger(amount) &&
    amount > 0 &&
    amount <= 100000 &&
    /^\/brand\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(qrPath) &&
    payee &&
    /^[\w.\-]+@[\w.\-]+$/.test(upiId) &&
    support &&
    seller;
  return {
    enabled: Boolean(
      configured && process.env.AGENT_STORE_SALES_ENABLED === "true",
    ),
    amount: Number.isInteger(amount) && amount > 0 ? amount : null,
    qrPath,
    payee,
    upiId,
    support,
    seller,
  };
}
export function upiLink(config) {
  const params = new URLSearchParams({
    pa: config.upiId,
    pn: config.payee,
    am: String(config.amount),
    cu: "INR",
    tn: "StockedBy Agent Storefront 30 days",
  });
  return `upi://pay?${params}`;
}
