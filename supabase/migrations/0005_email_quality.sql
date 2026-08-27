-- StockedBy email-quality fix pass (spec items 12/13). Run this once in
-- Supabase's SQL editor. Idempotent: safe to re-run. Not yet applied to
-- the live project — same manual step as every prior migration here.

-- 1. Free-provider flag (item 12): gmail.com etc are never blocked — most
-- D2C founders in our markets run their business off gmail.com — this
-- column just segments them for later analysis. Computed client-side
-- (lib/emailValidation.js's isFreeProvider, same list used for the check)
-- and sent as part of the /api/lead request body.
alter table leads add column if not exists is_free_provider boolean;

-- 2. Bounce/complaint tracking (item 13) — our real verification layer,
-- since we deliberately don't do OTP/email-verification codes (that step
-- costs more leads than it saves at current volume — see CLAUDE.md/the
-- spec's explicit note). Populated by Resend's bounce/complaint webhook
-- (app/api/webhooks/resend/route.js), matched back to a lead by email.
alter table leads add column if not exists email_status text not null default 'sent'
  check (email_status in ('sent', 'delivered', 'bounced', 'complained'));
alter table leads add column if not exists email_status_updated_at timestamptz;

create index if not exists leads_email_idx on leads (email);
create index if not exists leads_email_status_idx on leads (email_status, created_at desc);
