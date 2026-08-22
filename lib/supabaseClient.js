import { createClient } from "@supabase/supabase-js";

// Server-only (hard rule 1 — SUPABASE_URL/SUPABASE_SERVICE_KEY never reach
// client code). The service-role key bypasses RLS entirely, matching the
// "server writes, RLS blocks everyone else" posture in
// supabase/migrations/0001_phase4_schema.sql.
//
// Every caller (lib/snapshotCache.js, lib/reports.js, app/api/lead,
// app/api/generate-queries) treats a null return as "Supabase isn't
// configured" and degrades gracefully — same optional-dependency pattern
// already used for GEMINI_API_KEY/OPENAI_API_KEY (lib/harvestClients.js):
// Phase 4 features quietly no-op rather than breaking the free test.
let _client = null;
let _attempted = false;

export function supabase() {
  if (_attempted) return _client;
  _attempted = true;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}
