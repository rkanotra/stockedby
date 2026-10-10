import test from "node:test";
import assert from "node:assert/strict";
import { supabase } from "./supabaseClient.js";

test("side-project mode never creates a Supabase client", () => {
  const beforeUrl = process.env.SUPABASE_URL;
  const beforeKey = process.env.SUPABASE_SERVICE_KEY;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "stale-key-that-must-never-be-used";
  try {
    assert.equal(supabase(), null);
  } finally {
    if (beforeUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = beforeUrl;
    if (beforeKey === undefined) delete process.env.SUPABASE_SERVICE_KEY;
    else process.env.SUPABASE_SERVICE_KEY = beforeKey;
  }
});
