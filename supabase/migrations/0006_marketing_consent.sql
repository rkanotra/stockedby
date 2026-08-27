-- StockedBy founder-first redesign: separates the required DPDP (India) /
-- PDPL (UAE, KSA) data-processing consent (unchanged, still required —
-- consent_at already records it) from an optional "send me occasional
-- updates" checkbox that used to be bundled into the same required
-- checkbox on both the report gate (LeadGate.js) and the fix gate
-- (FixLeadGate.js). Run once in Supabase's SQL editor. Idempotent: safe
-- to re-run. Not yet applied to the live project, same manual step as
-- every prior migration here.

alter table leads add column if not exists marketing_opt_in boolean not null default false;
