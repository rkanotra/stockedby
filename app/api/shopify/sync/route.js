import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, getMerchantForSessionToken } from "@/lib/auth/session";
import { getStoreForMerchant, decryptStoreToken, updateSyncState } from "@/lib/shopify/stores";
import { fetchProductsPage } from "@/lib/shopify/client";
import { upsertProductsPage, rescoreAndSaveStore } from "@/lib/commerce/catalog";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE_LIMIT = 100;
// Bounded per invocation — same resumable-batch pattern as app/api/admin/
// backfill-observations, for the same reason: a large catalog could
// otherwise threaten this function's duration limit. The resumable cursor
// (store.last_synced_page_info) means a merchant can just click "Sync"
// again (components/dashboard/SyncPanel.js actually chains automatically)
// to continue exactly where the last call left off.
const MAX_PAGES_PER_CALL = 3;

export async function POST(request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const merchant = token ? await getMerchantForSessionToken(token) : null;
  if (!merchant) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Own namespace/limit (hard rule 9's pattern) — generous enough for a
  // large catalog's chained pagination (components/dashboard/SyncPanel.js
  // calls this repeatedly until `done`), still bounded against runaway
  // abuse from a single IP.
  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "shopify-sync", limit: 100 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many sync requests. Try again later." }, { status: 429 });
  }

  const store = await getStoreForMerchant(merchant.merchantId);
  if (!store) return NextResponse.json({ error: "No connected store." }, { status: 404 });

  let accessToken;
  try {
    accessToken = decryptStoreToken(store);
  } catch (e) {
    console.error("[shopify] token decrypt failed", e?.message || e);
    return NextResponse.json({ error: "Store connection is invalid — please reconnect." }, { status: 500 });
  }

  await updateSyncState(store.id, { syncStatus: "syncing" });

  let pageInfo = store.last_synced_page_info || undefined;
  let productsProcessed = 0;
  let pagesThisCall = 0;
  let done = false;

  try {
    while (pagesThisCall < MAX_PAGES_PER_CALL) {
      const { products, nextPageInfo } = await fetchProductsPage({
        shop: store.shop_domain,
        accessToken,
        limit: PAGE_LIMIT,
        pageInfo,
      });
      const { written } = await upsertProductsPage(store.id, products);
      productsProcessed += written;
      pagesThisCall += 1;
      pageInfo = nextPageInfo;
      if (!nextPageInfo) {
        done = true;
        break;
      }
    }
  } catch (e) {
    // A revoked/invalid token (Shopify 401) can't be fixed by simply
    // retrying the sync — flag the store itself as needing reconnect (not
    // just this one sync attempt) so the dashboard shows a clear
    // "reconnect your store" message instead of a generic sync error the
    // merchant would keep retrying forever with no way to succeed.
    await updateSyncState(store.id, {
      syncStatus: "error",
      lastSyncError: e?.message || String(e),
      status: e?.code === "unauthorized" ? "needs_reconnect" : undefined,
    });
    const status = e?.code === "unauthorized" ? 401 : 502;
    return NextResponse.json({ error: e?.message || "Sync failed." }, { status });
  }

  await updateSyncState(store.id, {
    syncStatus: done ? "idle" : "syncing",
    lastSyncedPageInfo: done ? null : pageInfo,
    lastSyncedAt: new Date().toISOString(),
    lastSyncError: null,
  });

  // Readiness is only rescored/persisted once a FULL catalog pass
  // completes — a partial mid-sync scan would understate the true
  // product count and could misrepresent the score (constraint: never
  // fabricate/mislead on incomplete data).
  let storeScore = null;
  if (done) {
    const result = await rescoreAndSaveStore(store.id);
    storeScore = result.storeScore;
  }

  return NextResponse.json({ ok: true, done, productsProcessed, storeScore });
}
