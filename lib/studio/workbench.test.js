import test from "node:test";
import assert from "node:assert/strict";
import {
  samplePrototype,
  validatePrototype,
  prototypeArtifact,
} from "./prototype.js";
import { prototypeHtml, screenSvg } from "./prototypeRuntime.js";
import { demoProject } from "./demo.js";
import {
  newProject,
  updateArtifact,
  parseProjectFile,
  approvalProblems,
} from "./model.js";
import {
  reviewQueue,
  checkpoint,
  restoreVersion,
  compareArtifacts,
  saveDecision,
} from "./review.js";
import { seal, unseal, startOAuth, providerFetch } from "./oauth.js";
import { connectorAction } from "./connectorActions.js";
import {
  figmaReference,
  figmaFrames,
  toAdf,
  adfText,
  exportCandidates,
} from "./connectors.js";
const secret = "test-only-connector-secret-at-least-32-characters";
process.env.STUDIO_CONNECTOR_SECRET = secret;
test("prototype supports valid navigation and removes invented requirement links", () => {
  const p = samplePrototype();
  validatePrototype(p, new Set(["REQ-001"]));
  assert.deepEqual(p.screens[2].requirementIds, []);
  p.screens[0].actions.push({
    id: "bad",
    label: "Bad",
    kind: "navigate",
    targetScreenId: "missing",
    collection: "",
    recordId: "",
    field: "",
    value: "",
    message: "",
  });
  assert.throws(() => validatePrototype(p), /broken action/);
});
test("prototype rejects executable data and unsafe property keys", () => {
  const p = samplePrototype();
  p.screens[1].sections[0].fields[0].id = "__proto__";
  assert.throws(() => validatePrototype(p), /field/);
  assert.throws(() => validatePrototype({ ...samplePrototype(), name: {} }));
});
test("HTML export escapes script-breaking payloads and disables network", () => {
  const p = samplePrototype();
  p.name = "</script><script>alert(1)</script>";
  const html = prototypeHtml(p);
  assert.ok(!html.includes(p.name));
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /\\u003c\/script>/);
  const svg = screenSvg(p, "overview");
  assert.ok(!svg.includes("<script>"));
  assert.match(svg, /&lt;script&gt;/);
});
test("regeneration snapshots prior version and invalidates downstream review", () => {
  const p = demoProject(),
    n = p.nodes[1];
  p.nodes[3].artifact.status = "approved";
  const next = updateArtifact(p, n.id, {
    ...n.artifact,
    content: "New narrative",
  });
  assert.equal(next.versions.length, 1);
  assert.equal(next.versions[0].artifact.content, n.artifact.content);
  assert.equal(next.nodes[3].artifact.status, "stale");
  assert.equal(next.nodes[3].artifact.approval, null);
});
test("restore retains a before-restore snapshot and cannot inherit approval", () => {
  let p = demoProject();
  p = checkpoint(p, p.nodes[1].id);
  const v = p.versions[0];
  p.nodes[1].artifact.content = "New content";
  const restored = restoreVersion(p, v.id);
  assert.equal(restored.nodes[1].artifact.content, v.artifact.content);
  assert.equal(restored.nodes[1].artifact.status, "stale");
  assert.equal(restored.versions[0].artifact.content, "New content");
});
test("accepted decisions invalidate outputs; deferred decisions do not", () => {
  const p = demoProject(),
    d = {
      title: "Release scope",
      decision: "Include the invitation flow",
      owner: "PM",
    };
  assert.ok(
    saveDecision(p, d).nodes.every((n) => n.artifact.status === "stale"),
  );
  assert.ok(
    saveDecision(p, { ...d, status: "deferred" }).nodes.every(
      (n) => n.artifact.status === "draft",
    ),
  );
  assert.throws(() => saveDecision(p, { ...d, status: "fake" }));
});
test("review queue distinguishes questions, actual coverage gaps and stale context", () => {
  const p = demoProject();
  assert.ok(reviewQueue(p).some((q) => q.severity === "decision"));
  p.nodes = p.nodes.filter((n) => n.type !== "tests");
  assert.ok(reviewQueue(p).some((q) => q.category === "Test coverage gap"));
});
test("comparison detects changed acceptance criteria and removed requirements", () => {
  const a = {
      content: "same",
      items: [{ id: "R1", acceptanceCriteria: ["old"] }, { id: "R2" }],
    },
    b = {
      content: "same",
      items: [{ id: "R1", acceptanceCriteria: ["new"] }, { id: "R3" }],
    };
  const d = compareArtifacts(a, b);
  assert.equal(d.changed.length, 1);
  assert.equal(d.added[0].id, "R3");
  assert.equal(d.removed[0].id, "R2");
});
test("project backups validate prototypes and discard imported approval assertions", () => {
  const p = demoProject();
  p.versions = [{ artifact: { bad: true } }];
  p.deliveries = [{ url: "javascript:alert(1)" }];
  const restored = parseProjectFile(
    JSON.stringify({ format: "stockedby-studio", version: 1, project: p }),
  );
  assert.deepEqual(restored.versions, []);
  assert.deepEqual(restored.deliveries, []);
  assert.ok(restored.nodes.every((n) => n.artifact.status === "stale"));
  p.nodes.find((n) => n.type === "prototype").artifact.prototype.startScreenId =
    "missing";
  assert.throws(() =>
    parseProjectFile(
      JSON.stringify({ format: "stockedby-studio", version: 1, project: p }),
    ),
  );
});
test("encrypted sessions reject tampering, wrong keys and expiry", () => {
  const value = {
      provider: "jira",
      accessToken: "test-token",
      exp: Date.now() + 50000,
    },
    sealed = seal(value, secret);
  assert.ok(!sealed.includes("test-token"));
  assert.deepEqual(unseal(sealed, secret), value);
  assert.equal(unseal(sealed.slice(0, -4) + "AAAA", secret), null);
  assert.equal(unseal(sealed, "wrong-key"), null);
  assert.equal(unseal(seal({ ...value, exp: 0 }, secret), secret), null);
});
test("OAuth includes state and Figma PKCE without exposing client secret", () => {
  process.env.FIGMA_CLIENT_ID = "test-id";
  process.env.FIGMA_CLIENT_SECRET = "never-in-url";
  const a = startOAuth("figma"),
    b = startOAuth("figma");
  assert.notEqual(a.state.state, b.state.state);
  assert.equal(
    new URL(a.url).searchParams.get("code_challenge_method"),
    "S256",
  );
  assert.ok(!a.url.includes("never-in-url"));
});
test("Figma parsing rejects other origins and imports frame text", () => {
  assert.throws(() =>
    figmaReference("https://figma.com.evil.test/design/abcdefgh"),
  );
  assert.throws(() => figmaReference("http://localhost/design/abcdefgh"));
  assert.equal(
    figmaReference("https://www.figma.com/design/abcdefgh/title?node-id=12-34")
      .node,
    "12:34",
  );
  const frames = figmaFrames(
    {
      document: {
        type: "CANVAS",
        name: "Product",
        children: [
          {
            id: "1:2",
            type: "FRAME",
            name: "Login",
            children: [{ characters: "Email" }],
          },
        ],
      },
    },
    "abcdefgh",
  );
  assert.equal(frames[0].text, "Email");
  assert.equal(frames[0].page, "Product");
});
test("Atlassian document conversion preserves plain text and does not execute markup", () => {
  assert.equal(
    adfText(toAdf("<script>hello</script>\nAcceptance")),
    "<script>hello</script>\nAcceptance",
  );
});
test("connector fetch rejects arbitrary network destinations", async () => {
  await assert.rejects(providerFetch("http://127.0.0.1", "x"), /Unsupported/);
  await assert.rejects(providerFetch("https://evil.test", "x"), /Unsupported/);
});
const session = {
  provider: "jira",
  accessToken: "test-access",
  exp: Date.now() + 60000,
};
const input = {
  provider: "jira",
  action: "prepare",
  cloudId: "cloud-123",
  projectKey: "PM",
  issueType: "10001",
  projectId: "project-1",
  nodeId: "node-1",
  itemId: "STORY-1",
  summary: "Invite team",
  description: "Given a valid email, create an invitation.",
};
function mock({ old, required = false, writeError = false } = {}) {
  const calls = [];
  return {
    calls,
    call: async (url, token, options = {}) => {
      calls.push({ url, options });
      assert.equal(token, session.accessToken);
      if (url.endsWith("accessible-resources"))
        return [
          {
            id: "cloud-123",
            name: "Pilot",
            url: "https://pilot.atlassian.net",
            scopes: ["read:jira-work", "write:jira-work"],
          },
        ];
      if (url.includes("/createmeta/"))
        return {
          fields: [
            { fieldId: "labels", name: "Labels" },
            ...(required
              ? [
                  {
                    fieldId: "customfield_1",
                    name: "Cost centre",
                    required: true,
                  },
                ]
              : []),
          ],
        };
      if (url.endsWith("/search/jql")) return { issues: old ? [old] : [] };
      if (options.method === "POST" || options.method === "PUT") {
        if (writeError) throw Error("timeout");
        return { key: "PM-42" };
      }
      throw Error("Unexpected call");
    },
  };
}
test("Jira preflight detects required custom fields and unauthorized sites", async () => {
  const m = mock({ required: true });
  await assert.rejects(connectorAction(input, session, m.call), /Cost centre/);
  await assert.rejects(
    connectorAction({ ...input, cloudId: "another-site" }, session, m.call),
    /authorized/,
  );
  assert.ok(!m.calls.some((c) => c.url.endsWith("/issue")));
});
test("Jira writes require an intact preview tied to the authorizing session", async () => {
  const m = mock(),
    preview = await connectorAction(input, session, m.call);
  await assert.rejects(
    connectorAction(
      {
        ...input,
        action: "publish",
        plan: { ...preview.plan, summary: "Tampered" },
        proof: preview.proof,
      },
      session,
      m.call,
    ),
    /expired or changed/,
  );
  assert.ok(!m.calls.some((c) => c.url.endsWith("/issue")));
  const result = await connectorAction(
    { ...input, action: "publish", plan: preview.plan, proof: preview.proof },
    session,
    m.call,
  );
  assert.equal(result.key, "PM-42");
  assert.equal(m.calls.filter((c) => c.url.endsWith("/issue")).length, 1);
});
test("Jira detects edits after preview and reconciles a retry without another create", async () => {
  const m = mock(),
    preview = await connectorAction(input, session, m.call);
  const old = {
      key: "PM-42",
      fields: {
        summary: "Existing",
        description: toAdf("Earlier"),
        updated: "2026-10-14T10:00:00Z",
      },
    },
    existing = mock({ old });
  const result = await connectorAction(
    { ...input, action: "publish", plan: preview.plan, proof: preview.proof },
    session,
    existing.call,
  );
  assert.equal(result.reconciled, true);
  assert.ok(
    !existing.calls.some(
      (c) => c.options.method === "PUT" || c.url.endsWith("/issue"),
    ),
  );
  const update = await connectorAction(input, session, existing.call);
  old.fields.updated = "2026-10-14T11:00:00Z";
  await assert.rejects(
    connectorAction(
      { ...input, action: "publish", plan: update.plan, proof: update.proof },
      session,
      existing.call,
    ),
    /changed in Jira/,
  );
});
test("Jira candidates exclude unreviewed and stale work", () => {
  const p = demoProject();
  assert.ok(exportCandidates(p).every((c) => !c.eligible));
  p.nodes.find((n) => n.type === "stories").artifact.status = "approved";
  assert.ok(exportCandidates(p).some((c) => c.eligible));
});
