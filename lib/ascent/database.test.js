import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  outsider = "33333333-3333-4333-8333-333333333333";
test("Ascent database isolates private content and controls processing, quotas and deletion", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`,
    );
    await db.query(
      "insert into auth.users values($1,$2,now()),($3,$4,now()),($5,$6,now())",
      [
        owner,
        "rahulkanotra1101@gmail.com",
        other,
        "second@example.com",
        outsider,
        "outsider@example.com",
      ],
    );
    await db.exec(
      await readFile(
        new URL(
          "../../supabase/migrations/202610170002_ascent.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(await readFile(new URL("../../supabase/migrations/202610180001_ascent_owner_only.sql", import.meta.url), "utf8"));
    await db.query("insert into ascent_members(user_id) values($1)", [other]);
    const as = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const rpc = async (action, args) =>
      (
        await db.query("select ascent_action($1,$2::jsonb) result", [
          action,
          JSON.stringify(args),
        ])
      ).rows[0].result;
    const item = {
      id: crypto.randomUUID(),
      kind: "scenario",
      title: "Deadline",
      prompt: "A realistic executive scenario",
      answer:
        "I will validate dependencies and return with a responsible plan.",
      audience: "CBO",
      target_seconds: 90,
      rubric_version: "test",
      context: {},
    };
    await as(owner);
    await rpc("create", item);
    await t.test(
      "unauthorised accounts cannot read or create private sessions",
      async () => {
        await as(outsider);
        assert.equal(
          (await db.query("select * from ascent_sessions")).rows.length,
          0,
        );
        await assert.rejects(
          rpc("create", { ...item, id: crypto.randomUUID() }),
          /Private studio/,
        );
        await assert.rejects(
          db.query("insert into ascent_members(user_id) values($1)", [
            outsider,
          ]),
          /permission/,
        );
      },
    );
    await t.test(
      "even a separately enabled member is rejected by the owner-only policy",
      async () => {
        await as(other);
        assert.equal(
          (await db.query("select * from ascent_sessions")).rows.length,
          0,
        );
        await assert.rejects(
          rpc("notes", { id: item.id, notes: [] }),
          /Private studio/,
        );
        await assert.rejects(
          rpc("create", {
            ...item,
            id: crypto.randomUUID(),
            parent_id: item.id,
          }),
          /Private studio/,
        );
      },
    );
    await t.test("owner email must remain verified for database access", async () => {
      await db.exec("reset role");
      await db.query("update auth.users set email_confirmed_at=null where id=$1",[owner]);
      await as(owner);
      assert.equal((await db.query("select public.ascent_allowed() allowed")).rows[0].allowed,false);
      assert.equal((await db.query("select * from ascent_sessions")).rows.length,0);
      await db.exec("reset role");
      await db.query("update auth.users set email_confirmed_at=now() where id=$1",[owner]);
      await as(owner);
    });
    let claimed;
    await t.test(
      "duplicate submission is idempotent and one active worker holds the lease",
      async () => {
        await as(owner);
        const again = await rpc("create", item);
        assert.equal(again.id, item.id);
        claimed = await rpc("claim", { id: item.id });
        assert.equal(claimed.attempts, 1);
        assert.equal(await rpc("claim", { id: item.id }), null);
        assert.equal(
          await rpc("job", {
            id: item.id,
            token: crypto.randomUUID(),
            status: "ready",
          }),
          null,
        );
      },
    );
    await t.test(
      "notes and completed review persist, with no direct client writes",
      async () => {
        await as(owner);
        await rpc("job", {
          id: item.id,
          token: claimed.lease_token,
          status: "ready",
          review: { overallScore: 7 },
        });
        await rpc("notes", {
          id: item.id,
          notes: [{ text: "One next action", seconds: 18 }],
        });
        const row = (
          await db.query("select * from ascent_sessions where id=$1", [item.id])
        ).rows[0];
        assert.equal(row.review.overallScore, 7);
        assert.equal(row.notes[0].seconds, 18);
        await assert.rejects(
          db.query("update ascent_sessions set status='ready' where id=$1", [
            item.id,
          ]),
          /permission/,
        );
      },
    );
    await t.test(
      "expired jobs can retry but stale workers cannot overwrite the new result",
      async () => {
        await as(owner);
        const x = { ...item, id: crypto.randomUUID() };
        await rpc("create", x);
        const first = await rpc("claim", { id: x.id });
        await db.exec("reset role");
        await db.query(
          "update ascent_sessions set lease_until=now()-interval '1 second' where id=$1",
          [x.id],
        );
        await as(owner);
        const second = await rpc("claim", { id: x.id });
        assert.notEqual(first.lease_token, second.lease_token);
        assert.equal(
          await rpc("job", {
            id: x.id,
            token: first.lease_token,
            status: "ready",
          }),
          null,
        );
        await rpc("job", {
          id: x.id,
          token: second.lease_token,
          status: "ready",
        });
      },
    );
    await t.test(
      "private storage paths require the matching owner and pending upload",
      async () => {
        await as(owner);
        const media = await rpc("create", {
          ...item,
          id: crypto.randomUUID(),
          kind: "recording",
          answer: "",
          extension: "m4a",
          mime: "audio/mp4",
          bytes: 1000,
          sha256: "a".repeat(64),
        });
        await db.query(
          "insert into storage.objects(bucket_id,name) values('ascent-private',$1)",
          [media.media_path],
        );
        await as(other);
        assert.equal(
          (await db.query("select * from storage.objects")).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values('ascent-private',$1)",
            [media.media_path],
          ),
          /row-level security/,
        );
        await as(owner);
        await rpc("uploaded", { id: media.id });
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values('ascent-private',$1)",
            [media.media_path],
          ),
          /row-level security/,
        );
        await rpc("delete", { id: media.id });
        await db.query("delete from storage.objects where name=$1", [
          media.media_path,
        ]);
        await rpc("purge", { id: media.id });
        assert.equal(
          (
            await db.query("select * from ascent_sessions where id=$1", [
              media.id,
            ])
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "roadmap updates reject stale versions, check-ins can be removed",
      async () => {
        await as(owner);
        await rpc("settings", { version: 0, roadmap: [] });
        await assert.rejects(
          rpc("settings", { version: 0, roadmap: [] }),
          /another device/,
        );
        await rpc("checkin", {
          day: new Date().toISOString().slice(0, 10),
          habits: [0],
          reflection: "A thoughtful day.",
        });
        await rpc("delete_checkin", {
          day: new Date().toISOString().slice(0, 10),
        });
        assert.equal(
          (await db.query("select * from ascent_checkins")).rows.length,
          0,
        );
      },
    );
    await t.test(
      "AI usage survives separate requests and cannot exceed the daily cap",
      async () => {
        await db.exec("reset role");
        await db.query("update ascent_usage set reviews=30 where user_id=$1", [
          owner,
        ]);
        await as(owner);
        const next = { ...item, id: crypto.randomUUID() };
        await rpc("create", next);
        await assert.rejects(rpc("claim", { id: next.id }), /Daily limit/);
      },
    );
  } finally {
    await db.close();
  }
});
