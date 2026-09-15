import { supabase } from "../supabaseClient.js";
import { getOptionalMerchant } from "../auth/requireMerchant.js";
import { isActiveAccess } from "./catalog.js";
import { sameOriginRequest } from "../auth/requestOrigin.js";
export function database() {
  const db = supabase();
  if (!db) throw new Error("Storefront setup is temporarily unavailable.");
  return db;
}
export async function signedIn(request) {
  if (
    request.method !== "GET" &&
    !sameOriginRequest(request)
  )
    throw Object.assign(new Error("Please reload the page and try again."), {
      status: 403,
    });
  const merchant = await getOptionalMerchant();
  if (!merchant)
    throw Object.assign(new Error("Sign in to continue."), { status: 401 });
  return merchant;
}
export async function getAgentStore(merchantId) {
  const { data, error } = await database()
    .from("agent_storefronts")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (error) throw new Error("Storefront setup is temporarily unavailable.");
  return data;
}
export async function getAccess(merchantId) {
  const { data, error } = await database()
    .from("agent_store_access")
    .select("expires_at")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (error) throw new Error("Storefront setup is temporarily unavailable.");
  return {
    active: isActiveAccess(data?.expires_at),
    expiresAt: data?.expires_at || null,
  };
}
export async function publicStore(id) {
  if (!/^[a-f0-9-]{36}$/.test(id || "")) return null;
  try {
    const { data, error } = await database()
      .from("agent_storefronts")
      .select("id,merchant_id,published,published_at")
      .eq("id", id)
      .maybeSingle();
    if (error || !data?.published) return null;
    const access = await getAccess(data.merchant_id);
    return access.active ? data : null;
  } catch {
    return null;
  }
}
export async function jsonBody(request) {
  const raw = await request.text();
  if (raw.length > 150000)
    throw Object.assign(new Error("Catalog is too large."), { status: 413 });
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Invalid request."), { status: 400 });
  }
}
export function apiError(error) {
  return Response.json(
    {
      error: error.status
        ? error.message
        : "This action is temporarily unavailable. Please try again.",
    },
    { status: error.status || 503 },
  );
}
