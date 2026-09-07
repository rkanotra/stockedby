import { supabase } from "../supabaseClient.js";
import { normalizeProduct } from "./normalizeProduct.js";
import { scoreProduct, scoreStore } from "./readiness.js";

// DB-access layer for a store's ingested catalog + readiness history.
// Every normalize/score call reuses lib/commerce/normalizeProduct.js /
// readiness.js directly — this file never re-derives a check or a score,
// just persists and reads back what those pure functions already computed.

// One page of raw Shopify products -> normalized, scored, and upserted
// into store_products/store_product_variants. Returns how many were
// written (best-effort per row — one malformed product from Shopify
// should never abort the rest of the page).
export async function upsertProductsPage(storeId, rawProducts) {
  const db = supabase();
  if (!db || rawProducts.length === 0) return { written: 0 };

  let written = 0;
  for (const raw of rawProducts) {
    const normalized = normalizeProduct(raw);
    if (!normalized.shopifyProductId) continue;
    const readiness = scoreProduct(normalized);

    const { data: productRow, error: productError } = await db
      .from("store_products")
      .upsert(
        {
          store_id: storeId,
          shopify_product_id: normalized.shopifyProductId,
          title: normalized.title || null,
          handle: normalized.handle || null,
          product_type: normalized.productType || null,
          vendor: normalized.vendor || null,
          status: normalized.status || null,
          raw_json: raw,
          normalized_json: normalized,
          readiness_score: readiness.overall,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,shopify_product_id" }
      )
      .select("id")
      .single();
    if (productError || !productRow) {
      console.error("[commerce] upsert product failed", productError?.message);
      continue;
    }

    if (normalized.variants.length > 0) {
      const variantRows = normalized.variants.map((v) => ({
        product_id: productRow.id,
        shopify_variant_id: v.shopifyVariantId,
        sku: v.sku,
        price: v.price,
        inventory_quantity: v.inventoryQuantity,
        raw_json: v,
        updated_at: new Date().toISOString(),
      }));
      const { error: variantError } = await db
        .from("store_product_variants")
        .upsert(variantRows, { onConflict: "product_id,shopify_variant_id" });
      if (variantError) console.error("[commerce] upsert variants failed", variantError.message);
    }

    written += 1;
  }

  return { written };
}

// Reads back every product's already-normalized shape (not the raw
// Shopify JSON) for a full store-level rescore — normalize is only ever
// done once, at ingestion time (upsertProductsPage above); scoring can
// safely be recomputed cheaply, in memory, as often as needed.
export async function getNormalizedProducts(storeId) {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db
    .from("store_products")
    .select("normalized_json")
    .eq("store_id", storeId);
  if (error || !data) return [];
  return data.map((row) => row.normalized_json).filter(Boolean);
}

// The catalog table's page of products with their per-product readiness —
// small, presentational read, capped so the dashboard never tries to
// render an entire catalog at once.
export async function getProductCatalogPage(storeId, { limit = 50, offset = 0 } = {}) {
  const db = supabase();
  if (!db) return { products: [], total: 0 };
  const [{ data, error }, { count }] = await Promise.all([
    db
      .from("store_products")
      .select("title, handle, product_type, status, readiness_score")
      .eq("store_id", storeId)
      .order("readiness_score", { ascending: true, nullsFirst: true })
      .range(offset, offset + limit - 1),
    db.from("store_products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
  ]);
  if (error || !data) return { products: [], total: count || 0 };
  return { products: data, total: count || 0 };
}

// One completed scan of the whole catalog -> one store_readiness_scores
// row, so a store's score can be tracked over time (constraint: a
// separate, Phase-2-only history table — never ai_observations).
export async function saveReadinessScan(storeId, storeScore) {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db
    .from("store_readiness_scores")
    .insert({
      store_id: storeId,
      overall_score: storeScore.overall ?? 0,
      discoverable_score: storeScore.discoverable,
      readable_score: storeScore.readable,
      transactable_score: storeScore.transactable,
      product_count: storeScore.productCount,
      ready_count: storeScore.readyCount,
      needs_work_count: storeScore.needsWorkCount,
      blocked_count: storeScore.blockedCount,
      issues: storeScore.issues,
    })
    .select("id, computed_at")
    .single();
  if (error) {
    console.error("[commerce] saveReadinessScan failed", error.message);
    return null;
  }
  return data;
}

export async function getLatestReadinessScan(storeId) {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db
    .from("store_readiness_scores")
    .select("*")
    .eq("store_id", storeId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// Historical trend (Phase 2's own, separate from Phase 1.5's
// ai_observations-backed brand_visibility_trend) — one point per completed
// scan, oldest first. The dashboard only shows a trend once there are >= 2
// scans; a single scan isn't a trend (same convention as
// VisibilityHistoryCard.js).
export async function getReadinessHistory(storeId, limit = 24) {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db
    .from("store_readiness_scores")
    .select("computed_at, overall_score, ready_count, needs_work_count, blocked_count, product_count")
    .eq("store_id", storeId)
    .order("computed_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data;
}

// Convenience: normalize -> score -> persist a scan in one call, used by
// app/api/shopify/sync/route.js once a full catalog pass completes.
export async function rescoreAndSaveStore(storeId) {
  const products = await getNormalizedProducts(storeId);
  const storeScore = scoreStore(products);
  const saved = await saveReadinessScan(storeId, storeScore);
  return { storeScore, saved };
}
