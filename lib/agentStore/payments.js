export function paymentReference(value) {
  const reference = typeof value === "string" ? value.trim() : "";
  return /^\d{12}$/.test(reference) ? reference : null;
}
export function isPaymentAdmin(merchant, adminEmail) {
  return Boolean(
    merchant?.email &&
    adminEmail &&
    merchant.email.toLowerCase() === adminEmail.trim().toLowerCase(),
  );
}
