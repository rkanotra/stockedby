import { supabase } from "./supabaseClient";

// Self-improvement infrastructure (supabase/migrations/0003): a best-effort
// observability log of real failures worth knowing about — never throws,
// never blocks the caller, same "returns null / no-ops when not configured"
// pattern as the rest of this app's optional infra (hard rule 1). Feeds
// scripts/founder_digest.py's "system-event patterns" section.
export async function logSystemEvent(eventType, source, context = {}) {
  const db = supabase();
  if (!db) return;
  try {
    const { error } = await db.from("system_events").insert({ event_type: eventType, source, context });
    if (error) console.error("[system_events] insert failed", error.message);
  } catch (e) {
    console.error("[system_events] insert failed", e?.message || e);
  }
}
