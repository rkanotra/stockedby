import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { teamDemo } from './demo.js';
const ids={owner:'11111111-1111-4111-8111-111111111111',editor:'22222222-2222-4222-8222-222222222222',reviewer:'33333333-3333-4333-8333-333333333333',outsider:'44444444-4444-4444-8444-444444444444',viewer:'55555555-5555-4555-8555-555555555555'};
test('Postgres enforces isolation, roles, invitations, version locks and atomic approval',async t=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    for(const [name,id] of Object.entries(ids)) await db.query('insert into auth.users values($1,$2,now())',[id,`${name}@example.com`]);
    await db.exec(await readFile(new URL('../../supabase/migrations/202610170001_team_workspaces.sql',import.meta.url),'utf8'));
    const as=async name=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[name]]);await db.exec('set role authenticated');};
    const rpc=async(action,args)=> (await db.query('select public.team_command($1,$2::jsonb) result',[action,JSON.stringify(args)])).rows[0].result;
    await as('owner');
    const wid=(await rpc('create_workspace',{name:'Test team'})).id;
    const doc=teamDemo().projects[0].document;
    const pid=(await rpc('create_project',{workspaceId:wid,document:doc})).id;
    await t.test('living product plan persists with the private initiative document',async()=>{
      const saved=(await db.query('select document from team_projects where id=$1',[pid])).rows[0].document;
      assert.deepEqual(saved.productPlan,doc.productPlan);
      assert.ok(saved.productPlan.sections.rollout.fields.rollback);
    });
    await t.test('outsiders cannot read private tables or mutate a workspace',async()=>{
      await as('outsider'); assert.equal((await db.query('select * from team_projects')).rows.length,0);
      await assert.rejects(rpc('save_project',{workspaceId:wid,projectId:pid,version:1,document:doc}),/membership/);
      await assert.rejects(db.query('insert into team_members(workspace_id,user_id,email,role) values($1,$2,$3,$4)',[wid,ids.outsider,'outsider@example.com','owner']),/permission/);
    });
    await t.test('invitations are bound to verified email, expire, and are single use',async()=>{
      await as('owner');
      const invite=await rpc('invite',{workspaceId:wid,email:'editor@example.com',role:'editor'});
      await as('outsider'); await assert.rejects(rpc('accept_invite',{token:invite.token}),/email address/);
      await as('editor'); await rpc('accept_invite',{token:invite.token});
      await assert.rejects(rpc('accept_invite',{token:invite.token}),/used or expired/);
      await assert.rejects(db.query('select token_hash from team_invites'),/permission/);
      await as('owner');
      for(const name of ['reviewer','viewer']) {const i=await rpc('invite',{workspaceId:wid,email:`${name}@example.com`,role:name});await as(name);await rpc('accept_invite',{token:i.token});await as('owner');}
      const expired=await rpc('invite',{workspaceId:wid,email:'outsider@example.com',role:'viewer'});
      await db.exec("reset role; update team_invites set expires_at=now()-interval '1 day' where accepted_at is null");
      await as('outsider'); await assert.rejects(rpc('accept_invite',{token:expired.token}),/expired/);
    });
    await t.test('viewers cannot save, comment, generate or approve',async()=>{
      await as('viewer');
      for(const action of ['save_project','comment','reserve_ai','decide']) await assert.rejects(rpc(action,{workspaceId:wid,projectId:pid,version:1,document:doc,body:'No write access'}),/permission/);
    });
    await t.test('two writers cannot overwrite the same base version',async()=>{
      await as('editor'); await assert.rejects(rpc('save_project',{workspaceId:wid,projectId:pid,document:doc}),/conflict/); await rpc('save_project',{workspaceId:wid,projectId:pid,version:1,document:doc});
      await as('owner'); await assert.rejects(rpc('save_project',{workspaceId:wid,projectId:pid,version:1,document:doc}),/conflict/);
    });
    let cid;
    const proposal=teamDemo().changes[0].proposal;
    // IDs in demoProject are generated per call, so use a proposal for this exact document.
    proposal.patches[0].before=doc.nodes[Number(proposal.patches[0].path[1])].artifact.summary;
    await t.test('a proposer cannot approve their own change',async()=>{
      await as('owner'); cid=(await rpc('propose',{workspaceId:wid,projectId:pid,version:2,request:'Improve invitation failure handling',proposal})).id;
      await assert.rejects(rpc('decide',{workspaceId:wid,changeId:cid,decision:'applied'}),/author cannot/);
    });
    await t.test('reviewer applies only the stored changes and records identity atomically',async()=>{
      await as('reviewer');await rpc('decide',{workspaceId:wid,changeId:cid,decision:'applied',note:'Reviewed recovery path'});
      const p=(await db.query('select * from team_projects where id=$1',[pid])).rows[0];assert.equal(p.version,3);
      const c=(await db.query('select * from team_changes where id=$1',[cid])).rows[0];assert.equal(c.decided_by,ids.reviewer);assert.equal(c.status,'applied');
      assert.deepEqual(p.document.sources,doc.sources);
      await assert.rejects(rpc('decide',{workspaceId:wid,changeId:cid,decision:'applied'}),/no longer pending/);
    });
    await t.test('a stale review cannot overwrite newer work',async()=>{
      await as('editor');const c=(await rpc('propose',{workspaceId:wid,projectId:pid,version:3,request:'Improve invitation failure handling',proposal})).id;
      await rpc('save_project',{workspaceId:wid,projectId:pid,version:3,document:doc});await as('reviewer');
      await assert.rejects(rpc('decide',{workspaceId:wid,changeId:c,decision:'applied'}),/changed since/);
      assert.equal((await db.query('select version from team_projects where id=$1',[pid])).rows[0].version,4);
    });
    await t.test('malicious patch paths cannot alter source evidence or owner metadata',async()=>{
      await as('editor');const bad={...proposal,patches:[{path:['created_by'],before:'x',after:'y'}]};
      const c=(await rpc('propose',{workspaceId:wid,projectId:pid,version:4,request:'A malicious change request',proposal:bad})).id;await as('reviewer');
      await assert.rejects(rpc('decide',{workspaceId:wid,changeId:c,decision:'applied'}),/Unsupported/);
      assert.equal((await db.query('select version from team_projects where id=$1',[pid])).rows[0].version,4);
    });
    await t.test('AI usage quota persists in the database',async()=>{
      await as('editor');for(let i=0;i<50;i++) await rpc('reserve_ai',{workspaceId:wid});await assert.rejects(rpc('reserve_ai',{workspaceId:wid}),/50 AI reviews/);
    });
    await t.test('removing access immediately hides workspace data',async()=>{
      await as('owner');await rpc('remove_member',{workspaceId:wid,userId:ids.editor});await as('editor');assert.equal((await db.query('select * from team_projects')).rows.length,0);
    });
  } finally {await db.close();}
});
