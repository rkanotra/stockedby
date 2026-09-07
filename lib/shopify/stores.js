import { supabase } from "../supabaseClient.js";
import { encrypt, decrypt } from "../crypto.js";

// Completing real Shopify OAuth for a shop IS the proof of authority over
// it (Shopify only issues the access token to whoever the shop's own
// admin approved) — so upserting on shop_domain, reassigning a shop to
// whichever merchant most recently completed its OAuth flow, is correct
// here, not a hijack risk: the callback (app/api/shopify/callback) only
// ever reaches this after Shopify itself has verified the grant.
export async function upsertStore({ merchantId, shop, accessToken, scope }) {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db
    .from("stores")
    .upsert(
      {
        merchant_id: merchantId,
        shop_domain: shop,
        access_token_encrypted: encrypt(accessToken),
        scope: scope || null,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_domain" }
    )
    .select("id, shop_domain")
    .single();
  if (error) {
    console.error("[shopify] upsertStore failed", error.message);
    return null;
  }
  return data;
}

// Includes "needs_reconnect" (a revoked/invalid token — see
// app/api/shopify/sync/route.js) as well as "active" — only "uninstalled"
// is excluded — so the dashboard can tell "no store connected at all" (row
// genuinely absent) apart from "connected, but needs attention" (row
// present with a non-active status) rather than the two looking identical.
export async function getStoreForMerchant(merchantId) {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db
    .from("stores")
    .select("*")
    .eq("merchant_id", merchantId)
    .neq("status", "uninstalled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function getStoreById(storeId) {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db.from("stores").select("*").eq("id", storeId).maybeSingle();
  if (error || !data) return null;
  return data;
}

// Decrypted only in memory, only where a live Shopify API call is about to
// use it (app/api/shopify/sync/route.js) — never logged, never returned
// to the client.
export function decryptStoreToken(store) {
  return decrypt(store.access_token_encrypted);
}

export async function updateSyncState(storeId, { syncStatus, lastSyncedPageInfo, lastSyncedAt, lastSyncError, status }) {
  const db = supabase();
  if (!db) return;
  const patch = { updated_at: new Date().toISOString() };
  if (syncStatus !== undefined) patch.sync_status = syncStatus;
  if (lastSyncedPageInfo !== undefined) patch.last_synced_page_info = lastSyncedPageInfo;
  if (lastSyncedAt !== undefined) patch.last_synced_at = lastSyncedAt;
  if (lastSyncError !== undefined) patch.last_sync_error = lastSyncError;
  if (status !== undefined) patch.status = status;
  const { error } = await db.from("stores").update(patch).eq("id", storeId);
  if (error) console.error("[shopify] updateSyncState failed", error.message);
}
