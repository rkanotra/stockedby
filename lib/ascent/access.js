const OWNER_EMAIL = "rahulkanotra1101@gmail.com";
export function isAscentOwnerEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === OWNER_EMAIL;
}
export function isAscentOwner(user) {
  return isAscentOwnerEmail(user?.email) && !!user?.email_confirmed_at;
}
