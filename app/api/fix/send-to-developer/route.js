import { NextResponse } from "next/server";
import { sendDeveloperFixEmail } from "@/lib/email";
import { logSystemEvent } from "@/lib/systemEvents";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// "Send this to my developer" (spec item 6) — a follow-up action after the
// merchant has already unlocked the full fix via FixLeadGate (so we already
// have their own email; this just adds a second, separate address). The
// client sends its already-generated products/llmsTxt straight from memory
// (same pattern LeadGate.js uses for report data) — this route never
// re-fetches or re-generates anything, it only builds and sends the email.
// Rate-limited per domain per IP (mirrors /api/fix's own composite key) so
// this can't become a spam-relay vector.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const domain = typeof body?.domain === "string" ? body.domain.trim() : "";
  const developerEmail = typeof body?.developerEmail === "string" ? body.developerEmail.trim() : "";
  const merchantEmail = typeof body?.merchantEmail === "string" ? body.merchantEmail.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform : "custom";
  const products = Array.isArray(body?.products) ? body.products : [];
  const llmsTxt = typeof body?.llmsTxt === "string" ? body.llmsTxt : "";

  if (!domain) return badRequest('"domain" is required.');
  if (!developerEmail || !EMAIL_RE.test(developerEmail)) {
    return badRequest("A valid developer email is required.");
  }

  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(`${ip}:${domain}`, { namespace: "fix-dev-send", limit: 5 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many sends for this website today. Try again tomorrow." },
      { status: 429 }
    );
  }

  const result = await sendDeveloperFixEmail({ developerEmail, merchantEmail, domain, platform, products, llmsTxt });

  // Log BOTH addresses (spec item 6: "separate from their own captured
  // email; log both") — reuses the existing system_events audit trail
  // rather than a new Supabase column/migration.
  await logSystemEvent("fix_dev_send", "fix", { domain, merchantEmail, developerEmail, sent: result.sent });

  return NextResponse.json({ ok: true, sent: result.sent });
}
