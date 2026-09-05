import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

// Admin-only founder data-quality diagnostic (Phase 1.5 point 12) — a thin
// JSON wrapper around supabase/migrations/0009_ai_observations_hardening
// .sql's `ai_observations_diagnostic` view, which is just as queryable
// directly in Supabase's SQL editor:
//   select * from ai_observations_diagnostic;
// No UI is needed for this (per the Phase 1.5 brief) — this route or that
// raw query IS the diagnostic.
//
//   curl "$SITE/api/admin/observations-diagnostic" -H "x-admin-token: $ADMIN_TOKEN"
export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 501 });

  const { data, error } = await db.from("ai_observations_diagnostic").select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
