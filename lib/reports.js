import { supabase } from "./supabaseClient";
import { normalizeDomain } from "./scoring";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip latin accents; non-latin scripts (Arabic/Devanagari) pass through untouched
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Persists exactly the shape components/test/report/ReportView.js already
// renders from (see app/api/test/route.js's response) minus queries/
// liveRuns/rateLimit, which nothing downstream reads — "compact JSON only."
// Best-effort: a merchant's test must never fail because persistence did.
// Returns the slug on success, null if Supabase isn't configured or the
// insert failed (client just won't get a share link this time).
export async function saveReport({ market, categoryId, categoryName, brand, brandWebsite, reportData }) {
  const db = supabase();
  if (!db) return null;
  const slug = `${slugify(brand) || "brand"}-${slugify(categoryName) || "category"}-${crypto.randomUUID().split("-")[0]}`;
  try {
    const { error } = await db.from("reports").insert({
      slug,
      market,
      category_id: categoryId || null,
      brand,
      brand_domain: normalizeDomain(brandWebsite) || null,
      report_json: reportData,
      // Explicit, separate display-name/slug fields (supabase/migrations/
      // 0004) — brand/category_id above already ARE the display name and
      // slug respectively, this just makes that unambiguous for anything
      // (scripts/audit_brand_matches.py, future querying) that shouldn't
      // have to know that history to read the right column.
      brand_display_name: brand,
      brand_slug: slugify(brand) || null,
      category_display_name: categoryName || null,
      category_slug: categoryId || slugify(categoryName) || null,
    });
    if (error) {
      console.error("[reports] save failed", error.message);
      return null;
    }
    return slug;
  } catch (e) {
    console.error("[reports] save failed", e?.message || e);
    return null;
  }
}

export async function getReportBySlug(slug) {
  const db = supabase();
  if (!db || !slug) return null;
  try {
    const { data, error } = await db.from("reports").select("*").eq("slug", slug).single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
